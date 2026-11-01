import { randomUUID } from "node:crypto";
import { db, ensureSchema } from "@/lib/db";
import { createLicenseKey, jsonError, sha256 } from "@/lib/license";

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (cleanName.length < 2 || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return Response.json({ error: "Họ tên hoặc email chưa hợp lệ." }, { status: 400 });
    }
    await ensureSchema();
    const sql = db();
    const licenseKey = createLicenseKey();
    const rows = await sql`
      insert into licenses (id, customer_name, email, key_hash, key_last4)
      values (${randomUUID()}, ${cleanName}, ${cleanEmail}, ${sha256(licenseKey)}, ${licenseKey.slice(-4)})
      on conflict (email) do nothing returning id`;
    if (!rows.length) {
      return Response.json({ error: "Email này đã nhận license demo. Dùng email khác để thử lại." }, { status: 409 });
    }
    return Response.json({ licenseKey, maxDevices: 1 }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
