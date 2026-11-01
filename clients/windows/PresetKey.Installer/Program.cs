using System.IO.Compression;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Win32;

Console.OutputEncoding = Encoding.UTF8;
Console.Title = "PresetKey — Cài preset CapCut";

var apiBase = Environment.GetEnvironmentVariable("PRESETKEY_API_URL")?.TrimEnd('/')
    ?? "https://REPLACE-WITH-YOUR-VERCEL-DOMAIN.vercel.app";

Console.WriteLine("PRESETKEY · CÀI PRESET CAPCUT CHO WINDOWS\n");
if (apiBase.Contains("REPLACE-WITH")) Fail("Chưa cấu hình PRESETKEY_API_URL cho bộ cài.");

Console.Write("License key: ");
var licenseKey = (Console.ReadLine() ?? "").Trim().ToUpperInvariant();
if (licenseKey.Length < 10) Fail("License key không hợp lệ.");

var process = System.Diagnostics.Process.GetProcessesByName("CapCut").FirstOrDefault();
if (process is not null) Fail("Hãy lưu dự án và đóng CapCut trước khi cài.");

var fingerprint = GetFingerprint();
var deviceName = Environment.MachineName;
using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(3) };

Console.WriteLine("Đang kích hoạt thiết bị…");
var activation = await http.PostAsJsonAsync($"{apiBase}/api/licenses/activate", new {
    licenseKey, deviceFingerprint = fingerprint, deviceName, platform = "windows"
});
if (!activation.IsSuccessStatusCode) Fail(await ReadError(activation));

Console.WriteLine("Đang tải gói preset…");
var download = await http.PostAsJsonAsync($"{apiBase}/api/licenses/download", new { licenseKey, deviceFingerprint = fingerprint });
if (!download.IsSuccessStatusCode) Fail(await ReadError(download));

var tempRoot = Path.Combine(Path.GetTempPath(), "PresetKey", Guid.NewGuid().ToString("N"));
var zipPath = Path.Combine(tempRoot, "package.zip");
var extractPath = Path.Combine(tempRoot, "content");
Directory.CreateDirectory(extractPath);
await using (var output = File.Create(zipPath)) await download.Content.CopyToAsync(output);
ZipFile.ExtractToDirectory(zipPath, extractPath, true);

var presetsPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
    "CapCut", "User Data", "Presets", "Combination", "Presets");
Directory.CreateDirectory(presetsPath);

foreach (var source in Directory.GetDirectories(extractPath)) {
    var destination = Path.Combine(presetsPath, Path.GetFileName(source));
    CopyDirectory(source, destination);
}
RegisterPresets(presetsPath);
Directory.Delete(tempRoot, true);

Console.ForegroundColor = ConsoleColor.Green;
Console.WriteLine("\nCài đặt hoàn tất. Mở lại CapCut để sử dụng preset.");
Console.ResetColor();
Console.WriteLine("Nhấn Enter để đóng.");
Console.ReadLine();
return;

static string GetFingerprint() {
    var machineGuid = Registry.GetValue(@"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography", "MachineGuid", null)?.ToString();
    var source = $"{machineGuid}|{Environment.MachineName}|PresetKey-v1";
    return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(source))).ToLowerInvariant();
}

static async Task<string> ReadError(HttpResponseMessage response) {
    try { return (await response.Content.ReadFromJsonAsync<ApiError>())?.Error ?? $"Máy chủ trả lỗi {(int)response.StatusCode}."; }
    catch { return $"Máy chủ trả lỗi {(int)response.StatusCode}."; }
}

static void CopyDirectory(string source, string destination) {
    Directory.CreateDirectory(destination);
    foreach (var file in Directory.GetFiles(source)) File.Copy(file, Path.Combine(destination, Path.GetFileName(file)), true);
    foreach (var directory in Directory.GetDirectories(source)) CopyDirectory(directory, Path.Combine(destination, Path.GetFileName(directory)));
}

static void RegisterPresets(string presetsPath) {
    var storePath = Path.Combine(presetsPath, "CombinationPresetVirtualStore.json");
    if (File.Exists(storePath)) File.Copy(storePath, storePath + ".presetkey.bak", true);
    JsonObject root;
    try { root = File.Exists(storePath) ? JsonNode.Parse(File.ReadAllText(storePath))?.AsObject() ?? new() : new(); }
    catch { root = new(); }
    var stores = root["preset_virtual_store"] as JsonArray ?? new JsonArray();
    if (stores.Count == 0) stores.Add(new JsonObject { ["type"] = 0, ["value"] = new JsonArray() });
    root["preset_virtual_store"] = stores;
    var first = stores[0]?.AsObject() ?? new JsonObject();
    stores[0] = first;
    var values = first["value"] as JsonArray ?? new JsonArray();
    first["value"] = values;
    var existing = values.Select(x => x?["id"]?.GetValue<string>()).Where(x => x is not null).ToHashSet();
    foreach (var directory in Directory.GetDirectories(presetsPath)) {
        var preferred = Path.Combine(directory, Path.GetFileName(directory) + ".json");
        var metadata = File.Exists(preferred) ? preferred : Directory.GetFiles(directory, "*.json").FirstOrDefault();
        if (metadata is null) continue;
        try {
            var meta = JsonNode.Parse(File.ReadAllText(metadata));
            var id = meta?["id"]?.GetValue<string>();
            var name = meta?["name"]?.GetValue<string>() ?? Path.GetFileName(directory);
            if (string.IsNullOrWhiteSpace(id) || existing.Contains(id)) continue;
            values.Insert(0, new JsonObject { ["copyright_type"] = "", ["enterprise_id"] = "", ["id"] = id,
                ["is_enterprise_edition"] = false, ["name"] = name, ["save_from"] = 0, ["subsystem_id"] = "",
                ["type"] = 1, ["user_id"] = "" });
            existing.Add(id);
        } catch { }
    }
    File.WriteAllText(storePath + ".tmp", root.ToJsonString(new JsonSerializerOptions { WriteIndented = true }), new UTF8Encoding(false));
    File.Move(storePath + ".tmp", storePath, true);
}

static void Fail(string message) {
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"\nKhông thể cài: {message}");
    Console.ResetColor();
    Console.WriteLine("Nhấn Enter để đóng.");
    Console.ReadLine();
    Environment.Exit(1);
}

sealed record ApiError(string Error);
