import { activationPath, findLicense, jsonError, sha256 } from "@/lib/license";
import { deleteRecord, readRecord } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { licenseKey, deviceFingerprint } = await request.json();
    if (!licenseKey || !deviceFingerprint) return Response.json({ error: "Thiếu key hoặc mã máy." }, { status: 400 });
    const license = await findLicense(licenseKey);
    if (!license) return Response.json({ error: "License không hợp lệ." }, { status: 404 });
    const path = activationPath(license.id);
    const activation = await readRecord<{ deviceHash: string }>(path);
    if (!activation || activation.deviceHash !== sha256(String(deviceFingerprint).trim())) {
      return Response.json({ error: "Không tìm thấy thiết bị cần gỡ." }, { status: 404 });
    }
    await deleteRecord(path);
    return Response.json({ deactivated: true });
  } catch (error) { return jsonError(error); }
}
