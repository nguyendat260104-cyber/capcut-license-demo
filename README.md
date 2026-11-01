# PresetKey — CapCut license demo

Demo full-stack cho mô hình bán preset CapCut với một license chỉ được kích hoạt trên một thiết bị. Dự án gồm:

- Web đăng ký, mô phỏng kích hoạt và tải gói preset.
- API `register`, `activate`, `validate`, `deactivate`, `download`.
- PostgreSQL lưu license và thiết bị đã kích hoạt.
- Trình cài Windows tự lấy MachineGuid, tải và đăng ký preset vào CapCut.
- Trình cài macOS dạng app/pkg, không chứa binary theo kiến trúc nên chạy trên Intel và Apple Silicon.
- GitHub Actions build artifact cho cả Windows và macOS.

## Chạy web cục bộ

1. Tạo một PostgreSQL database (Neon hoặc Vercel Marketplace đều được).
2. Sao chép `.env.example` thành `.env.local` và điền `DATABASE_URL`, `LICENSE_SIGNING_SECRET`.
3. Chạy:

```bash
pnpm install
pnpm dev
```

Schema được tạo tự động ở request đầu tiên. Trang đăng ký hiện là demo công khai; khi bán thật, hãy thay endpoint đăng ký bằng webhook có xác minh chữ ký từ cổng thanh toán.

## Deploy Vercel

1. Import GitHub repository vào Vercel.
2. Kết nối Neon Postgres từ Vercel Marketplace hoặc tự đặt `DATABASE_URL`.
3. Tạo `LICENSE_SIGNING_SECRET` dài ít nhất 32 ký tự.
4. Deploy, sau đó thử tạo key và kích hoạt hai mã máy khác nhau. Lần thứ hai phải trả HTTP 409.

## Build installer

Trong GitHub repository, tạo Actions variable `API_BASE_URL` bằng domain Vercel, ví dụ `https://presetkey.vercel.app`. Chạy workflow **Build installers**. Hai artifact được tạo:

- `PresetKey-CapCut-Windows.exe`
- `PresetKey-CapCut-macOS-unsigned.pkg`

Gói macOS demo chưa ký/notarize. Để phát hành cho khách mà không gặp cảnh báo Gatekeeper, cần Apple Developer ID Installer certificate và bước notarization. App bên trong dùng shell/JXA có sẵn trên macOS nên không phụ thuộc Intel hay Apple Silicon; mức tối thiểu khai báo là macOS 10.13. Khả năng chạy thực tế còn phụ thuộc phiên bản CapCut đang hỗ trợ trên macOS đó.

## Lưu ý sản phẩm

Gói `packages/capcut-demo-preset.zip` hiện lấy từ preset `XE 01` để chứng minh luồng tải và cài. Trước khi bán, thay bằng tài nguyên đã kiểm tra quyền phân phối và thử trên máy sạch. License khóa việc kích hoạt/tải; preset sau khi cài vẫn là dữ liệu cục bộ của CapCut và không thể chống sao chép tuyệt đối.
