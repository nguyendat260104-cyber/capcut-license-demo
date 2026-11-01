import { jsonError, validateDevice } from "@/lib/license";

export async function POST(request: Request) {
  try {
    const { licenseKey, deviceFingerprint } = await request.json();
    if (!licenseKey || !deviceFingerprint) return Response.json({ error: "Thiếu key hoặc mã máy." }, { status: 400 });
    const row = await validateDevice(licenseKey, deviceFingerprint);
    return Response.json({ valid: true, licenseId: row.licenseId, activationId: row.activationId });
  } catch (error) { return jsonError(error); }
}
