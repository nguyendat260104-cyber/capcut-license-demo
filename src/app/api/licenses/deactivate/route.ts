import { db, ensureSchema } from "@/lib/db";
import { jsonError, normalizeKey, sha256 } from "@/lib/license";

export async function POST(request: Request) {
  try {
    const { licenseKey, deviceFingerprint } = await request.json();
    if (!licenseKey || !deviceFingerprint) return Response.json({ error: "Thiếu key hoặc mã máy." }, { status: 400 });
    await ensureSchema();
    const sql = db();
    const rows = await sql`
      delete from activations a using licenses l
      where a.license_id = l.id and l.key_hash = ${sha256(normalizeKey(licenseKey))}
        and a.device_hash = ${sha256(String(deviceFingerprint).trim())}
      returning a.id`;
    if (!rows.length) return Response.json({ error: "Không tìm thấy thiết bị cần gỡ." }, { status: 404 });
    return Response.json({ deactivated: true });
  } catch (error) { return jsonError(error); }
}
