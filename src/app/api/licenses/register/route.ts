import { randomUUID } from "node:crypto";
import { createLicenseKey, emailPath, jsonError, keyPath, LicenseRecord, sha256 } from "@/lib/license";
import { readRecord, writeRecord } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (cleanName.length < 2 || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return Response.json({ error: "Họ tên hoặc email chưa hợp lệ." }, { status: 400 });
    }
    const emailHash = sha256(cleanEmail);
    if (await readRecord(emailPath(emailHash))) {
      return Response.json({ error: "Email này đã nhận license demo. Dùng email khác để thử lại." }, { status: 409 });
    }
    const licenseKey = createLicenseKey();
    const keyHash = sha256(licenseKey);
    const license: LicenseRecord = { id: randomUUID(), customerName: cleanName, email: cleanEmail, keyHash,
      keyLast4: licenseKey.slice(-4), status: "active", maxDevices: 1, createdAt: new Date().toISOString() };
    await writeRecord(keyPath(keyHash), license);
    await writeRecord(emailPath(emailHash), { licenseId: license.id, keyLast4: license.keyLast4 });
    return Response.json({ licenseKey, maxDevices: 1 }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
