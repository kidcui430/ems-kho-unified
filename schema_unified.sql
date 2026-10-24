-- ============================================================
-- SCHEMA HỢP NHẤT: KHO NVL + EMS SẢN XUẤT (D1 SQLITE)
-- Dự án mới, không kế thừa dữ liệu cũ từ 2 app gốc.
-- ============================================================

PRAGMA foreign_keys = OFF;

DROP VIEW IF EXISTS v_ton_nvl;
DROP TABLE IF EXISTS Machine_Allocations;
DROP TABLE IF EXISTS Machines;
DROP TABLE IF EXISTS Transactions_Log;
DROP TABLE IF EXISTS Inventory;
DROP TABLE IF EXISTS Production_Orders;
DROP TABLE IF EXISTS Stages;
DROP TABLE IF EXISTS Lines;
DROP TABLE IF EXISTS Dinh_Muc_BOM;
DROP TABLE IF EXISTS Giao_Dich_NVL;
DROP TABLE IF EXISTS Danh_Muc_NVL;
DROP TABLE IF EXISTS San_Pham;
DROP TABLE IF EXISTS Nha_Cung_Cap;
DROP TABLE IF EXISTS Nguoi_Dung;

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. NGƯỜI DÙNG (gộp Nguoi_Dung + Users)
-- ============================================================
CREATE TABLE Nguoi_Dung (
  ma_nv TEXT PRIMARY KEY,
  ten_nv TEXT NOT NULL,
  password TEXT NOT NULL,                -- băm dạng s2:<salt>:<hash>, tự nâng cấp khi login lần đầu
  role TEXT NOT NULL CHECK (role IN ('ADMIN','USER','LEADER')),
  he_thong TEXT NOT NULL DEFAULT 'KHO' CHECK (he_thong IN ('KHO','SX','ALL')),
  bo_phan TEXT CHECK (bo_phan IS NULL OR bo_phan IN ('VP','XUONG','SX')),  -- có nghĩa khi he_thong IN ('KHO','ALL')
  line_id TEXT,                          -- có nghĩa khi role='LEADER' (he_thong IN ('SX','ALL')), FK khai báo sau khi có bảng Lines
  must_change_password INTEGER NOT NULL DEFAULT 0,  -- bật khi admin cấp mật khẩu tạm, buộc đổi ở lần đăng nhập đầu (kế thừa UX cũ bên EMS)
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

-- ============================================================
-- 2. NHÀ CUNG CẤP (chỉ dùng cho phía Kho)
-- ============================================================
CREATE TABLE Nha_Cung_Cap (
  ma_ncc TEXT PRIMARY KEY,
  ten_ncc TEXT NOT NULL,
  dia_chi TEXT DEFAULT '',
  so_dt TEXT DEFAULT '',
  nguoi_lien_he TEXT DEFAULT '',
  email TEXT DEFAULT '',
  ghi_chu TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

-- ============================================================
-- 3. NGUYÊN VẬT LIỆU (chỉ dùng cho phía Kho)
-- ============================================================
CREATE TABLE Danh_Muc_NVL (
  ma_hang TEXT PRIMARY KEY,
  phan_loai TEXT NOT NULL,
  ten_hang TEXT NOT NULL,
  quy_cach TEXT DEFAULT '',
  don_vi_tinh TEXT NOT NULL,
  ma_ncc TEXT DEFAULT '',
  trang_thai TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (trang_thai IN ('ACTIVE','BLOCKED','INACTIVE')),
  ghi_chu TEXT DEFAULT '',
  he_so_kg_m REAL DEFAULT 0,             -- quy đổi Kg/mét cho NVL dạng cây/thanh bị cắt khúc
  chieu_dai_chuan_m REAL DEFAULT 0,      -- chiều dài chuẩn mỗi cây (m)
  ma_goc TEXT DEFAULT '',                -- nếu đây là khúc dư, trỏ về mã NVL gốc
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE UNIQUE INDEX idx_nvl_unique_name ON Danh_Muc_NVL(phan_loai, ten_hang, quy_cach);
CREATE INDEX idx_nvl_phan_loai ON Danh_Muc_NVL(phan_loai);

-- ============================================================
-- 4. SẢN XUẤT: LINE / CÔNG ĐOẠN / MÁY
-- ============================================================
CREATE TABLE Lines (
  line_id TEXT PRIMARY KEY,
  line_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE TABLE Stages (
  stage_id TEXT PRIMARY KEY,
  line_id TEXT NOT NULL REFERENCES Lines(line_id),
  stage_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);
CREATE INDEX idx_stages_line ON Stages(line_id);

CREATE TABLE Machines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_code TEXT NOT NULL UNIQUE,
  machine_name TEXT,
  line_id TEXT NOT NULL REFERENCES Lines(line_id),   -- 1 máy dùng chung được nhiều công đoạn trong cùng Line
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX idx_machines_line ON Machines(line_id);

-- ============================================================
-- 5. MÃ HÀNG SẢN XUẤT HỢP NHẤT (gộp San_Pham_SX + Products)
-- ============================================================
CREATE TABLE San_Pham (
  ma_sp TEXT PRIMARY KEY,
  ten_sp TEXT NOT NULL,
  quy_cach TEXT DEFAULT '',
  don_vi_tinh TEXT DEFAULT 'Cái',
  routing_map TEXT DEFAULT NULL,         -- JSON [{"order":1,"stage_id":"CAT"},...]; NULL nếu mã chỉ dùng cho BOM kho, không qua công đoạn SX
  ghi_chu TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

-- ============================================================
-- 6. ĐỊNH MỨC BOM (tham chiếu mềm, không chặn xuất) — chỉ dùng cho phía Kho
-- ============================================================
CREATE TABLE Dinh_Muc_BOM (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_sp TEXT NOT NULL REFERENCES San_Pham(ma_sp),
  ma_hang TEXT NOT NULL REFERENCES Danh_Muc_NVL(ma_hang),
  dinh_muc REAL NOT NULL DEFAULT 0,
  ghi_chu TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  UNIQUE(ma_sp, ma_hang)
);
CREATE INDEX idx_bom_sp ON Dinh_Muc_BOM(ma_sp);

-- ============================================================
-- 6B. TỶ LỆ CẮT (THÉP CÂY -> SỐ CON/CÂY) - CHỈ DÙNG CHO NVL DẠNG CÂY
-- Áp dụng theo chiều dài chuẩn (chieu_dai_chuan_m) khai báo sẵn ở Danh_Muc_NVL.
-- ============================================================
CREATE TABLE Dinh_Muc_Cat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_sp TEXT NOT NULL REFERENCES San_Pham(ma_sp),
  ma_hang TEXT NOT NULL REFERENCES Danh_Muc_NVL(ma_hang),
  so_con_moi_cay REAL NOT NULL DEFAULT 0,
  ghi_chu TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  UNIQUE(ma_sp, ma_hang)
);
CREATE INDEX idx_cat_sp ON Dinh_Muc_Cat(ma_sp);

-- ============================================================
-- 7. SỔ CÁI KHO NVL (ledger, có tiền) — chỉ dùng cho phía Kho
-- ============================================================
CREATE TABLE Giao_Dich_NVL (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_hang TEXT NOT NULL REFERENCES Danh_Muc_NVL(ma_hang),
  loai_giao_dich TEXT NOT NULL CHECK (loai_giao_dich IN (
    'OPENING','NHAP_KHO','XUAT_XUONG','XUAT_SAN_XUAT','YEU_CAU_XUONG',
    'TRA_KHO','HOAN_TRA_XUONG','HUY_KHO','HUY_XUONG'
  )),
  so_luong REAL NOT NULL CHECK (so_luong > 0),
  sl_phu REAL DEFAULT 0,
  dvt_phu TEXT DEFAULT '',
  quy_cach_gd TEXT DEFAULT '',
  khoi_luong_kg REAL DEFAULT 0,
  delta_kho REAL NOT NULL DEFAULT 0,
  delta_xuong REAL NOT NULL DEFAULT 0,
  trang_thai TEXT NOT NULL DEFAULT 'approved' CHECK (trang_thai IN ('pending','approved','rejected')),
  nguoi_giao_dich TEXT NOT NULL REFERENCES Nguoi_Dung(ma_nv),
  nguoi_duyet TEXT DEFAULT '',
  ma_ncc TEXT DEFAULT '',
  ma_sp_sx TEXT DEFAULT '',              -- tham chiếu mềm tới San_Pham(ma_sp), không ép FK cứng (giữ đúng tinh thần gốc)
  so_chung_tu TEXT DEFAULT '',
  don_gia REAL NOT NULL DEFAULT 0,
  thanh_tien REAL NOT NULL DEFAULT 0,
  ghi_chu TEXT DEFAULT '',
  thoi_gian_gd TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  approved_at TEXT
);
CREATE INDEX idx_gd_ngay ON Giao_Dich_NVL(thoi_gian_gd);
CREATE INDEX idx_gd_ma_hang ON Giao_Dich_NVL(ma_hang);
CREATE INDEX idx_gd_status ON Giao_Dich_NVL(trang_thai);
CREATE INDEX idx_gd_type_date ON Giao_Dich_NVL(loai_giao_dich, thoi_gian_gd);

CREATE VIEW v_ton_nvl AS
SELECT
  d.ma_hang, d.phan_loai, d.ten_hang, d.quy_cach, d.don_vi_tinh,
  d.ma_ncc, d.trang_thai, d.ghi_chu,
  d.he_so_kg_m, d.chieu_dai_chuan_m, d.ma_goc,
  COALESCE(SUM(CASE WHEN g.trang_thai = 'approved' THEN g.delta_kho ELSE 0 END), 0) AS ton_kho,
  COALESCE(SUM(CASE WHEN g.trang_thai = 'approved' THEN g.delta_xuong ELSE 0 END), 0) AS ton_xuong
FROM Danh_Muc_NVL d
LEFT JOIN Giao_Dich_NVL g ON g.ma_hang = d.ma_hang
GROUP BY
  d.ma_hang, d.phan_loai, d.ten_hang, d.quy_cach, d.don_vi_tinh,
  d.ma_ncc, d.trang_thai, d.ghi_chu, d.he_so_kg_m, d.chieu_dai_chuan_m, d.ma_goc;

-- ============================================================
-- 8. SẢN XUẤT: LOT / WIP THEO CÔNG ĐOẠN / LỊCH SỬ DI CHUYỂN
-- ============================================================
CREATE TABLE Production_Orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT NOT NULL UNIQUE,        -- số LOT
  ma_sp TEXT NOT NULL REFERENCES San_Pham(ma_sp),
  production_date TEXT,                  -- YYYY-MM-DD
  total_qty INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','CLOSED','CANCELLED')),
  created_by TEXT REFERENCES Nguoi_Dung(ma_nv),
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE TABLE Inventory (                 -- "kho tạm" WIP: số lượng hiện có tại 1 LOT + 1 công đoạn
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_sp TEXT NOT NULL REFERENCES San_Pham(ma_sp),
  lot_number TEXT NOT NULL,
  stage_id TEXT NOT NULL,                -- có thể mang hậu tố "_NG" cho hàng lỗi tại trạm đó
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  UNIQUE(ma_sp, lot_number, stage_id)
);
CREATE INDEX idx_inventory_lot ON Inventory(lot_number);

CREATE TABLE Transactions_Log (          -- lịch sử di chuyển PASS/NG giữa các công đoạn
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  user_id TEXT REFERENCES Nguoi_Dung(ma_nv),
  lot_number TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  qty INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PASS','NG')),
  note TEXT DEFAULT ''
);
CREATE INDEX idx_translog_lot ON Transactions_Log(lot_number);
CREATE INDEX idx_translog_time ON Transactions_Log(timestamp);

-- ============================================================
-- 9. PHÂN BỔ LOT XUỐNG MÁY (tính năng mới — lớp theo dõi song song,
--    không ảnh hưởng cách tính Inventory/luồng PASS-NG ở trên)
-- ============================================================
CREATE TABLE Machine_Allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_number TEXT NOT NULL,
  ma_sp TEXT,
  stage_id TEXT NOT NULL REFERENCES Stages(stage_id),
  machine_id INTEGER NOT NULL REFERENCES Machines(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  input_date TEXT,                       -- ngày máy nhận hàng
  output_date TEXT,                      -- ngày giao dự kiến/thực tế
  status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','DONE','CANCELLED')),
  note TEXT DEFAULT '',
  created_by TEXT REFERENCES Nguoi_Dung(ma_nv),
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX idx_alloc_lot_stage ON Machine_Allocations(lot_number, stage_id);
CREATE INDEX idx_alloc_machine ON Machine_Allocations(machine_id);

-- ============================================================
-- DỮ LIỆU MẪU (demo, thay sau khi hệ thống chạy thật)
-- ============================================================

-- Lines (7 line, giữ nguyên mã đang quen dùng bên EMS cũ)
INSERT INTO Lines (line_id, line_name, display_order) VALUES
('CUTTING','Cắt',1), ('NC','NC',2), ('MNC','MNC',3),
('GS_GV','GS-GV',4), ('GP_GE_GI','GP-GE-GI',5), ('ASSY','Lắp ráp',6), ('KENSA','Kiểm tra',7);

-- Stages (19 công đoạn, giữ nguyên mã đang quen dùng bên EMS cũ)
INSERT INTO Stages (stage_id, line_id, stage_name, display_order) VALUES
('CAT','CUTTING','Cắt',1), ('NHIET_LUYEN','CUTTING','Nhiệt luyện',2), ('DO_CUNG','CUTTING','Độ cứng',3),
('NC1','NC','NC1',4), ('NC2','NC','NC2',5), ('NC3','NC','NC3',6),
('MNC1','MNC','MNC1',7), ('MNC2','MNC','MNC2',8), ('MNC3','MNC','MNC3',9),
('GS','GS_GV','GS',10), ('GV','GS_GV','GV',11),
('GP','GP_GE_GI','GP',12), ('GE','GP_GE_GI','GE',13), ('GI','GP_GE_GI','GI',14),
('LAP_RAP','ASSY','Lắp ráp',15), ('DONG_THUNG','ASSY','Đóng thùng',16), ('XUAT_GCN','ASSY','Đi GCN',17), ('NHAN_GCN','ASSY','Nhận GCN',18),
('KIEM_TRA','KENSA','Kiểm tra',19);

-- Máy demo
INSERT INTO Machines (machine_code, machine_name, line_id) VALUES
('NC-M01','Máy NC số 1','NC'), ('NC-M02','Máy NC số 2','NC'), ('MNC-M01','Máy MNC số 1','MNC');

-- Người dùng demo: 1 admin toàn quyền cả 2 hệ thống, còn lại theo đúng phạm vi
-- Mật khẩu để plaintext '123' lúc seed — worker sẽ tự băm & nâng cấp ngay lần đăng nhập đầu (xem verifyAndUpgradePassword)
INSERT INTO Nguoi_Dung (ma_nv, ten_nv, password, role, he_thong, bo_phan, line_id) VALUES
('ADMIN', 'Quản trị viên hệ thống', '123', 'ADMIN', 'ALL', 'VP', NULL),
('VP01', 'Nhân viên Kho VP', '123', 'USER', 'KHO', 'VP', NULL),
('XUONG01', 'Tổ sản xuất 01', '123', 'USER', 'KHO', 'XUONG', NULL),
('LEADER_NC', 'Tổ trưởng chuyền NC', '123', 'LEADER', 'SX', NULL, 'NC');

-- Nhà cung cấp demo
INSERT INTO Nha_Cung_Cap (ma_ncc, ten_ncc, dia_chi, so_dt, nguoi_lien_he, email) VALUES
('NCC001', 'Nhà cung cấp Thép Việt Nhật', 'TP.HCM', '0901234567', 'Nguyễn Văn A', 'vietnhat@supplier.com'),
('NCC002', 'Công ty Hóa Chất Minh Trí', 'Bình Dương', '0908765432', 'Trần Thị B', 'minhtri@supplier.com');

-- NVL demo
INSERT INTO Danh_Muc_NVL (ma_hang, phan_loai, ten_hang, quy_cach, don_vi_tinh, ma_ncc, ghi_chu, he_so_kg_m, chieu_dai_chuan_m, ma_goc) VALUES
('NVL001', 'Hóa Chất', 'Dung dịch tẩy rửa công nghiệp', 'Can 20L', 'Lít', 'NCC002', 'Bảo quản nơi thoáng mát', 0, 0, ''),
('NVL002', 'Bao Bì', 'Thùng carton 5 lớp', '500x400x300 mm', 'Cái', 'NCC001', '', 0, 0, ''),
('NVL003', 'Kim Loại', 'Thép tròn đặc C45', 'Ø20 mm x 6m', 'Cây', 'NCC001', 'Quy đổi chuẩn: 2.47 Kg/m, cây dài 6m', 2.47, 6, ''),
('NVL004', 'Phế Liệu', 'Phế liệu thép cắt', 'Đầu/đuôi dư khi cắt thép cây các loại', 'Kg', 'NCC001', 'Mã dùng chung cho mọi loại thép cây, không phân biệt mã gốc', 0, 0, '');

-- Mã hàng sản xuất demo: SP001 có routing_map (đi qua công đoạn SX), SP002 chỉ dùng cho BOM kho (không routing)
INSERT INTO San_Pham (ma_sp, ten_sp, quy_cach, don_vi_tinh, routing_map, ghi_chu) VALUES
('SP001', 'Trục dẫn hướng máy CNC', 'Ø20 x 500mm, tôi cao tần', 'Cái',
 '[{"order":1,"stage_id":"CAT"},{"order":2,"stage_id":"NHIET_LUYEN"},{"order":3,"stage_id":"NC1"},{"order":4,"stage_id":"KIEM_TRA"}]',
 'Mã bản vẽ: DWG-SP01'),
('SP002', 'Bạc đạn trượt tuyến tính', 'Size 30mm', 'Bộ', NULL, 'Gia công chính xác, chỉ theo dõi BOM kho');

-- Định mức BOM demo
INSERT INTO Dinh_Muc_BOM (ma_sp, ma_hang, dinh_muc, ghi_chu) VALUES
('SP001', 'NVL003', 0.1, 'Khoảng 0.1 cây mỗi SP (tham khảo, xem Tỷ lệ cắt để chính xác hơn)'),
('SP001', 'NVL001', 0.1, 'Hóa chất tẩy rửa sau gia công'),
('SP001', 'NVL002', 0.05, 'Đóng thùng 20 cái/thùng');

-- Tỷ lệ cắt demo: 1 cây NVL003 (6m) cắt ra được 11 con cho SP001
INSERT INTO Dinh_Muc_Cat (ma_sp, ma_hang, so_con_moi_cay, ghi_chu) VALUES
('SP001', 'NVL003', 11, 'Trục dài 500mm, cắt từ cây 6m, đã trừ hao hụt lưỡi cưa');

-- Tồn đầu kỳ kho NVL demo
INSERT INTO Giao_Dich_NVL
(ma_hang, loai_giao_dich, so_luong, delta_kho, delta_xuong, trang_thai, nguoi_giao_dich, ghi_chu, thoi_gian_gd)
VALUES
('NVL001', 'OPENING', 500, 500, 0, 'approved', 'ADMIN', 'Tồn đầu kỳ ban đầu', datetime('now','-10 days','+7 hours')),
('NVL002', 'OPENING', 1200, 1000, 200, 'approved', 'ADMIN', 'Tồn đầu kỳ ban đầu', datetime('now','-10 days','+7 hours')),
('NVL003', 'OPENING', 60, 50, 10, 'approved', 'ADMIN', 'Tồn đầu kỳ ban đầu (cây)', datetime('now','-10 days','+7 hours'));

-- 1 LOT demo cho SP001, đang nằm ở công đoạn đầu tiên (CAT)
INSERT INTO Production_Orders (po_number, ma_sp, production_date, total_qty, status, created_by) VALUES
('PO2610-01', 'SP001', date('now'), 100, 'OPEN', 'ADMIN');

INSERT INTO Inventory (ma_sp, lot_number, stage_id, quantity) VALUES
('SP001', 'PO2610-01', 'CAT', 100);
