import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readRecord, writeRecord } from "./store";

export type LicenseRequest = { licenseKey?: string; deviceFingerprint?: string; deviceName?: string; platform?: string };
export type LicenseRecord = {
  id: string; customerName: string; email: string; keyHash: string; keyLast4: string;
  status: "active" | "disabled"; maxDevices: number; createdAt: string;
};
export type ActivationRecord = {
  id: string; licenseId: string; deviceHash: string; deviceName: string; platform: string;
  activatedAt: string; lastSeenAt: string;
};

export const normalizeKey = (key: string) => key.trim().toUpperCase();
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const keyPath = (keyHash: string) => `licenses/by-key/${keyHash}.json`;
export const emailPath = (emailHash: string) => `licenses/by-email/${emailHash}.json`;
export const activationPath = (licenseId: string) => `activations/${licenseId}.json`;

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
  return readRecord<LicenseRecord>(keyPath(sha256(normalizeKey(rawKey))));
}

export async function activateLicense(input: Required<LicenseRequest>) {
  const license = await findLicense(input.licenseKey);
  if (!license || license.status !== "active") throw new LicenseError("License không hợp lệ hoặc đã bị khóa.", 404);
  const path = activationPath(license.id);
  const deviceHash = sha256(input.deviceFingerprint.trim());
  const existing = await readRecord<ActivationRecord>(path);

  if (existing && existing.deviceHash !== deviceHash) {
    throw new LicenseError("Key đã được kích hoạt trên thiết bị khác. Hãy gỡ thiết bị cũ trước.", 409);
  }

  const now = new Date().toISOString();
  const activation: ActivationRecord = existing
    ? { ...existing, deviceName: input.deviceName, lastSeenAt: now }
    : { id: randomUUID(), licenseId: license.id, deviceHash, deviceName: input.deviceName,
        platform: input.platform, activatedAt: now, lastSeenAt: now };
  await writeRecord(path, activation);
  return { license, activation, token: signActivation(license.id, deviceHash), reused: Boolean(existing) };
}

export async function validateDevice(rawKey: string, fingerprint: string) {
  const license = await findLicense(rawKey);
  if (!license || license.status !== "active") throw new LicenseError("License không hợp lệ hoặc đã bị khóa.", 404);
  const path = activationPath(license.id);
  const activation = await readRecord<ActivationRecord>(path);
  if (!activation || activation.deviceHash !== sha256(fingerprint.trim())) {
    throw new LicenseError("Thiết bị chưa được kích hoạt cho key này.", 403);
  }
  activation.lastSeenAt = new Date().toISOString();
  await writeRecord(path, activation);
  return { licenseId: license.id, activationId: activation.id };
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
