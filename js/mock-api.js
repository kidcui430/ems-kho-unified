// ============================================================
// MOCK API & DỮ LIỆU TESTER CHUẨN THỰC TẾ XƯỞNG: KHO NVL + SẢN XUẤT (EMS)
// Kích hoạt bằng cách mở URL: index.html?mock=1
// ============================================================

export function installMockFetch() {
  console.log(
    "🧪 [TESTER MODE] Đã kích hoạt Mock API chuẩn hóa theo danh sách Line & Stage thực tế của xưởng.",
  );

  const db = {
    users: [
      {
        ma_nv: "ADMIN",
        password: "123",
        ten_nv: "Vũ Quang Triết (Admin)",
        role: "ADMIN",
        he_thong: "ALL",
        bo_phan: "VP",
        line_id: null,
        active: 1,
      },
      {
        ma_nv: "VP01",
        password: "123",
        ten_nv: "Nguyễn Thị VY (VP Kho)",
        role: "STAFF",
        he_thong: "KHO",
        bo_phan: "VP",
        line_id: null,
        active: 1,
      },
      {
        ma_nv: "XUONG01",
        password: "123",
        ten_nv: "Phạm Văn Hiển (Kho Xưởng)",
        role: "STAFF",
        he_thong: "KHO",
        bo_phan: "XUONG",
        line_id: null,
        active: 1,
      },
      {
        ma_nv: "L_CUT",
        password: "123",
        ten_nv: "Trưởng Line Cắt",
        role: "LEADER",
        he_thong: "SX",
        bo_phan: "SX",
        line_id: "CUTTING",
        active: 1,
      },
      {
        ma_nv: "L_NC",
        password: "123",
        ten_nv: "Trưởng Line NC",
        role: "LEADER",
        he_thong: "SX",
        bo_phan: "SX",
        line_id: "NC",
        active: 1,
      },
      {
        ma_nv: "L_MNC",
        password: "123",
        ten_nv: "Trưởng Line MNC",
        role: "LEADER",
        he_thong: "SX",
        bo_phan: "SX",
        line_id: "MNC",
        active: 1,
      },
      {
        ma_nv: "L_GS",
        password: "123",
        ten_nv: "Trưởng Line Mài GS_GV",
        role: "LEADER",
        he_thong: "SX",
        bo_phan: "SX",
        line_id: "GS_GV",
        active: 1,
      },
      {
        ma_nv: "L_ASSY",
        password: "123",
        ten_nv: "Trưởng Line ASSY",
        role: "LEADER",
        he_thong: "SX",
        bo_phan: "SX",
        line_id: "ASSY",
        active: 1,
      },
    ],

    nccs: [
      {
        ma_ncc: "NCC001",
        ten_ncc: "Thép Đặc Biệt Sanyo Việt Nam",
        dia_chi: "KCN VSIP 2, Bình Dương",
        so_dt: "02743888999",
        nguoi_lien_he: "Anh Minh",
        email: "sales@sanyo-steel.vn",
        ghi_chu: "Cung cấp thép tròn đặc SUS304, S45C",
        active: 1,
      },
      {
        ma_ncc: "NCC002",
        ten_ncc: "Hóa Chất & Dầu Nhờn Idemitsu",
        dia_chi: "Quận 1, TP.HCM",
        so_dt: "02839112233",
        nguoi_lien_he: "Chị Lan",
        email: "contact@idemitsu.vn",
        ghi_chu: "Dầu cắt gọt, dung dịch chống gỉ",
        active: 1,
      },
    ],

    items: [
      {
        ma_hang: "NVL001",
        phan_loai: "Kim Loại",
        ten_hang: "Thép tròn đặc SUS304 Ø20",
        quy_cach: "Ø20mm x 6m",
        don_vi_tinh: "Cây",
        ma_ncc: "NCC001",
        he_so_kg_m: 2.47,
        chieu_dai_chuan_m: 6,
        ma_goc: "",
        ton_kho: 38,
        ton_xuong: 12,
        trang_thai: "ACTIVE",
        ghi_chu: "1 cây 6m nặng 14.82 Kg, cắt được 17 pcs SP001",
      },
      {
        ma_hang: "NVL002",
        phan_loai: "Kim Loại",
        ten_hang: "Thép hợp kim S45C Ø32",
        quy_cach: "Ø32mm x 6m",
        don_vi_tinh: "Cây",
        ma_ncc: "NCC001",
        he_so_kg_m: 6.31,
        chieu_dai_chuan_m: 6,
        ma_goc: "",
        ton_kho: 25,
        ton_xuong: 5,
        trang_thai: "ACTIVE",
        ghi_chu: "1 cây 6m nặng 37.86 Kg, cắt được 12 pcs SP002",
      },
      {
        ma_hang: "NVL003",
        phan_loai: "Hóa Chất",
        ten_hang: "Dầu cắt gọt pha nước Daphne",
        quy_cach: "Phuy 200 Lít",
        don_vi_tinh: "Lít",
        ma_ncc: "NCC002",
        he_so_kg_m: 0,
        chieu_dai_chuan_m: 0,
        ma_goc: "",
        ton_kho: 180,
        ton_xuong: 20,
        trang_thai: "ACTIVE",
        ghi_chu: "Dùng cho máy CNC Line NC & MNC",
      },
      {
        ma_hang: "NVL004",
        phan_loai: "Phế Liệu / Khúc Dư",
        ten_hang: "Đầu mẫu dư SUS304 Ø20",
        quy_cach: "Khúc ngắn < 350mm",
        don_vi_tinh: "Kg",
        ma_ncc: "NCC001",
        he_so_kg_m: 2.47,
        chieu_dai_chuan_m: 0,
        ma_goc: "NVL001",
        ton_kho: 15.5,
        ton_xuong: 0,
        trang_thai: "ACTIVE",
        ghi_chu: "Khúc dư hoàn trả từ Line CUTTING",
      },
    ],

    // Danh sách Line thực tế của xưởng
    lines: [
      { line_id: "CUTTING", line_name: "Line(CUTTING)", display_order: 1 },
      { line_id: "NC", line_name: "Line(NC)", display_order: 2 },
      { line_id: "MNC", line_name: "Line(MNC)", display_order: 3 },
      { line_id: "GS_GV", line_name: "Line(GS_GV)", display_order: 4 },
      { line_id: "GP_TI_GE", line_name: "Line(GP_TI_GE)", display_order: 5 },
      { line_id: "ASSY", line_name: "Line(ASSY)", display_order: 6 },
      { line_id: "KENSA", line_name: "Line(KENSA)", display_order: 7 },
    ],

    // Chuẩn hóa stage_id (ASCII không dấu để chạy mượt trên D1 SQLite) + stage_name đúng thực tế xưởng
    stages: [
      {
        stage_id: "CAT",
        line_id: "CUTTING",
        stage_name: "Cắt",
        display_order: 1,
      },
      {
        stage_id: "NHIET_LUYEN",
        line_id: "CUTTING",
        stage_name: "Nhiệt luyện",
        display_order: 2,
      },
      {
        stage_id: "DO_CUNG",
        line_id: "CUTTING",
        stage_name: "Độ cứng",
        display_order: 3,
      },
      { stage_id: "NC_1", line_id: "NC", stage_name: "NC1", display_order: 4 },
      { stage_id: "NC_2", line_id: "NC", stage_name: "NC2", display_order: 5 },
      { stage_id: "NC_3", line_id: "NC", stage_name: "NC3", display_order: 6 },
      {
        stage_id: "MNC_1",
        line_id: "MNC",
        stage_name: "MNC1",
        display_order: 7,
      },
      {
        stage_id: "MNC_2",
        line_id: "MNC",
        stage_name: "MNC2",
        display_order: 8,
      },
      {
        stage_id: "MNC_3",
        line_id: "MNC",
        stage_name: "MNC3",
        display_order: 9,
      },
      { stage_id: "GS", line_id: "GS_GV", stage_name: "GS", display_order: 10 },
      { stage_id: "GV", line_id: "GS_GV", stage_name: "GV", display_order: 11 },
      {
        stage_id: "LAP_RAP",
        line_id: "ASSY",
        stage_name: "Lắp Ráp",
        display_order: 12,
      },
      {
        stage_id: "DONG_THUNG",
        line_id: "ASSY",
        stage_name: "Đóng Thùng",
        display_order: 13,
      },
      {
        stage_id: "XUAT_GCN",
        line_id: "ASSY",
        stage_name: "Xuất GCN",
        display_order: 14,
      },
      {
        stage_id: "NHAP_GCN",
        line_id: "ASSY",
        stage_name: "Nhập GCN",
        display_order: 15,
      },
      {
        stage_id: "GP",
        line_id: "GP_TI_GE",
        stage_name: "GP",
        display_order: 16,
      },
      {
        stage_id: "TI",
        line_id: "GP_TI_GE",
        stage_name: "TI",
        display_order: 17,
      },
      {
        stage_id: "GE",
        line_id: "GP_TI_GE",
        stage_name: "GE",
        display_order: 18,
      },
      {
        stage_id: "KIEM_TRA",
        line_id: "ASSY",
        stage_name: "Kiểm Tra",
        display_order: 19,
      },
    ],

    // Sản phẩm đồng bộ đúng stage_id mới của xưởng
    products: [
      {
        ma_sp: "SP001",
        ten_sp: "Trục vít dẫn hướng SUS304 Ø20x340",
        quy_cach: "Dài 340mm, tiện ren 2 đầu",
        don_vi_tinh: "PCS",
        routing_map: JSON.stringify([
          { order: 1, stage_id: "CAT" },
          { order: 2, stage_id: "NHIET_LUYEN" },
          { order: 3, stage_id: "NC_1" },
          { order: 4, stage_id: "MNC_1" },
          { order: 5, stage_id: "GS" },
          { order: 6, stage_id: "KIEM_TRA" },
          { order: 7, stage_id: "DONG_THUNG" },
        ]),
        ghi_chu: "1 cây 6m cắt ra 17 pcs",
        active: 1,
      },
      {
        ma_sp: "SP002",
        ten_sp: "Bích nối trục chịu lực S45C Ø32",
        quy_cach: "Ø32x480mm, phay rãnh then",
        don_vi_tinh: "PCS",
        routing_map: JSON.stringify([
          { order: 1, stage_id: "CAT" },
          { order: 2, stage_id: "NC_1" },
          { order: 3, stage_id: "MNC_1" },
          { order: 4, stage_id: "LAP_RAP" },
          { order: 5, stage_id: "KIEM_TRA" },
          { order: 6, stage_id: "DONG_THUNG" },
        ]),
        ghi_chu: "1 cây 6m cắt ra 12 pcs",
        active: 1,
      },
      {
        ma_sp: "TB-30",
        ten_sp: "Linear motion bearing",
        quy_cach: " Chuẩn nhà máy",
        don_vi_tinh: "PCS",
        routing_map: JSON.stringify([
          { order: 1, stage_id: "CAT" },
          { order: 2, stage_id: "NC_1" },
          { order: 3, stage_id: "GS" },
          { order: 4, stage_id: "LAP_RAP" },
          { order: 5, stage_id: "KIEM_TRA" },
          { order: 6, stage_id: "DONG_THUNG" },
        ]),
        ghi_chu: "Bạc đạn trượt tuyến tính",
        active: 1,
      },
    ],

    boms: [
      {
        id: 1,
        ma_sp: "SP001",
        ma_hang: "NVL001",
        dinh_muc: 0.059,
        ghi_chu: "1 cây 6m cắt được 17 pcs (~0.0588 cây/sp)",
      },
      {
        id: 2,
        ma_sp: "SP001",
        ma_hang: "NVL003",
        dinh_muc: 0.05,
        ghi_chu: "Dầu tưới nguội tiêu hao",
      },
      {
        id: 3,
        ma_sp: "SP002",
        ma_hang: "NVL002",
        dinh_muc: 0.083,
        ghi_chu: "1 cây 6m cắt được 12 pcs",
      },
    ],

    cutRatios: [
      {
        id: 1,
        ma_sp: "SP001",
        ma_hang: "NVL001",
        so_con_moi_cay: 17,
        ghi_chu: "Cắt phôi 345mm + mạch cưa 5mm = 17 pcs/cây 6m",
      },
      {
        id: 2,
        ma_sp: "SP002",
        ma_hang: "NVL002",
        so_con_moi_cay: 12,
        ghi_chu: "Cắt phôi 490mm = 12 pcs/cây 6m",
      },
    ],

    khoTransactions: [
      {
        id: 101,
        thoi_gian_gd: "2026-10-24 08:15:00",
        ma_hang: "NVL001",
        loai_giao_dich: "NHAP_KHO",
        so_luong: 50,
        sl_phu: 300,
        dvt_phu: "m",
        quy_cach_gd: "1 cây = 6m (Tổng 300m)",
        khoi_luong_kg: 741,
        nguoi_giao_dich: "VP01",
        ma_ncc: "NCC001",
        ma_sp_sx: "",
        so_chung_tu: "PNK-2410-01",
        don_gia: 850000,
        ghi_chu: "Nhập lô thép SUS304 đầu tuần",
      },
      {
        id: 102,
        thoi_gian_gd: "2026-10-24 09:30:00",
        ma_hang: "NVL001",
        loai_giao_dich: "XUAT_SAN_XUAT",
        so_luong: 12,
        sl_phu: 204,
        dvt_phu: "pcs",
        quy_cach_gd: "1 cây 6m = 17 pcs → Cắt 204 pcs",
        khoi_luong_kg: 177.84,
        nguoi_giao_dich: "XUONG01",
        ma_ncc: "",
        ma_sp_sx: "SP001",
        so_chung_tu: "PXK-PO2510",
        don_gia: 0,
        ghi_chu: "Xuất 12 cây thép cắt 204 pcs cho PO2510",
      },
      {
        id: 103,
        thoi_gian_gd: "2026-10-24 10:00:00",
        ma_hang: "NVL002",
        loai_giao_dich: "NHAP_KHO",
        so_luong: 30,
        sl_phu: 180,
        dvt_phu: "m",
        quy_cach_gd: "1 cây = 6m (Tổng 180m)",
        khoi_luong_kg: 1135.8,
        nguoi_giao_dich: "VP01",
        ma_ncc: "NCC001",
        ma_sp_sx: "",
        so_chung_tu: "PNK-2410-02",
        don_gia: 1200000,
        ghi_chu: "Nhập thép S45C Ø32",
      },
      {
        id: 104,
        thoi_gian_gd: "2026-10-24 14:20:00",
        ma_hang: "NVL002",
        loai_giao_dich: "XUAT_SAN_XUAT",
        so_luong: 5,
        sl_phu: 60,
        dvt_phu: "pcs",
        quy_cach_gd: "1 cây 6m = 12 pcs → Cắt 60 pcs",
        khoi_luong_kg: 189.3,
        nguoi_giao_dich: "XUONG01",
        ma_ncc: "",
        ma_sp_sx: "SP002",
        so_chung_tu: "PXK-PO2511",
        don_gia: 0,
        ghi_chu: "Xuất 5 cây cắt 60 pcs cho PO2511",
      },
    ],

    machines: [
      {
        id: 1,
        machine_code: "C01",
        machine_name: "Máy cắt 01",
        line_id: "CUTTING",
      },
      {
        id: 2,
        machine_code: "C02",
        machine_name: "Máy cắt 02",
        line_id: "CUTTING",
      },
      {
        id: 3,
        machine_code: "NC-01",
        machine_name: "Máy Mazak NC-01",
        line_id: "NC",
      },
      {
        id: 4,
        machine_code: "NC-02",
        machine_name: "Máy Okuma NC-02",
        line_id: "NC",
      },
      {
        id: 5,
        machine_code: "MNC-01",
        machine_name: "Brother MNC-01",
        line_id: "MNC",
      },
      {
        id: 6,
        machine_code: "GS-01",
        machine_name: "Máy Mài Okamoto GS-01",
        line_id: "GS_GV",
      },
    ],

    pos: [
      {
        po_number: "PO2510-01",
        ma_sp: "SP001",
        production_date: "2026-10-24",
        total_qty: 102,
        status: "OPEN",
        created_by: "ADMIN",
      },
      {
        po_number: "PO2510-02",
        ma_sp: "SP001",
        production_date: "2026-10-24",
        total_qty: 102,
        status: "OPEN",
        created_by: "ADMIN",
      },
      {
        po_number: "PO2511-01",
        ma_sp: "SP002",
        production_date: "2026-10-25",
        total_qty: 60,
        status: "OPEN",
        created_by: "ADMIN",
      },
    ],

    // Dữ liệu tồn WIP khớp 100% với stage_id mới ("CAT", "NC_1", "MNC_1")
    sxInventory: [
      {
        ma_sp: "SP001",
        lot_number: "PO2510-01",
        stage_id: "NC_1",
        quantity: 70,
        updated_at: "2026-10-25 06:30:00",
      },
      {
        ma_sp: "SP001",
        lot_number: "PO2510-01",
        stage_id: "NC_1_NG",
        quantity: 2,
        updated_at: "2026-10-25 07:45:00",
      },
      {
        ma_sp: "SP001",
        lot_number: "PO2510-01",
        stage_id: "MNC_1",
        quantity: 30,
        updated_at: "2026-10-25 08:00:00",
      },
      {
        ma_sp: "SP001",
        lot_number: "PO2510-02",
        stage_id: "CAT",
        quantity: 102,
        updated_at: "2026-10-25 07:00:00",
      },
      {
        ma_sp: "SP002",
        lot_number: "PO2511-01",
        stage_id: "NC_1",
        quantity: 60,
        updated_at: "2026-10-25 07:30:00",
      },
    ],

    machineAllocations: [
      {
        id: 1,
        lot_number: "PO2510-01",
        ma_sp: "SP001",
        stage_id: "CAT",
        machine_id: 1,
        qty: 102,
        input_date: "2026-10-24 13:00",
        output_date: "2026-10-24 16:30",
        status: "DONE",
        note: "Đã cắt xong 6 cây = 102 pcs",
        created_at: "2026-10-24 13:00:00",
      },
      {
        id: 2,
        lot_number: "PO2510-01",
        ma_sp: "SP001",
        stage_id: "NC_1",
        machine_id: 3,
        qty: 40,
        input_date: "2026-10-25 06:40",
        output_date: null,
        status: "RUNNING",
        note: "Đang tiện trên NC-01 (Còn 30 pcs đang chờ máy)",
        created_at: "2026-10-25 06:40:00",
      },
      {
        id: 3,
        lot_number: "PO2510-02",
        ma_sp: "SP001",
        stage_id: "CAT",
        machine_id: 2,
        qty: 68,
        input_date: "2026-10-25 07:15",
        output_date: null,
        status: "RUNNING",
        note: "Đang cưa 4 cây trên C02",
        created_at: "2026-10-25 07:15:00",
      },
      {
        id: 4,
        lot_number: "PO2511-01",
        ma_sp: "SP002",
        stage_id: "NC_1",
        machine_id: 4,
        qty: 60,
        input_date: "2026-10-25 07:35",
        output_date: null,
        status: "RUNNING",
        note: "Chạy toàn bộ 60 pcs trên NC-02",
        created_at: "2026-10-25 07:35:00",
      },
    ],

    sxHistory: [
      {
        timestamp: "2026-10-24 16:30:00",
        user_id: "L_CUT",
        lot_number: "PO2510-01",
        from_stage: "CAT [Máy C01]",
        to_stage: "NHIET_LUYEN",
        qty: 102,
        type: "PASS",
      },
      {
        timestamp: "2026-10-25 07:45:00",
        user_id: "L_NC",
        lot_number: "PO2510-01",
        from_stage: "NC_1 [Máy NC-01]",
        to_stage: "KHO_NG",
        qty: 2,
        type: "NG",
      },
      {
        timestamp: "2026-10-25 08:00:00",
        user_id: "L_NC",
        lot_number: "PO2510-01",
        from_stage: "NC_1 [Máy NC-01]",
        to_stage: "MNC_1",
        qty: 30,
        type: "PASS",
      },
    ],
  };

  const realFetch = window.fetch.bind(window);

  window.fetch = async function (input, init = {}) {
    const urlStr = typeof input === "string" ? input : input.url;
    const u = new URL(urlStr, location.origin);
    const path = u.pathname;
    const method = (init.method || "GET").toUpperCase();
    const p = init.body ? JSON.parse(init.body) : {};

    const respond = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    const bad = (msg, status = 400) => respond({ error: msg }, status);
    // Các phân bổ máy đang chạy (chưa DONE/CANCELLED) của 1 LOT tại 1 công đoạn
    const mockRunningAllocs = (lot, stageUp) =>
      db.machineAllocations.filter(
        (a) =>
          a.lot_number === lot &&
          String(a.stage_id).toUpperCase() === stageUp &&
          a.status !== "DONE" &&
          a.status !== "CANCELLED",
      );
    const mockLineHasMachines = (lineId) =>
      !!lineId &&
      db.machines.some(
        (m) =>
          String(m.line_id).toUpperCase() === String(lineId).toUpperCase() &&
          m.is_active !== 0,
      );

    if (!path.startsWith("/api/")) return realFetch(input, init);

    // 1. AUTH
    if (path === "/api/login" && method === "POST") {
      const maNv = String(p.ma_nv || "")
        .toUpperCase()
        .trim();
      const user = db.users.find(
        (x) => x.ma_nv === maNv && x.password === String(p.password || ""),
      );
      if (!user)
        return bad("Sai tài khoản hoặc mật khẩu (Gợi ý: mật khẩu là 123)", 401);
      return respond(user);
    }

    // 2. KHO NVL BOOTSTRAP & DANH MỤC NVL / NCC / BOM / TỶ LỆ CẮT
    if (path === "/api/kho/bootstrap" && method === "GET") {
      const items = db.items
        .filter((i) => i.trang_thai !== "INACTIVE")
        .map((it) => {
          const nhap = db.khoTransactions
            .filter(
              (t) =>
                t.ma_hang === it.ma_hang && t.loai_giao_dich === "NHAP_KHO",
            )
            .reduce((s, t) => s + Number(t.so_luong), 0);
          const xuat = db.khoTransactions
            .filter(
              (t) =>
                t.ma_hang === it.ma_hang &&
                t.loai_giao_dich === "XUAT_SAN_XUAT",
            )
            .reduce((s, t) => s + Number(t.so_luong), 0);
          return { ...it, tong_nhap: nhap, tong_xuat_sx: xuat };
        });
      const boms = db.boms.map((b) => {
        const it = db.items.find((i) => i.ma_hang === b.ma_hang) || {};
        return {
          ...b,
          ten_hang: it.ten_hang,
          phan_loai: it.phan_loai,
          quy_cach: it.quy_cach,
          don_vi_tinh: it.don_vi_tinh,
        };
      });
      const cutRatios = db.cutRatios.map((c) => {
        const it = db.items.find((i) => i.ma_hang === c.ma_hang) || {};
        return {
          ...c,
          ten_hang: it.ten_hang,
          chieu_dai_chuan_m: it.chieu_dai_chuan_m,
          he_so_kg_m: it.he_so_kg_m,
        };
      });
      return respond({
        items,
        nccs: db.nccs.filter((n) => n.active !== 0),
        products: db.products.filter((pr) => pr.active !== 0),
        boms,
        cutRatios,
      });
    }

    if (path === "/api/kho/items" && method === "POST") {
      if (!p.phan_loai || !p.ten_hang)
        return bad("Vui lòng nhập Phân loại và Tên NVL.");
      const maxNo = db.items.reduce(
        (m, it) =>
          Math.max(m, parseInt(String(it.ma_hang).replace(/\D/g, "")) || 0),
        0,
      );
      const ma_hang = `NVL${String(maxNo + 1).padStart(3, "0")}`;
      db.items.push({
        ma_hang,
        phan_loai: p.phan_loai.trim(),
        ten_hang: p.ten_hang.trim(),
        quy_cach: p.quy_cach || "",
        don_vi_tinh: p.don_vi_tinh || "Cây",
        ma_ncc: p.ma_ncc || "",
        ghi_chu: p.ghi_chu || "",
        he_so_kg_m: Number(p.he_so_kg_m || 0),
        chieu_dai_chuan_m: Number(p.chieu_dai_chuan_m || 0),
        ma_goc: p.ma_goc || "",
        ton_kho: 0,
        ton_xuong: 0,
        trang_thai: "ACTIVE",
      });
      return respond({ success: true, ma_hang });
    }

    if (path === "/api/kho/items/edit" && method === "POST") {
      const it = db.items.find((x) => x.ma_hang === p.ma_hang);
      if (!it) return bad("Không tìm thấy NVL");
      Object.assign(it, {
        phan_loai: p.phan_loai,
        ten_hang: p.ten_hang,
        quy_cach: p.quy_cach,
        don_vi_tinh: p.don_vi_tinh,
        he_so_kg_m: Number(p.he_so_kg_m || 0),
        chieu_dai_chuan_m: Number(p.chieu_dai_chuan_m || 0),
        ma_goc: p.ma_goc || "",
      });
      return respond({ success: true });
    }

    if (path === "/api/kho/items/delete" && method === "POST") {
      db.items = db.items.filter((x) => x.ma_hang !== p.ma_hang);
      return respond({ success: true });
    }

    if (path === "/api/kho/suppliers" && method === "POST") {
      const ma_ncc = `NCC${String(db.nccs.length + 1).padStart(3, "0")}`;
      db.nccs.push({
        ma_ncc,
        ten_ncc: p.ten_ncc,
        dia_chi: p.dia_chi || "",
        so_dt: p.so_dt || "",
        nguoi_lien_he: p.nguoi_lien_he || "",
        email: p.email || "",
        ghi_chu: p.ghi_chu || "",
        active: 1,
      });
      return respond({ success: true, ma_ncc });
    }
    if (path === "/api/kho/suppliers/edit" && method === "POST") {
      const sup = db.nccs.find((x) => x.ma_ncc === p.ma_ncc);
      if (sup) Object.assign(sup, p);
      return respond({ success: true });
    }
    if (path === "/api/kho/suppliers/delete" && method === "POST") {
      db.nccs = db.nccs.filter((x) => x.ma_ncc !== p.ma_ncc);
      return respond({ success: true });
    }

    if (path === "/api/kho/bom/save" && method === "POST") {
      const idx = db.boms.findIndex(
        (b) => b.ma_sp === p.ma_sp && b.ma_hang === p.ma_hang,
      );
      if (idx >= 0)
        db.boms[idx] = {
          ...db.boms[idx],
          dinh_muc: Number(p.dinh_muc || 0),
          ghi_chu: p.ghi_chu || "",
        };
      else
        db.boms.push({
          id: Date.now(),
          ma_sp: p.ma_sp,
          ma_hang: p.ma_hang,
          dinh_muc: Number(p.dinh_muc || 0),
          ghi_chu: p.ghi_chu || "",
        });
      return respond({ success: true });
    }
    if (path === "/api/kho/bom/delete" && method === "POST") {
      db.boms = db.boms.filter(
        (b) => !(b.ma_sp === p.ma_sp && b.ma_hang === p.ma_hang),
      );
      return respond({ success: true });
    }

    if (path === "/api/kho/cat-ratio/save" && method === "POST") {
      const idx = db.cutRatios.findIndex(
        (c) => c.ma_sp === p.ma_sp && c.ma_hang === p.ma_hang,
      );
      if (idx >= 0)
        db.cutRatios[idx] = {
          ...db.cutRatios[idx],
          so_con_moi_cay: Number(p.so_con_moi_cay),
          ghi_chu: p.ghi_chu,
        };
      else
        db.cutRatios.push({
          id: Date.now(),
          ma_sp: p.ma_sp,
          ma_hang: p.ma_hang,
          so_con_moi_cay: Number(p.so_con_moi_cay),
          ghi_chu: p.ghi_chu,
        });
      return respond({ success: true });
    }
    if (path === "/api/kho/cat-ratio/delete" && method === "POST") {
      db.cutRatios = db.cutRatios.filter(
        (c) => !(c.ma_sp === p.ma_sp && c.ma_hang === p.ma_hang),
      );
      return respond({ success: true });
    }

    // 3. GIAO DỊCH KHO NVL & BÁO CÁO
    if (path === "/api/kho/transactions" && method === "POST") {
      const nowTime = new Date().toTimeString().slice(0, 8);
      for (const tx of p.transactions || []) {
        const it = db.items.find((i) => i.ma_hang === tx.ma_hang);
        if (!it) continue;
        if (
          tx.loai_giao_dich === "NHAP_KHO" ||
          tx.loai_giao_dich === "HOAN_TRA_XUONG"
        )
          it.ton_kho += Number(tx.so_luong);
        else it.ton_kho -= Number(tx.so_luong);

        db.khoTransactions.unshift({
          id: Date.now() + Math.floor(Math.random() * 1000),
          thoi_gian_gd: `${p.tx_date} ${nowTime}`,
          nguoi_giao_dich: p.user_id,
          ...tx,
        });
      }
      return respond({ success: true });
    }

    if (path === "/api/kho/history" && method === "GET") {
      const rows = db.khoTransactions.map((g) => {
        const d = db.items.find((i) => i.ma_hang === g.ma_hang) || {};
        const u = db.users.find((x) => x.ma_nv === g.nguoi_giao_dich) || {};
        const s = db.products.find((x) => x.ma_sp === g.ma_sp_sx) || {};
        const n = db.nccs.find((x) => x.ma_ncc === g.ma_ncc) || {};
        return {
          ...g,
          ten_hang: d.ten_hang,
          phan_loai: d.phan_loai,
          don_vi_tinh: d.don_vi_tinh,
          ten_nv: u.ten_nv,
          bo_phan: u.bo_phan,
          ten_sp: s.ten_sp,
          ten_ncc: n.ten_ncc,
        };
      });
      return respond({ rows });
    }

    if (path === "/api/kho/report/daily" && method === "GET") {
      const rows = db.items.map((d) => {
        const txs = db.khoTransactions.filter((g) => g.ma_hang === d.ma_hang);
        const nhap = txs
          .filter((g) => g.loai_giao_dich === "NHAP_KHO")
          .reduce((s, g) => s + Number(g.so_luong), 0);
        const xuat_sx = txs
          .filter((g) => g.loai_giao_dich === "XUAT_SAN_XUAT")
          .reduce((s, g) => s + Number(g.so_luong), 0);
        const tong_kg_nhap = txs
          .filter((g) => g.loai_giao_dich === "NHAP_KHO")
          .reduce((s, g) => s + Number(g.khoi_luong_kg || 0), 0);
        const tong_kg_xuat = txs
          .filter((g) => g.loai_giao_dich === "XUAT_SAN_XUAT")
          .reduce((s, g) => s + Number(g.khoi_luong_kg || 0), 0);
        const tong_pcs_xuat = txs
          .filter(
            (g) => g.loai_giao_dich === "XUAT_SAN_XUAT" && g.dvt_phu === "pcs",
          )
          .reduce((s, g) => s + Number(g.sl_phu || 0), 0);
        return {
          ma_hang: d.ma_hang,
          ten_hang: d.ten_hang,
          phan_loai: d.phan_loai,
          don_vi_tinh: d.don_vi_tinh,
          chieu_dai_chuan_m: d.chieu_dai_chuan_m,
          he_so_kg_m: d.he_so_kg_m,
          nhap,
          xuat_sx,
          tong_kg_nhap,
          tong_kg_xuat,
          tong_pcs_xuat,
          gd_gan_nhat: txs[0]?.thoi_gian_gd || null,
          ton_kho: d.ton_kho,
        };
      });
      const total = {
        nhap: rows.reduce((s, r) => s + r.nhap, 0),
        xuat_sx: rows.reduce((s, r) => s + r.xuat_sx, 0),
      };
      return respond({
        rows,
        total,
        chart_by_product: [],
        chart_by_category: [],
      });
    }

    if (path === "/api/kho/report/detail" && method === "GET") {
      const maHang = u.searchParams.get("ma_hang");
      const rows = db.khoTransactions
        .filter((g) => !maHang || g.ma_hang === maHang)
        .map((g) => {
          const s = db.products.find((x) => x.ma_sp === g.ma_sp_sx) || {};
          const usr = db.users.find((x) => x.ma_nv === g.nguoi_giao_dich) || {};
          return {
            ...g,
            loai_hien_thi: g.loai_giao_dich,
            ten_sp: s.ten_sp,
            ten_nv: usr.ten_nv,
          };
        });
      return respond({ rows });
    }

    // 4. SẢN XUẤT & DÙNG CHUNG
    if (path === "/api/products" && method === "GET")
      return respond({ products: db.products });
    if (path === "/api/products" && method === "POST") {
      if (!p.ten_sp) return bad("Tên mã hàng là bắt buộc.");
      const hasCode = (c) =>
        db.products.some(
          (x) => String(x.ma_sp || "").toUpperCase() === String(c).toUpperCase(),
        );
      let ma_sp = String(p.ma_sp || "").trim().toUpperCase();
      if (!ma_sp) {
        let n = db.products.length + 1;
        while (hasCode(`SP${String(n).padStart(3, "0")}`)) n++;
        ma_sp = `SP${String(n).padStart(3, "0")}`;
      }
      if (hasCode(ma_sp)) return bad(`Mã sản phẩm '${ma_sp}' đã tồn tại.`);
      db.products.push({
        ma_sp,
        ten_sp: p.ten_sp,
        quy_cach: p.quy_cach || "",
        don_vi_tinh: p.don_vi_tinh || "PCS",
        routing_map: p.routing_map ? JSON.stringify(p.routing_map) : null,
        ghi_chu: p.ghi_chu || "",
        active: 1,
      });
      return respond({ success: true, ma_sp });
    }

    if (path === "/api/stages" && method === "GET")
      return respond({ data: db.stages });
    if (path === "/api/stages" && method === "POST") {
      db.stages.push({
        stage_id: p.stage_id.toUpperCase(),
        line_id: p.line_id.toUpperCase(),
        stage_name: p.stage_name,
        display_order: db.stages.length + 1,
      });
      return respond({ success: true });
    }

    if (path === "/api/lines" && method === "GET")
      return respond({ data: db.lines });
    if (path === "/api/lines" && method === "POST") {
      db.lines.push({
        line_id: p.line_id.toUpperCase(),
        line_name: p.line_name,
        display_order: db.lines.length + 1,
      });
      return respond({ success: true });
    }

    if (path === "/api/machines" && method === "GET")
      return respond({ data: db.machines });
    if (path === "/api/machines" && method === "POST") {
      db.machines.push({
        id: Date.now(),
        machine_code: p.machine_code.toUpperCase(),
        machine_name: p.machine_name || "",
        line_id: p.line_id.toUpperCase(),
      });
      return respond({ success: true });
    }

    if (path === "/api/sx/po/create" && method === "POST") {
      const prod = db.products.find((x) => x.ma_sp === p.product_code);
      if (!prod) return bad("Mã SP chưa tồn tại");
      const rMap = JSON.parse(prod.routing_map || "[]");
      const firstStage = rMap[0]?.stage_id || "CAT";
      db.pos.push({
        po_number: p.po_number,
        ma_sp: p.product_code,
        production_date: p.production_date,
        total_qty: Number(p.total_qty),
        status: "OPEN",
      });
      db.sxInventory.push({
        ma_sp: p.product_code,
        lot_number: p.po_number,
        stage_id: firstStage,
        quantity: Number(p.total_qty),
        updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
      });
      return respond({ success: true });
    }

    if (path === "/api/sx/dashboard/matrix" && method === "GET") {
      const lots = [
        ...new Set(
          db.sxInventory.filter((i) => i.quantity > 0).map((i) => i.lot_number),
        ),
      ];
      const matrix = lots.map((lot) => {
        const items = db.sxInventory.filter((i) => i.lot_number === lot);
        const po = db.pos.find((x) => x.po_number === lot) || {};
        const sp =
          db.products.find((x) => x.ma_sp === (items[0]?.ma_sp || po.ma_sp)) ||
          {};
        const row = {
          lot_number: lot,
          product_code: sp.ma_sp || items[0]?.ma_sp,
          product_name: sp.ten_sp || "",
          production_date: po.production_date || "2026-10-25",
          total_qty: items.reduce((s, i) => s + Number(i.quantity), 0),
          qty_done: items
            .filter((i) => i.stage_id === "THANH_PHAM")
            .reduce((s, i) => s + Number(i.quantity), 0),
        };
        db.stages.forEach((st) => {
          const key = st.stage_id.toLowerCase();
          const goodItem = items.find(
            (i) =>
              String(i.stage_id).toUpperCase() ===
              String(st.stage_id).toUpperCase(),
          );
          const ngItem = items.find(
            (i) =>
              String(i.stage_id).toUpperCase() ===
              `${String(st.stage_id).toUpperCase()}_NG`,
          );
          row[`qty_${key}`] = goodItem ? goodItem.quantity : 0;
          row[`ng_${key}`] = ngItem ? ngItem.quantity : 0;
          row[`date_${key}`] = goodItem ? goodItem.updated_at : null;
        });
        return row;
      });

      const allocations = db.machineAllocations.map((ma) => {
        const m = db.machines.find((x) => x.id === Number(ma.machine_id)) || {};
        const sp = db.products.find((x) => x.ma_sp === ma.ma_sp) || {};
        return {
          ...ma,
          machine_code: m.machine_code,
          machine_name: m.machine_name,
          line_id: m.line_id,
          ten_sp: sp.ten_sp,
        };
      });
      return respond({ matrix, allocations });
    }

    if (path === "/api/sx/leader/pending" && method === "GET") {
      const lineId = (u.searchParams.get("line_id") || "").toUpperCase();
      const validStages = db.stages
        .filter((s) => s.line_id === lineId)
        .map((s) => s.stage_id.toUpperCase());
      const rows = db.sxInventory
        .filter(
          (i) =>
            validStages.includes(String(i.stage_id).toUpperCase()) &&
            i.quantity > 0,
        )
        .map((i) => {
          const sp = db.products.find((pr) => pr.ma_sp === i.ma_sp) || {};
          let to_stage_name = "THANH_PHAM";
          if (sp.routing_map) {
            const rMap = JSON.parse(sp.routing_map);
            const idx = rMap.findIndex(
              (s) =>
                String(s.stage_id).toUpperCase() ===
                String(i.stage_id).toUpperCase(),
            );
            if (idx !== -1 && idx < rMap.length - 1)
              to_stage_name = rMap[idx + 1].stage_id;
          }
          const active_machines = db.machineAllocations
            .filter(
              (a) =>
                a.lot_number === i.lot_number &&
                String(a.stage_id).toUpperCase() ===
                  String(i.stage_id).toUpperCase() &&
                a.status !== "DONE",
            )
            .map((a) => {
              const m =
                db.machines.find((x) => x.id === Number(a.machine_id)) || {};
              return {
                ...a,
                machine_code: m.machine_code,
                machine_name: m.machine_name,
              };
            });
          return {
            po_id: i.lot_number,
            po_number: i.lot_number,
            product_id: i.ma_sp,
            product_code: i.ma_sp,
            ten_sp: sp.ten_sp,
            routing_map: sp.routing_map,
            from_stage: i.stage_id,
            qty_available: i.quantity,
            stage_in_time: i.updated_at,
            to_stage_name,
            active_machines,
            line_has_machines: mockLineHasMachines(lineId),
          };
        });
      return respond({ data: rows });
    }

    if (path === "/api/leader/machine-allocations" && method === "GET") {
      const lot = u.searchParams.get("lot_number");
      const stageId = (u.searchParams.get("stage_id") || "").toUpperCase();
      const data = db.machineAllocations
        .filter(
          (a) =>
            a.lot_number === lot &&
            (!stageId || String(a.stage_id).toUpperCase() === stageId),
        )
        .map((a) => {
          const m =
            db.machines.find((x) => x.id === Number(a.machine_id)) || {};
          const sp = db.products.find((x) => x.ma_sp === a.ma_sp) || {};
          return {
            ...a,
            machine_code: m.machine_code,
            machine_name: m.machine_name,
            ten_sp: sp.ten_sp,
          };
        });
      return respond({ data });
    }

    if (path === "/api/machine-allocations" && method === "POST") {
      const stageUp = String(p.stage_id || "").toUpperCase();
      const qty = Number(p.qty);
      if (!p.lot_number || !stageUp || !p.machine_id || !(qty > 0))
        return bad("Thiếu LOT, công đoạn, máy hoặc số lượng không hợp lệ.");
      const invAt = db.sxInventory.find(
        (i) =>
          i.lot_number === p.lot_number &&
          String(i.stage_id).toUpperCase() === stageUp,
      );
      const allocatedAt = mockRunningAllocs(p.lot_number, stageUp).reduce(
        (s, a) => s + Number(a.qty || 0),
        0,
      );
      const remainingAt = Number(invAt?.quantity || 0) - allocatedAt;
      if (qty > remainingAt)
        return bad(
          `Số lượng phân bổ (${qty}) vượt quá phần tồn chưa phân máy (${remainingAt}).`,
        );
      db.machineAllocations.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        lot_number: p.lot_number,
        ma_sp: p.ma_sp,
        stage_id: p.stage_id,
        machine_id: Number(p.machine_id),
        qty: Number(p.qty),
        input_date:
          p.input_date ||
          new Date().toISOString().slice(0, 16).replace("T", " "),
        output_date: p.output_date || null,
        status: "RUNNING",
        created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
      });
      return respond({ success: true });
    }

    if (path === "/api/sx/move" && method === "POST") {
      const inv = db.sxInventory.find(
        (i) =>
          i.lot_number === p.lot_number &&
          String(i.stage_id).toUpperCase() ===
            String(p.from_stage).toUpperCase(),
      );
      const qPass = Number(p.qty_pass || 0);
      const qNg = Number(p.qty_ng || 0);
      const total = qPass + qNg;
      if (!inv || inv.quantity < total) return bad("Số lượng tồn không đủ!");

      // Bắt buộc phân bổ máy trước khi giao (trừ khi Line không có máy nào)
      const fromStageUp = String(p.from_stage).toUpperCase();
      const stageLine = (
        db.stages.find((s) => String(s.stage_id).toUpperCase() === fromStageUp) ||
        {}
      ).line_id;
      const lineHasMachines = mockLineHasMachines(stageLine);
      const runningAllocs = lineHasMachines
        ? mockRunningAllocs(p.lot_number, fromStageUp).sort(
            (a, b) =>
              String(a.input_date || "").localeCompare(String(b.input_date || "")) ||
              a.id - b.id,
          )
        : [];
      if (lineHasMachines) {
        const allocatedTotal = runningAllocs.reduce(
          (s, a) => s + Number(a.qty || 0),
          0,
        );
        if (allocatedTotal <= 0)
          return bad(
            "LOT này chưa được phân bổ máy tại công đoạn hiện tại. Vui lòng Chia Xuống Máy trước khi giao.",
          );
        if (total > allocatedTotal)
          return bad(
            `Số lượng thao tác (${total}) vượt quá số lượng đang chạy trên máy (${allocatedTotal}). Vui lòng phân bổ thêm máy.`,
          );
      }
      inv.quantity -= total;

      const sp = db.products.find((x) => x.ma_sp === inv.ma_sp) || {};
      let nextStage = "THANH_PHAM";
      if (sp.routing_map) {
        const rMap = JSON.parse(sp.routing_map);
        const idx = rMap.findIndex(
          (s) =>
            String(s.stage_id).toUpperCase() ===
            String(p.from_stage).toUpperCase(),
        );
        if (idx !== -1 && idx < rMap.length - 1)
          nextStage = rMap[idx + 1].stage_id;
      }

      const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");
      // Tự trừ SL trên các máy theo thứ tự nhận hàng trước (FIFO) và chốt giờ hoàn thành
      let machineNote = "";
      let left = total;
      const usedMachines = [];
      for (const alloc of runningAllocs) {
        if (left <= 0) break;
        const take = Math.min(left, Number(alloc.qty || 0));
        if (take <= 0) continue;
        left -= take;
        const m =
          db.machines.find((x) => x.id === Number(alloc.machine_id)) || {};
        if (m.machine_code && !usedMachines.includes(m.machine_code))
          usedMachines.push(m.machine_code);
        if (take >= Number(alloc.qty)) {
          alloc.status = "DONE";
          alloc.output_date = nowStr;
        } else {
          alloc.qty -= take;
          db.machineAllocations.unshift({
            ...alloc,
            id: Date.now() + Math.floor(Math.random() * 1000),
            qty: take,
            output_date: nowStr,
            status: "DONE",
            note: "Hoàn thành 1 phần",
          });
        }
      }
      if (usedMachines.length > 0)
        machineNote = ` [Máy ${usedMachines.join(", ")}]`;

      // Khi giao hết SL của LOT tại công đoạn này -> tự động chốt hoàn thành (DONE) tất cả máy của LOT ở khâu này
      if (inv.quantity <= 0) {
        db.machineAllocations.forEach((a) => {
          if (
            a.lot_number === p.lot_number &&
            String(a.stage_id).toUpperCase() ===
              String(p.from_stage).toUpperCase() &&
            a.status !== "DONE"
          ) {
            a.status = "DONE";
            a.output_date = nowStr;
          }
        });
      }

      if (qPass > 0) {
        const target = db.sxInventory.find(
          (i) =>
            i.lot_number === p.lot_number &&
            String(i.stage_id).toUpperCase() ===
              String(nextStage).toUpperCase(),
        );
        if (target) target.quantity += qPass;
        else
          db.sxInventory.push({
            ma_sp: inv.ma_sp,
            lot_number: p.lot_number,
            stage_id: nextStage,
            quantity: qPass,
            updated_at: nowStr,
          });
        db.sxHistory.unshift({
          timestamp: nowStr + ":00",
          user_id: p.user_id,
          lot_number: p.lot_number,
          from_stage: p.from_stage + machineNote,
          to_stage: nextStage,
          qty: qPass,
          type: "PASS",
        });
      }
      if (qNg > 0) {
        const ngStage = `${p.from_stage}_NG`;
        const targetNg = db.sxInventory.find(
          (i) =>
            i.lot_number === p.lot_number &&
            String(i.stage_id).toUpperCase() === ngStage.toUpperCase(),
        );
        if (targetNg) targetNg.quantity += qNg;
        else
          db.sxInventory.push({
            ma_sp: inv.ma_sp,
            lot_number: p.lot_number,
            stage_id: ngStage,
            quantity: qNg,
            updated_at: nowStr,
          });
        db.sxHistory.unshift({
          timestamp: nowStr + ":00",
          user_id: p.user_id,
          lot_number: p.lot_number,
          from_stage: p.from_stage + machineNote,
          to_stage: "KHO_NG",
          qty: qNg,
          type: "NG",
        });
      }
      return respond({ success: true });
    }

    if (path === "/api/sx/ng/list" && method === "GET") {
      const ngList = db.sxInventory
        .filter(
          (i) =>
            String(i.stage_id).toUpperCase().endsWith("_NG") && i.quantity > 0,
        )
        .map((i) => {
          const sp = db.products.find((x) => x.ma_sp === i.ma_sp) || {};
          return {
            lot_number: i.lot_number,
            product_code: i.ma_sp,
            product_name: sp.ten_sp,
            from_stage: String(i.stage_id).replace(/_NG$/i, ""),
            ng_qty: i.quantity,
          };
        });
      return respond({ data: ngList });
    }

    if (path === "/api/sx/ng/resolve" && method === "POST") {
      const ngStage = `${p.from_stage}_NG`;
      const ngItem = db.sxInventory.find(
        (i) =>
          i.lot_number === p.lot_number &&
          String(i.stage_id).toUpperCase() === ngStage.toUpperCase(),
      );
      const qty = Number(p.qty || 0);
      if (!ngItem || ngItem.quantity < qty)
        return bad("Số lượng NG không đủ để xử lý!");
      ngItem.quantity -= qty;

      const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");
      if (p.action === "REWORK" && p.return_stage) {
        const target = db.sxInventory.find(
          (i) =>
            i.lot_number === p.lot_number &&
            String(i.stage_id).toUpperCase() ===
              String(p.return_stage).toUpperCase(),
        );
        if (target) target.quantity += qty;
        else
          db.sxInventory.push({
            ma_sp: ngItem.ma_sp,
            lot_number: p.lot_number,
            stage_id: p.return_stage,
            quantity: qty,
            updated_at: nowStr,
          });
      }
      db.sxHistory.unshift({
        timestamp: nowStr + ":00",
        user_id: p.user_id,
        lot_number: p.lot_number,
        from_stage: ngStage,
        to_stage: p.action === "REWORK" ? p.return_stage : "SCRAP (Báo hủy)",
        qty,
        type: "NG",
      });
      return respond({ success: true });
    }

    if (path === "/api/sx/history" && method === "GET") {
      const data = db.sxHistory.map((h) => {
        const po = db.pos.find((x) => x.po_number === h.lot_number) || {};
        const sp = db.products.find((x) => x.ma_sp === po.ma_sp) || {};
        const u = db.users.find((x) => x.ma_nv === h.user_id) || {};
        return {
          ...h,
          po_id: h.lot_number,
          username: h.user_id,
          ten_nv: u.ten_nv,
          product_code: sp.ma_sp || "SP001",
          product_name: sp.ten_sp || "",
        };
      });
      return respond({ data });
    }

    return respond({ success: true });
  };
}
