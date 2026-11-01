import { readFile } from "node:fs/promises";
import path from "node:path";
import { jsonError, validateDevice } from "@/lib/license";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { licenseKey, deviceFingerprint } = await request.json();
    if (!licenseKey || !deviceFingerprint) return Response.json({ error: "Thiếu key hoặc mã máy." }, { status: 400 });
    await validateDevice(licenseKey, deviceFingerprint);
    const archive = await readFile(path.join(process.cwd(), "packages", "capcut-demo-preset.zip"));
    return new Response(archive, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": "attachment; filename=capcut-demo-preset.zip",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) { return jsonError(error); }
}
