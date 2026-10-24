# Khúc 0 — Audit & Backup (read-only, không đụng dữ liệu thật)

Thư mục này (`ems-kho-unified`) là dự án MỚI cho hệ thống gộp. Không sửa gì trong `quan_ly_kho_nvl_v2_2_modular` hay `ems-bic-v2-(run)`.

Bước này chỉ **đọc** 2 D1 hiện có — không ghi gì. Bạn chạy các lệnh dưới trên máy có `wrangler` đã đăng nhập Cloudflare của bạn, rồi dán kết quả lại đây để tôi phân tích và lập bảng mapping cho Khúc 2.

Thay `<NVL_DB_NAME>` và `<EMS_DB_NAME>` bằng tên database thật (xem trong `wrangler.toml` của mỗi worker, mục `[[d1_databases]]` → `database_name`, hoặc chạy `wrangler d1 list` để xem toàn bộ DB đang có).

## 1. Backup đầy đủ (bắt buộc làm trước tiên)

```bash
wrangler d1 export <NVL_DB_NAME> --remote --output=backup_nvl_$(date +%Y%m%d).sql
wrangler d1 export <EMS_DB_NAME> --remote --output=backup_ems_$(date +%Y%m%d).sql
```

Giữ 2 file backup này lại — đây là điểm rollback tức thời nếu có gì sai trong các khúc sau.

## 2. Đối soát trùng tên đăng nhập

```bash
wrangler d1 execute <NVL_DB_NAME> --remote --command "SELECT ma_nv, ten_nv, bo_phan, role, active FROM Nguoi_Dung ORDER BY ma_nv"
wrangler d1 execute <EMS_DB_NAME> --remote --command "SELECT username, full_name, role, line_id FROM Users ORDER BY username"
```

Dán cả 2 kết quả lại đây. Tôi sẽ so khớp `ma_nv` (NVL) với `UPPER(username)` (EMS) — chỗ nào trùng, bạn xác nhận giúp: **là 1 người** (gộp làm 1 tài khoản) hay **2 người khác nhau trùng tên** (phải đổi tên 1 trong 2 khi đưa sang DB mới).

## 3. Đối soát trùng mã sản phẩm

```bash
wrangler d1 execute <NVL_DB_NAME> --remote --command "SELECT ma_sp, ten_sp FROM San_Pham_SX ORDER BY ma_sp"
wrangler d1 execute <EMS_DB_NAME> --remote --command "SELECT product_code, product_name FROM Products ORDER BY product_code"
```

Dán kết quả lại — tôi so trùng `San_Pham_SX.ma_sp` với `Products.product_code`.

## 4. Số liệu gốc để làm checksum verify ở Khúc 2

```bash
wrangler d1 execute <NVL_DB_NAME> --remote --command "SELECT COUNT(*) AS n, SUM(so_luong) AS tong_sl FROM Giao_Dich_NVL"
wrangler d1 execute <NVL_DB_NAME> --remote --command "SELECT COUNT(*) AS n FROM Danh_Muc_NVL"
wrangler d1 execute <NVL_DB_NAME> --remote --command "SELECT COUNT(*) AS n FROM Nguoi_Dung"
wrangler d1 execute <NVL_DB_NAME> --remote --command "SELECT COUNT(*) AS n FROM Nha_Cung_Cap"
wrangler d1 execute <NVL_DB_NAME> --remote --command "SELECT COUNT(*) AS n FROM San_Pham_SX"
wrangler d1 execute <NVL_DB_NAME> --remote --command "SELECT COUNT(*) AS n FROM Dinh_Muc_BOM"

wrangler d1 execute <EMS_DB_NAME> --remote --command "SELECT COUNT(*) AS n, SUM(quantity) AS tong_qty FROM Inventory"
wrangler d1 execute <EMS_DB_NAME> --remote --command "SELECT COUNT(*) AS n FROM Production_Orders"
wrangler d1 execute <EMS_DB_NAME> --remote --command "SELECT COUNT(*) AS n FROM Users"
wrangler d1 execute <EMS_DB_NAME> --remote --command "SELECT COUNT(*) AS n FROM Products"
wrangler d1 execute <EMS_DB_NAME> --remote --command "SELECT COUNT(*) AS n FROM Transactions_Log"
```

Dán toàn bộ kết quả lại đây — tôi lưu lại làm "đáp số" để đối chiếu sau khi import dữ liệu ở Khúc 2 (COUNT/SUM phải khớp tuyệt đối thì mới coi là import đúng).

## 5. Việc tiếp theo

Sau khi có đủ kết quả mục 2-4, tôi sẽ:
- Lập bảng mapping cụ thể cho các trường hợp trùng (nếu có) — hỏi lại bạn từng trường hợp cụ thể, không tự suy đoán.
- Viết `schema_unified.sql` (Khúc 1) dựa trên kết quả audit thật, kèm lệnh `wrangler d1 create` để bạn tạo D1 mới.
