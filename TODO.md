# TODO - Các bước tiếp theo

## ✅ Đã hoàn thành (scaffold)

- [x] Cấu trúc NestJS cơ bản
- [x] TypeORM + entity `auction_notices`
- [x] Scheduler (cron 15 phút + daily)
- [x] NoticeScanner (batch read)
- [x] CorrectionRunner (orchestrator)
- [x] Interface CorrectionHandler
- [x] CLI commands
- [x] Docker + systemd config
- [x] Documentation

## 🔄 Bước tiếp theo (bạn làm)

### 1. Setup & Test (ưu tiên cao)

- [ ] Chạy `npm install`
- [ ] Config `.env` với `DATABASE_URL` thật
- [ ] Test kết nối: `npm run start:dev`
- [ ] Verify cron chạy (xem log mỗi 15 phút)
- [ ] Test CLI: `npm run correction:scan -- --batch-size=10`

### 2. Thêm Logic Sửa Dữ Liệu

Khi bạn có logic cụ thể, tạo handler:

- [ ] Tạo file handler đầu tiên (ví dụ: `fix-status.handler.ts`)
- [ ] Implement logic trong `correct()`
- [ ] Đăng ký handler trong module
- [ ] Test dry-run: `npm run correction:run -- --handler=fix-xxx --dry-run`
- [ ] Review log → chạy với `--apply` nếu OK

### 3. Thêm Audit Log (khuyến nghị)

Khi handler ghi DB:

- [ ] Tạo migration `.NET` cho bảng `data_correction_log` (xem README phần bảng audit)
- [ ] Implement transaction trong `notice.applier.ts`:
  - UPDATE `auction_notices`
  - INSERT `data_correction_log`
- [ ] Set `updated_by = 'cron:handler-name'`

### 4. Production Ready

- [ ] Set `CORRECTION_MODE=apply` trong `.env` production
- [ ] Deploy theo `DEPLOYMENT.md` (systemd hoặc Docker)
- [ ] Giám sát log lần chạy đầu tiên
- [ ] Setup alert nếu job fail

### 5. Tối ưu (optional)

- [ ] Thêm health endpoint `/health` cho monitoring
- [ ] Metrics (số notice processed, handler execution time)
- [ ] Thêm filter `WHERE` trong scanner nếu handler chỉ áp dụng subset (ví dụ: `status = 'UPCOMING'`)
- [ ] Retry logic cho handler failed

## 📋 Checklist handler mới

Mỗi khi thêm handler:

```
[ ] Tạo file handler
[ ] Unit test (optional)
[ ] Đăng ký trong module
[ ] Dry-run trên staging
[ ] Review sample 100 bản ghi
[ ] Apply production
[ ] Monitor 1-2 ngày đầu
```

## ❓ Câu hỏi cần trả lời

Trước khi thêm handler, xác định:

1. **Điều kiện áp dụng?** (ví dụ: `status = 'UPCOMING'` và `auction_datetime < now`)
2. **Field nào cần đổi?** (ví dụ: `{ status: 'COMPLETED' }`)
3. **Có insert bảng khác không?** (ví dụ: backfill `asset_owner_metadata`)
4. **Confidence cao hay thấp?** (auto-fix hay chỉ report?)
5. **Có skip notice nào không?** (ví dụ: `status_self_reported = true`)

## 🐛 Debug Checklist

Nếu có vấn đề:

- [ ] Kiểm tra log: `journalctl -u auction-cron-job -f` (systemd) hoặc `docker logs -f`
- [ ] Test CLI với 1 notice: `npm run correction:scan -- --notice-id=123`
- [ ] Kiểm tra `DATABASE_URL` có kết nối được không
- [ ] Verify schema: `\d auction_notices` trong psql

## 📚 Tham khảo

- **README.md**: Tài liệu thiết kế đầy đủ
- **QUICKSTART.md**: Hướng dẫn chạy nhanh
- **STRUCTURE.md**: Chi tiết cấu trúc code
- **handlers/README.md**: Template handler mẫu
