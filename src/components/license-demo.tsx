"use client";

import { FormEvent, useEffect, useState } from "react";

type Notice = { kind: "ok" | "error"; text: string } | null;

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Yêu cầu không thành công.");
  return payload;
}

export function LicenseDemo() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [deviceName, setDeviceName] = useState("Máy dựng phim của tôi");
  const [fingerprint, setFingerprint] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("presetkey-device") || crypto.randomUUID();
    localStorage.setItem("presetkey-device", saved);
    setFingerprint(saved);
  }, []);

  async function register(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const data = await readJson(await fetch("/api/licenses/register", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email }),
      }));
      setLicenseKey(data.licenseKey);
      setNotice({ kind: "ok", text: "Đã tạo license demo. Key chỉ hiển thị một lần." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Có lỗi xảy ra." });
    } finally { setBusy(false); }
  }

  async function activate() {
    setBusy(true);
    setNotice(null);
    try {
      await readJson(await fetch("/api/licenses/activate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ licenseKey, deviceFingerprint: fingerprint, deviceName, platform: "web-demo" }),
      }));
      setActivated(true);
      setNotice({ kind: "ok", text: "Kích hoạt thành công. Key đã được khóa với thiết bị này." });
    } catch (error) {
      setActivated(false);
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Có lỗi xảy ra." });
    } finally { setBusy(false); }
  }

  async function downloadPackage() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/licenses/download", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ licenseKey, deviceFingerprint: fingerprint }),
      });
      if (!response.ok) await readJson(response);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "capcut-demo-preset.zip";
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice({ kind: "ok", text: "Gói cài đã được tải cho đúng thiết bị đã kích hoạt." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Không tải được gói cài." });
    } finally { setBusy(false); }
  }

  function simulateOtherDevice() {
    const next = crypto.randomUUID();
    localStorage.setItem("presetkey-device", next);
    setFingerprint(next);
    setActivated(false);
    setNotice({ kind: "ok", text: "Đã đổi sang mã máy khác. Nhấn kích hoạt để kiểm tra giới hạn một máy." });
  }

  return (
    <main>
      <nav className="nav"><a className="brand" href="#">PRESET<span>KEY</span></a><a href="#demo">Thử luồng kích hoạt</a></nav>
      <section className="hero">
        <div className="eyebrow">LICENSE DEMO · WINDOWS + MACOS</div>
        <h1>Bán preset gọn hơn.<br /><em>Mỗi key, một thiết bị.</em></h1>
        <p>Demo hoàn chỉnh cho luồng cấp key, khóa thiết bị và tải gói preset. API sẵn sàng để bộ cài Windows và macOS sử dụng.</p>
        <a className="primary" href="#demo">Chạy thử demo <span>→</span></a>
        <div className="flow"><span>01 · Đăng ký</span><i /><span>02 · Kích hoạt</span><i /><span>03 · Tải bộ cài</span></div>
      </section>

      <section className="demo" id="demo">
        <div className="section-title"><span>DEMO FLOW</span><h2>Đi từ khách mới đến máy đã kích hoạt</h2></div>
        <div className="cards">
          <form className="card" onSubmit={register}>
            <div className="step">01</div><h3>Tạo license demo</h3><p>Mô phỏng webhook sau khi khách thanh toán thành công.</p>
            <label>Họ tên<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" /></label>
            <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" /></label>
            <button disabled={busy} className="action" type="submit">Tạo key miễn phí</button>
          </form>

          <div className="card">
            <div className="step">02</div><h3>Khóa với thiết bị</h3><p>Bộ cài thật sẽ tự lấy fingerprint; ô dưới đây dùng để mô phỏng.</p>
            <label>License key<input value={licenseKey} onChange={(e) => setLicenseKey(e.target.value.toUpperCase())} placeholder="PKEY-XXXX-XXXX-XXXX" /></label>
            <label>Tên thiết bị<input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} /></label>
            <div className="fingerprint"><span>MÃ MÁY</span><code>{fingerprint || "đang tạo…"}</code></div>
            <button disabled={busy || !licenseKey || !fingerprint} className="action" onClick={activate}>Kích hoạt máy này</button>
          </div>

          <div className="card dark-card">
            <div className="step">03</div><h3>Tải đúng máy</h3><p>API kiểm tra key và fingerprint trước khi trả gói preset.</p>
            <div className={`status ${activated ? "online" : ""}`}><span />{activated ? "Thiết bị đã kích hoạt" : "Chưa kích hoạt"}</div>
            <button disabled={busy || !activated} className="action light" onClick={downloadPackage}>Tải gói preset</button>
            <button disabled={busy} className="text-button" onClick={simulateOtherDevice}>Mô phỏng một máy khác →</button>
            <small>Máy thứ hai sẽ bị từ chối vì license chỉ có một seat.</small>
          </div>
        </div>
        {notice && <div className={`notice ${notice.kind}`}>{notice.text}</div>}
      </section>

      <section className="api-strip"><div><span>4</span><p>API endpoints<br /><b>Register · Activate · Validate · Download</b></p></div><div><span>1</span><p>Thiết bị mỗi key<br /><b>Có thể nâng thành gói Team</b></p></div><div><span>2</span><p>Nền tảng<br /><b>Windows · macOS</b></p></div></section>
      <footer><a className="brand" href="#">PRESET<span>KEY</span></a><p>Demo kỹ thuật — thay luồng đăng ký bằng webhook thanh toán trước khi bán thật.</p></footer>
    </main>
  );
}
