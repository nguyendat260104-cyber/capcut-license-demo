import { del, get, put } from "@vercel/blob";

const options = { access: "private" as const };

export async function readRecord<T>(pathname: string): Promise<T | null> {
  try {
    const result = await get(pathname, options);
    if (!result) return null;
    return await new Response(result.stream).json() as T;
  } catch (error) {
    if (error instanceof Error && /not found|404/i.test(error.message)) return null;
    throw error;
  }
}

export async function writeRecord(pathname: string, value: unknown) {
  return put(pathname, JSON.stringify(value), {
    ...options,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function deleteRecord(pathname: string) {
  try { await del(pathname); } catch (error) {
    if (!(error instanceof Error) || !/not found|404/i.test(error.message)) throw error;
  }
}
