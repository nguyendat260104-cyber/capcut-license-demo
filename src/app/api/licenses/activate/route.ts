import { activateLicense, jsonError, LicenseRequest, validInput } from "@/lib/license";

export async function POST(request: Request) {
  try {
    const input: LicenseRequest = await request.json();
    if (!validInput(input)) return Response.json({ error: "Thiếu key hoặc thông tin thiết bị." }, { status: 400 });
    const result = await activateLicense(input);
    return Response.json({
      activated: true,
      reused: result.reused,
      activationId: result.activation.id,
      deviceName: result.activation.device_name,
      token: result.token,
    });
  } catch (error) { return jsonError(error); }
}
