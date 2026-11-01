import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { db, ensureSchema } from "./db";

export type LicenseRequest = { licenseKey?: string; deviceFingerprint?: string; deviceName?: string; platform?: string };

export const normalizeKey = (key: string) => key.trim().toUpperCase();
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function createLicenseKey() {
  const raw = randomBytes(9).toString("hex").toUpperCase();
  return `PKEY-${raw.slice(0, 6)}-${raw.slice(6, 12)}-${raw.slice(12, 18)}`;
}

function secret() {
  const value = process.env.LICENSE_SIGNING_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("LICENSE_SIGNING_SECRET chưa được cấu hình.");
  return value || "presetkey-local-development-only";
}

export function signActivation(licenseId: string, deviceHash: string) {
  const payload = Buffer.from(JSON.stringify({ licenseId, deviceHash, exp: Date.now() + 7 * 86400000 })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyActivation(token: string) {
  const [payload, provided] = token.split(".");
  if (!payload || !provided) return false;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  if (provided.length !== expected.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return false;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return data.exp > Date.now() ? data : false;
}

export async function findLicense(rawKey: string) {
  await ensureSchema();
  const sql = db();
  const [license] = await sql`select * from licenses where key_hash = ${sha256(normalizeKey(rawKey))} limit 1`;
  return license;
}

export async function activateLicense(input: Required<LicenseRequest>) {
  await ensureSchema();
  const sql = db();
  const keyHash = sha256(normalizeKey(input.licenseKey));
  const deviceHash = sha256(input.deviceFingerprint.trim());

  return sql.begin(async (tx) => {
    const [license] = await tx`select * from licenses where key_hash = ${keyHash} for update`;
    if (!license || license.status !== "active") throw new LicenseError("License không hợp lệ hoặc đã bị khóa.", 404);

    const [existing] = await tx`select * from activations where license_id = ${license.id} and device_hash = ${deviceHash}`;
    if (existing) {
      await tx`update activations set last_seen_at = now(), device_name = ${input.deviceName} where id = ${existing.id}`;
      return { license, activation: existing, token: signActivation(license.id, deviceHash), reused: true };
    }

    const [{ count }] = await tx`select count(*)::int as count from activations where license_id = ${license.id}`;
    if (count >= license.max_devices) throw new LicenseError("Key đã được kích hoạt trên thiết bị khác. Hãy gỡ thiết bị cũ trước.", 409);

    const id = randomUUID();
    const [activation] = await tx`
      insert into activations (id, license_id, device_hash, device_name, platform)
      values (${id}, ${license.id}, ${deviceHash}, ${input.deviceName}, ${input.platform}) returning *`;
    return { license, activation, token: signActivation(license.id, deviceHash), reused: false };
  });
}

export async function validateDevice(rawKey: string, fingerprint: string) {
  await ensureSchema();
  const sql = db();
  const [row] = await sql`
    select l.id as license_id, l.status, a.id as activation_id
    from licenses l join activations a on a.license_id = l.id
    where l.key_hash = ${sha256(normalizeKey(rawKey))} and a.device_hash = ${sha256(fingerprint.trim())} limit 1`;
  if (!row || row.status !== "active") throw new LicenseError("Thiết bị chưa được kích hoạt cho key này.", 403);
  await sql`update activations set last_seen_at = now() where id = ${row.activation_id}`;
  return row;
}

export class LicenseError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function jsonError(error: unknown) {
  const status = error instanceof LicenseError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Lỗi máy chủ.";
  console.error(error);
  return Response.json({ error: message }, { status });
}

export function validInput(input: LicenseRequest): input is Required<LicenseRequest> {
  return Boolean(input.licenseKey?.trim() && input.deviceFingerprint?.trim() && input.deviceName?.trim() && input.platform?.trim());
}
