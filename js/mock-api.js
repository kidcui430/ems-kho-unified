// ============================================================
// CHẾ ĐỘ MOCK: giả lập toàn bộ worker.js bằng dữ liệu trong bộ nhớ,
// để test app mà chưa cần deploy Cloudflare Worker/D1 thật.
// Chỉ bật khi URL có ?mock=1 (xem index.html) - không ảnh hưởng gì
// khi chạy thật với backend thật.
// ============================================================

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
function uuidLike() {
  return Math.random().toString(36).slice(2, 10);
}

// ---- Dữ liệu seed, khớp với schema_unified.sql ----
const db = {
  nguoiDung: [
    { ma_nv: "ADMIN", ten_nv: "Quản trị viên hệ thống", password: "123", role: "ADMIN", he_thong: "ALL", bo_phan: "VP", line_id: null, must_change_password: 0 },
    { ma_nv: "VP01", ten_nv: "Nhân viên Kho VP", password: "123", role: "USER", he_thong: "KHO", bo_phan: "VP", line_id: null, must_change_password: 0 },
    { ma_nv: "XUONG01", ten_nv: "Tổ sản xuất 01", password: "123", role: "USER", he_thong: "KHO", bo_phan: "XUONG", line_id: null, must_change_password: 0 },
    { ma_nv: "LEADER_NC", ten_nv: "Tổ trưởng chuyền NC", password: "123", role: "LEADER", he_thong: "SX", bo_phan: null, line_id: "NC", must_change_password: 0 },
  ],
  nhaCungCap: [
    { ma_ncc: "NCC001", ten_ncc: "Nhà cung cấp Thép Việt Nhật", dia_chi: "TP.HCM", so_dt: "0901234567", nguoi_lien_he: "Nguyễn Văn A", email: "vietnhat@supplier.com", ghi_chu: "", active: 1 },
    { ma_ncc: "NCC002", ten_ncc: "Công ty Hóa Chất Minh Trí", dia_chi: "Bình Dương", so_dt: "0908765432", nguoi_lien_he: "Trần Thị B", email: "minhtri@supplier.com", ghi_chu: "", active: 1 },
  ],
  danhMucNvl: [
    { ma_hang: "NVL001", phan_loai: "Hóa Chất", ten_hang: "Dung dịch tẩy rửa công nghiệp", quy_cach: "Can 20L", don_vi_tinh: "Lít", ma_ncc: "NCC002", trang_thai: "ACTIVE", ghi_chu: "Bảo quản nơi thoáng mát", he_so_kg_m: 0, chieu_dai_chuan_m: 0, ma_goc: "" },
    { ma_hang: "NVL002", phan_loai: "Bao Bì", ten_hang: "Thùng carton 5 lớp", quy_cach: "500x400x300 mm", don_vi_tinh: "Cái", ma_ncc: "NCC001", trang_thai: "ACTIVE", ghi_chu: "", he_so_kg_m: 0, chieu_dai_chuan_m: 0, ma_goc: "" },
    { ma_hang: "NVL003", phan_loai: "Kim Loại", ten_hang: "Thép tròn đặc C45", quy_cach: "Ø20 mm x 6m", don_vi_tinh: "Cây", ma_ncc: "NCC001", trang_thai: "ACTIVE", ghi_chu: "Quy đổi chuẩn: 2.47 Kg/m, cây dài 6m", he_so_kg_m: 2.47, chieu_dai_chuan_m: 6, ma_goc: "" },
    { ma_hang: "NVL004", phan_loai: "Phế Liệu", ten_hang: "Phế liệu thép cắt", quy_cach: "Đầu/đuôi dư khi cắt thép cây các loại", don_vi_tinh: "Kg", ma_ncc: "NCC001", trang_thai: "ACTIVE", ghi_chu: "Mã dùng chung cho mọi loại thép cây", he_so_kg_m: 0, chieu_dai_chuan_m: 0, ma_goc: "" },
  ],
  sanPham: [
    { ma_sp: "SP001", ten_sp: "Trục dẫn hướng máy CNC", quy_cach: "Ø20 x 500mm, tôi cao tần", don_vi_tinh: "Cái", routing_map: JSON.stringify([{ order: 1, stage_id: "CAT" }, { order: 2, stage_id: "NHIET_LUYEN" }, { order: 3, stage_id: "NC1" }, { order: 4, stage_id: "KIEM_TRA" }]), ghi_chu: "Mã bản vẽ: DWG-SP01", active: 1 },
    { ma_sp: "SP002", ten_sp: "Bạc đạn trượt tuyến tính", quy_cach: "Size 30mm", don_vi_tinh: "Bộ", routing_map: null, ghi_chu: "Gia công chính xác, chỉ theo dõi BOM kho", active: 1 },
  ],
  dinhMucBom: [
    { id: 1, ma_sp: "SP001", ma_hang: "NVL003", dinh_muc: 0.1, ghi_chu: "Khoảng 0.1 cây mỗi SP (tham khảo)" },
    { id: 2, ma_sp: "SP001", ma_hang: "NVL001", dinh_muc: 0.1, ghi_chu: "Hóa chất tẩy rửa sau gia công" },
    { id: 3, ma_sp: "SP001", ma_hang: "NVL002", dinh_muc: 0.05, ghi_chu: "Đóng thùng 20 cái/thùng" },
  ],
  dinhMucCat: [{ id: 1, ma_sp: "SP001", ma_hang: "NVL003", so_con_moi_cay: 11, ghi_chu: "Trục dài 500mm, cắt từ cây 6m, đã trừ hao hụt lưỡi cưa" }],
  giaoDichNvl: [
    { id: 1, ma_hang: "NVL001", loai_giao_dich: "OPENING", so_luong: 500, delta_kho: 500, delta_xuong: 0, trang_thai: "approved", nguoi_giao_dich: "ADMIN", ma_sp_sx: "", ma_ncc: "", so_chung_tu: "", quy_cach_gd: "", khoi_luong_kg: 0, don_gia: 0, ghi_chu: "Tồn đầu kỳ ban đầu", thoi_gian_gd: nowStr() },
    { id: 2, ma_hang: "NVL002", loai_giao_dich: "OPENING", so_luong: 1200, delta_kho: 1000, delta_xuong: 200, trang_thai: "approved", nguoi_giao_dich: "ADMIN", ma_sp_sx: "", ma_ncc: "", so_chung_tu: "", quy_cach_gd: "", khoi_luong_kg: 0, don_gia: 0, ghi_chu: "Tồn đầu kỳ ban đầu", thoi_gian_gd: nowStr() },
    { id: 3, ma_hang: "NVL003", loai_giao_dich: "OPENING", so_luong: 60, delta_kho: 50, delta_xuong: 10, trang_thai: "approved", nguoi_giao_dich: "ADMIN", ma_sp_sx: "", ma_ncc: "", so_chung_tu: "", quy_cach_gd: "", khoi_luong_kg: 0, don_gia: 0, ghi_chu: "Tồn đầu kỳ ban đầu (cây)", thoi_gian_gd: nowStr() },
  ],
  lines: [
    { line_id: "CUTTING", line_name: "Cắt", display_order: 1 }, { line_id: "NC", line_name: "NC", display_order: 2 }, { line_id: "MNC", line_name: "MNC", display_order: 3 },
    { line_id: "GS_GV", line_name: "GS-GV", display_order: 4 }, { line_id: "GP_GE_GI", line_name: "GP-GE-GI", display_order: 5 }, { line_id: "ASSY", line_name: "Lắp ráp", display_order: 6 }, { line_id: "KENSA", line_name: "Kiểm tra", display_order: 7 },
  ],
  stages: [
    { stage_id: "CAT", line_id: "CUTTING", stage_name: "Cắt", display_order: 1 }, { stage_id: "NHIET_LUYEN", line_id: "CUTTING", stage_name: "Nhiệt luyện", display_order: 2 }, { stage_id: "DO_CUNG", line_id: "CUTTING", stage_name: "Độ cứng", display_order: 3 },
    { stage_id: "NC1", line_id: "NC", stage_name: "NC1", display_order: 4 }, { stage_id: "NC2", line_id: "NC", stage_name: "NC2", display_order: 5 }, { stage_id: "NC3", line_id: "NC", stage_name: "NC3", display_order: 6 },
    { stage_id: "MNC1", line_id: "MNC", stage_name: "MNC1", display_order: 7 }, { stage_id: "MNC2", line_id: "MNC", stage_name: "MNC2", display_order: 8 }, { stage_id: "MNC3", line_id: "MNC", stage_name: "MNC3", display_order: 9 },
    { stage_id: "GS", line_id: "GS_GV", stage_name: "GS", display_order: 10 }, { stage_id: "GV", line_id: "GS_GV", stage_name: "GV", display_order: 11 },
    { stage_id: "GP", line_id: "GP_GE_GI", stage_name: "GP", display_order: 12 }, { stage_id: "GE", line_id: "GP_GE_GI", stage_name: "GE", display_order: 13 }, { stage_id: "GI", line_id: "GP_GE_GI", stage_name: "GI", display_order: 14 },
    { stage_id: "LAP_RAP", line_id: "ASSY", stage_name: "Lắp ráp", display_order: 15 }, { stage_id: "DONG_THUNG", line_id: "ASSY", stage_name: "Đóng thùng", display_order: 16 }, { stage_id: "XUAT_GCN", line_id: "ASSY", stage_name: "Đi GCN", display_order: 17 }, { stage_id: "NHAN_GCN", line_id: "ASSY", stage_name: "Nhận GCN", display_order: 18 },
    { stage_id: "KIEM_TRA", line_id: "KENSA", stage_name: "Kiểm tra", display_order: 19 },
  ],
  machines: [
    { id: 1, machine_code: "NC-M01", machine_name: "Máy NC số 1", line_id: "NC" },
    { id: 2, machine_code: "NC-M02", machine_name: "Máy NC số 2", line_id: "NC" },
    { id: 3, machine_code: "MNC-M01", machine_name: "Máy MNC số 1", line_id: "MNC" },
  ],
  machineAllocations: [],
  productionOrders: [{ po_number: "PO2610-01", ma_sp: "SP001", production_date: nowStr().slice(0, 10), total_qty: 100, status: "OPEN" }],
  inventory: [{ ma_sp: "SP001", lot_number: "PO2610-01", stage_id: "CAT", quantity: 100, updated_at: nowStr() }],
  transactionsLog: [],
};
let nextGdId = 4;
let nextMachineAllocId = 1;

function tonNvl(maHang) {
  let ton_kho = 0, ton_xuong = 0;
  db.giaoDichNvl.forEach((g) => {
    if (g.ma_hang === maHang && g.trang_thai === "approved") {
      ton_kho += g.delta_kho;
      ton_xuong += g.delta_xuong;
    }
  });
  return { ton_kho, ton_xuong };
}

function movementFor(type, qty) {
  const q = Number(qty);
  const map = {
    NHAP_KHO: { dk: q, dx: 0 }, XUAT_XUONG: { dk: -q, dx: q }, XUAT_SAN_XUAT: { dk: -q, dx: q },
    TRA_KHO: { dk: q, dx: -q }, HOAN_TRA_XUONG: { dk: q, dx: -q }, HUY_KHO: { dk: -q, dx: 0 }, HUY_XUONG: { dk: 0, dx: -q },
  };
  return map[type] || null;
}

function jsonRes(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "Content-Type": "application/json" } });
}
function badRes(message, status) {
  return jsonRes({ error: message }, status || 400);
}

async function readBody(opts) {
  try {
    return JSON.parse(opts.body || "{}");
  } catch (e) {
    return {};
  }
}

export async function mockFetch(url, opts) {
  const u = new URL(url);
  const path = u.pathname;
  const method = (opts && opts.method) || "GET";

  // ---- DÙNG CHUNG ----
  if (path === "/api/login" && method === "POST") {
    const p = await readBody(opts);
    const maNv = String(p.ma_nv || "").toUpperCase().trim();
    const user = db.nguoiDung.find((x) => x.ma_nv === maNv && x.password === String(p.password || ""));
    if (!user) return badRes("Sai tài khoản hoặc mật khẩu.", 401);
    return jsonRes({ ma_nv: user.ma_nv, ten_nv: user.ten_nv, role: user.role, he_thong: user.he_thong, bo_phan: user.bo_phan, line_id: user.line_id, must_change_password: Boolean(user.must_change_password) });
  }
  if (path === "/api/change-password" && method === "POST") {
    const p = await readBody(opts);
    const user = db.nguoiDung.find((x) => x.ma_nv === String(p.ma_nv || "").toUpperCase());
    if (user) {
      user.password = p.new_password;
      user.must_change_password = 0;
    }
    return jsonRes({ success: true });
  }

  if (path === "/api/lines" && method === "GET") return jsonRes({ data: db.lines });
  if (path === "/api/lines" && method === "POST") {
    const p = await readBody(opts);
    const lineId = String(p.line_id || "").toUpperCase();
    if (db.lines.find((l) => l.line_id === lineId)) return badRes(`Mã Line '${lineId}' đã tồn tại.`);
    db.lines.push({ line_id: lineId, line_name: p.line_name, display_order: db.lines.length + 1 });
    return jsonRes({ success: true, line_id: lineId });
  }

  if (path === "/api/stages" && method === "GET") return jsonRes({ data: db.stages.map((s) => ({ ...s, id: s.stage_id })) });
  if (path === "/api/stages" && method === "POST") {
    const p = await readBody(opts);
    const stageId = String(p.stage_id || "").toUpperCase();
    if (db.stages.find((s) => s.stage_id === stageId)) return badRes(`Mã công đoạn '${stageId}' đã tồn tại.`);
    db.stages.push({ stage_id: stageId, line_id: String(p.line_id || "").toUpperCase(), stage_name: p.stage_name, display_order: db.stages.length + 1 });
    return jsonRes({ success: true, stage_id: stageId });
  }

  if (path === "/api/machines" && method === "GET") {
    const lineId = u.searchParams.get("line_id");
    const list = lineId ? db.machines.filter((m) => m.line_id === lineId) : db.machines;
    return jsonRes({ data: list });
  }
  if (path === "/api/machines" && method === "POST") {
    const p = await readBody(opts);
    const code = String(p.machine_code || "").toUpperCase();
    if (db.machines.find((m) => m.machine_code === code)) return badRes(`Mã máy '${code}' đã tồn tại.`);
    db.machines.push({ id: db.machines.length + 1, machine_code: code, machine_name: p.machine_name, line_id: String(p.line_id || "").toUpperCase() });
    return jsonRes({ success: true });
  }

  if (path === "/api/machine-allocations" && method === "POST") {
    const p = await readBody(opts);
    const stageId = String(p.stage_id || "").toUpperCase();
    const inv = db.inventory.find((i) => i.lot_number === p.lot_number && i.stage_id.toUpperCase() === stageId);
    const available = inv ? inv.quantity : 0;
    const allocated = db.machineAllocations.filter((a) => a.lot_number === p.lot_number && a.stage_id === stageId).reduce((s, a) => s + a.qty, 0);
    if (Number(p.qty) > available - allocated) return badRes(`Số lượng phân bổ vượt phần còn lại chưa phân bổ (${available - allocated}).`);
    const machine = db.machines.find((m) => m.id === Number(p.machine_id));
    db.machineAllocations.push({ id: nextMachineAllocId++, lot_number: p.lot_number, stage_id: stageId, machine_id: Number(p.machine_id), machine_code: machine ? machine.machine_code : "", qty: Number(p.qty), input_date: p.input_date, output_date: p.output_date, status: "PLANNED" });
    return jsonRes({ success: true });
  }
  if (path === "/api/leader/machine-allocations" && method === "GET") {
    const lot = u.searchParams.get("lot_number");
    const stageId = (u.searchParams.get("stage_id") || "").toUpperCase();
    const list = db.machineAllocations.filter((a) => a.lot_number === lot && (!stageId || a.stage_id === stageId));
    return jsonRes({ data: list });
  }

  if (path === "/api/products" && method === "GET") return jsonRes({ products: db.sanPham.filter((p) => p.active) });
  if (path === "/api/products" && method === "POST") {
    const p = await readBody(opts);
    let maSp = (p.ma_sp || "").toUpperCase();
    if (!maSp) {
      const nums = db.sanPham.filter((x) => /^SP\d+$/.test(x.ma_sp)).map((x) => Number(x.ma_sp.slice(2)));
      maSp = "SP" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
    }
    if (db.sanPham.find((x) => x.ma_sp === maSp)) return badRes(`Mã sản phẩm '${maSp}' đã tồn tại.`);
    db.sanPham.push({ ma_sp: maSp, ten_sp: p.ten_sp, quy_cach: p.quy_cach || "", don_vi_tinh: p.don_vi_tinh || "Cái", routing_map: Array.isArray(p.routing_map) && p.routing_map.length ? JSON.stringify(p.routing_map) : null, ghi_chu: p.ghi_chu || "", active: 1 });
    return jsonRes({ success: true, ma_sp: maSp });
  }
  if (path === "/api/products/edit" && method === "POST") {
    const p = await readBody(opts);
    const sp = db.sanPham.find((x) => x.ma_sp === p.ma_sp);
    if (sp) {
      sp.ten_sp = p.ten_sp;
      sp.quy_cach = p.quy_cach || "";
      sp.don_vi_tinh = p.don_vi_tinh || "Cái";
      sp.ghi_chu = p.ghi_chu || "";
      if (Object.prototype.hasOwnProperty.call(p, "routing_map")) sp.routing_map = Array.isArray(p.routing_map) && p.routing_map.length ? JSON.stringify(p.routing_map) : null;
    }
    return jsonRes({ success: true });
  }
  if (path === "/api/products/delete" && method === "POST") {
    const p = await readBody(opts);
    const sp = db.sanPham.find((x) => x.ma_sp === p.ma_sp);
    if (sp) sp.active = 0;
    return jsonRes({ success: true, mode: "deactivated", message: "Đã ẩn mã hàng (mock)." });
  }

  // ---- KHO NVL ----
  if (path === "/api/kho/bootstrap" && method === "GET") {
    const items = db.danhMucNvl
      .filter((d) => d.trang_thai !== "INACTIVE")
      .map((d) => {
        const ton = tonNvl(d.ma_hang);
        const tong_nhap = db.giaoDichNvl.filter((g) => g.ma_hang === d.ma_hang && g.trang_thai === "approved" && g.loai_giao_dich === "NHAP_KHO").reduce((s, g) => s + g.so_luong, 0);
        const tong_xuat_sx = db.giaoDichNvl.filter((g) => g.ma_hang === d.ma_hang && g.trang_thai === "approved" && ["XUAT_SAN_XUAT", "XUAT_XUONG"].includes(g.loai_giao_dich)).reduce((s, g) => s + g.so_luong, 0);
        return { ...d, ...ton, tong_nhap, tong_xuat_sx };
      });
    const boms = db.dinhMucBom.map((b) => {
      const d = db.danhMucNvl.find((x) => x.ma_hang === b.ma_hang);
      return { ...b, ten_hang: d?.ten_hang, phan_loai: d?.phan_loai, quy_cach: d?.quy_cach, don_vi_tinh: d?.don_vi_tinh };
    });
    const cutRatios = db.dinhMucCat.map((c) => {
      const d = db.danhMucNvl.find((x) => x.ma_hang === c.ma_hang);
      return { ...c, ten_hang: d?.ten_hang, chieu_dai_chuan_m: d?.chieu_dai_chuan_m, he_so_kg_m: d?.he_so_kg_m };
    });
    return jsonRes({ items, nccs: db.nhaCungCap.filter((n) => n.active), products: db.sanPham.filter((p) => p.active), boms, cutRatios });
  }

  if (path === "/api/kho/items" && method === "POST") {
    const p = await readBody(opts);
    const nums = db.danhMucNvl.filter((x) => /^NVL\d+$/.test(x.ma_hang)).map((x) => Number(x.ma_hang.slice(3)));
    const maHang = "NVL" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
    db.danhMucNvl.push({ ma_hang: maHang, phan_loai: p.phan_loai, ten_hang: p.ten_hang, quy_cach: p.quy_cach || "", don_vi_tinh: p.don_vi_tinh, ma_ncc: p.ma_ncc || "", trang_thai: "ACTIVE", ghi_chu: p.ghi_chu || "", he_so_kg_m: Number(p.he_so_kg_m || 0), chieu_dai_chuan_m: Number(p.chieu_dai_chuan_m || 0), ma_goc: p.ma_goc || "" });
    return jsonRes({ success: true, ma_hang: maHang });
  }
  if (path === "/api/kho/items/edit" && method === "POST") {
    const p = await readBody(opts);
    const item = db.danhMucNvl.find((x) => x.ma_hang === p.ma_hang);
    if (item) Object.assign(item, { phan_loai: p.phan_loai, ten_hang: p.ten_hang, quy_cach: p.quy_cach || "", don_vi_tinh: p.don_vi_tinh, ma_ncc: p.ma_ncc || "", ghi_chu: p.ghi_chu || "", he_so_kg_m: Number(p.he_so_kg_m || 0), chieu_dai_chuan_m: Number(p.chieu_dai_chuan_m || 0), ma_goc: p.ma_goc || "" });
    return jsonRes({ success: true });
  }
  if (path === "/api/kho/items/delete" && method === "POST") {
    const p = await readBody(opts);
    const hasTx = db.giaoDichNvl.some((g) => g.ma_hang === p.ma_hang);
    const item = db.danhMucNvl.find((x) => x.ma_hang === p.ma_hang);
    if (hasTx) {
      if (item) item.trang_thai = "INACTIVE";
      return jsonRes({ success: true, mode: "deactivated", message: "NVL đã có lịch sử nên chuyển sang trạng thái Ẩn." });
    }
    db.danhMucNvl = db.danhMucNvl.filter((x) => x.ma_hang !== p.ma_hang);
    return jsonRes({ success: true, mode: "deleted", message: "Đã xóa hoàn toàn NVL." });
  }

  if (path === "/api/kho/suppliers" && method === "POST") {
    const p = await readBody(opts);
    const nums = db.nhaCungCap.filter((x) => /^NCC\d+$/.test(x.ma_ncc)).map((x) => Number(x.ma_ncc.slice(3)));
    const maNcc = "NCC" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
    db.nhaCungCap.push({ ma_ncc: maNcc, ten_ncc: p.ten_ncc, dia_chi: p.dia_chi || "", so_dt: p.so_dt || "", nguoi_lien_he: p.nguoi_lien_he || "", email: p.email || "", ghi_chu: p.ghi_chu || "", active: 1 });
    return jsonRes({ success: true, ma_ncc: maNcc });
  }
  if (path === "/api/kho/suppliers/edit" && method === "POST") {
    const p = await readBody(opts);
    const n = db.nhaCungCap.find((x) => x.ma_ncc === p.ma_ncc);
    if (n) Object.assign(n, { ten_ncc: p.ten_ncc, dia_chi: p.dia_chi || "", so_dt: p.so_dt || "", nguoi_lien_he: p.nguoi_lien_he || "", email: p.email || "", ghi_chu: p.ghi_chu || "" });
    return jsonRes({ success: true });
  }
  if (path === "/api/kho/suppliers/delete" && method === "POST") {
    const p = await readBody(opts);
    const n = db.nhaCungCap.find((x) => x.ma_ncc === p.ma_ncc);
    if (n) n.active = 0;
    return jsonRes({ success: true, mode: "deactivated", message: "Đã ẩn NCC (mock)." });
  }

  if (path === "/api/kho/bom/save" && method === "POST") {
    const p = await readBody(opts);
    const exist = db.dinhMucBom.find((b) => b.ma_sp === p.ma_sp && b.ma_hang === p.ma_hang);
    if (exist) Object.assign(exist, { dinh_muc: Number(p.dinh_muc || 0), ghi_chu: p.ghi_chu || "" });
    else db.dinhMucBom.push({ id: db.dinhMucBom.length + 1, ma_sp: p.ma_sp, ma_hang: p.ma_hang, dinh_muc: Number(p.dinh_muc || 0), ghi_chu: p.ghi_chu || "" });
    return jsonRes({ success: true });
  }
  if (path === "/api/kho/bom/delete" && method === "POST") {
    const p = await readBody(opts);
    db.dinhMucBom = db.dinhMucBom.filter((b) => !(b.ma_sp === p.ma_sp && b.ma_hang === p.ma_hang));
    return jsonRes({ success: true });
  }

  if (path === "/api/kho/cat-ratio/save" && method === "POST") {
    const p = await readBody(opts);
    const exist = db.dinhMucCat.find((c) => c.ma_sp === p.ma_sp && c.ma_hang === p.ma_hang);
    if (exist) Object.assign(exist, { so_con_moi_cay: Number(p.so_con_moi_cay || 0), ghi_chu: p.ghi_chu || "" });
    else db.dinhMucCat.push({ id: db.dinhMucCat.length + 1, ma_sp: p.ma_sp, ma_hang: p.ma_hang, so_con_moi_cay: Number(p.so_con_moi_cay || 0), ghi_chu: p.ghi_chu || "" });
    return jsonRes({ success: true });
  }
  if (path === "/api/kho/cat-ratio/delete" && method === "POST") {
    const p = await readBody(opts);
    db.dinhMucCat = db.dinhMucCat.filter((c) => !(c.ma_sp === p.ma_sp && c.ma_hang === p.ma_hang));
    return jsonRes({ success: true });
  }

  if (path === "/api/kho/transactions" && method === "POST") {
    const p = await readBody(opts);
    for (const item of p.transactions || []) {
      const mv = movementFor(item.loai_giao_dich, item.so_luong);
      if (!mv) return badRes("Loại giao dịch không hợp lệ.");
      const ton = tonNvl(item.ma_hang);
      if (ton.ton_kho + mv.dk < -1e-9) return badRes(`${item.ma_hang}: Tồn kho không đủ cho giao dịch này.`);
      if (ton.ton_xuong + mv.dx < -1e-9) return badRes(`${item.ma_hang}: Tồn tại xưởng không đủ cho giao dịch này.`);
      db.giaoDichNvl.push({
        id: nextGdId++, ma_hang: item.ma_hang, loai_giao_dich: item.loai_giao_dich, so_luong: Number(item.so_luong),
        delta_kho: mv.dk, delta_xuong: mv.dx, trang_thai: "approved", nguoi_giao_dich: p.user_id,
        ma_sp_sx: item.ma_sp_sx || "", ma_ncc: item.ma_ncc || "", so_chung_tu: item.so_chung_tu || "",
        quy_cach_gd: item.quy_cach_gd || "", khoi_luong_kg: Number(item.khoi_luong_kg || 0), sl_phu: Number(item.sl_phu || 0), dvt_phu: item.dvt_phu || "",
        don_gia: Number(item.don_gia || 0), ghi_chu: item.ghi_chu || "", thoi_gian_gd: p.tx_date + " " + nowStr().slice(11),
      });
    }
    return jsonRes({ success: true, status: "approved", count: (p.transactions || []).length });
  }

  if (path === "/api/kho/history" && method === "GET") {
    const rows = db.giaoDichNvl
      .slice()
      .reverse()
      .map((g) => {
        const d = db.danhMucNvl.find((x) => x.ma_hang === g.ma_hang);
        const u2 = db.nguoiDung.find((x) => x.ma_nv === g.nguoi_giao_dich);
        const s = db.sanPham.find((x) => x.ma_sp === g.ma_sp_sx);
        const n = db.nhaCungCap.find((x) => x.ma_ncc === g.ma_ncc);
        return { ...g, ten_hang: d?.ten_hang, phan_loai: d?.phan_loai, don_vi_tinh: d?.don_vi_tinh, ten_nv: u2?.ten_nv, bo_phan: u2?.bo_phan, ten_sp: s?.ten_sp, ten_ncc: n?.ten_ncc, loai_hien_thi: labelType(g.loai_giao_dich) };
      });
    return jsonRes({ rows });
  }

  if (path === "/api/kho/report/daily" && method === "GET") {
    const from = u.searchParams.get("from"), to = u.searchParams.get("to");
    const inRange = (g) => g.thoi_gian_gd.slice(0, 10) >= from && g.thoi_gian_gd.slice(0, 10) <= to && g.trang_thai === "approved" && g.loai_giao_dich !== "OPENING";
    const rows = db.danhMucNvl.map((d) => {
      const gs = db.giaoDichNvl.filter((g) => g.ma_hang === d.ma_hang && inRange(g));
      const ton = tonNvl(d.ma_hang);
      return {
        ma_hang: d.ma_hang, ten_hang: d.ten_hang, phan_loai: d.phan_loai, don_vi_tinh: d.don_vi_tinh,
        nhap: gs.filter((g) => g.loai_giao_dich === "NHAP_KHO").reduce((s, g) => s + g.so_luong, 0),
        xuat_sx: gs.filter((g) => ["XUAT_SAN_XUAT", "XUAT_XUONG"].includes(g.loai_giao_dich)).reduce((s, g) => s + g.so_luong, 0),
        tong_kg_nhap: gs.filter((g) => g.loai_giao_dich === "NHAP_KHO").reduce((s, g) => s + g.khoi_luong_kg, 0),
        ton_kho: ton.ton_kho,
      };
    }).filter((r) => r.nhap > 0 || r.xuat_sx > 0);
    return jsonRes({ rows, total: { nhap: rows.reduce((s, r) => s + r.nhap, 0), xuat_sx: rows.reduce((s, r) => s + r.xuat_sx, 0) }, chart_by_product: [], chart_by_category: [] });
  }
  if (path === "/api/kho/report/detail" && method === "GET") {
    const maHang = u.searchParams.get("ma_hang");
    const rows = db.giaoDichNvl.filter((g) => g.ma_hang === maHang && g.loai_giao_dich !== "OPENING").map((g) => ({ ...g, loai_hien_thi: labelType(g.loai_giao_dich) }));
    return jsonRes({ rows });
  }

  // ---- SẢN XUẤT ----
  if (path === "/api/sx/po/create" && method === "POST") {
    const p = await readBody(opts);
    const sp = db.sanPham.find((x) => x.ma_sp === String(p.product_code).toUpperCase());
    if (!sp) return badRes("Mã hàng chưa khai báo.");
    let firstStage = null;
    if (sp.routing_map) {
      const r = JSON.parse(sp.routing_map);
      if (r.length) firstStage = r[0].stage_id.toUpperCase();
    }
    if (!firstStage) return badRes("Mã hàng chưa khai báo lộ trình công đoạn (routing).");
    if (db.productionOrders.find((po) => po.po_number === p.po_number)) return badRes(`Số LOT '${p.po_number}' đã tồn tại.`);
    db.productionOrders.push({ po_number: p.po_number, ma_sp: sp.ma_sp, production_date: p.production_date, total_qty: Number(p.total_qty), status: "OPEN" });
    db.inventory.push({ ma_sp: sp.ma_sp, lot_number: p.po_number, stage_id: firstStage, quantity: Number(p.total_qty), updated_at: nowStr() });
    return jsonRes({ success: true });
  }

  if (path === "/api/sx/move" && method === "POST") {
    const p = await readBody(opts);
    const fromStage = String(p.from_stage || "").toUpperCase();
    const qPass = parseInt(p.qty_pass) || 0, qNG = parseInt(p.qty_ng) || 0;
    const inv = db.inventory.find((i) => i.lot_number === p.lot_number && i.stage_id.toUpperCase() === fromStage);
    if (!inv) return badRes("Không tìm thấy LOT tại công đoạn này.");
    if (qPass + qNG > inv.quantity) return badRes(`Số lượng thao tác (${qPass + qNG}) vượt quá số lượng tồn (${inv.quantity})!`);
    const sp = db.sanPham.find((x) => x.ma_sp === inv.ma_sp);
    let nextStage = "THANH_PHAM";
    if (sp?.routing_map) {
      const r = JSON.parse(sp.routing_map);
      const idx = r.findIndex((s) => s.stage_id.toUpperCase() === fromStage);
      if (idx !== -1 && idx < r.length - 1) nextStage = r[idx + 1].stage_id.toUpperCase();
    }
    inv.quantity -= qPass + qNG;
    if (qPass > 0) upsertInventory(inv.ma_sp, p.lot_number, nextStage, qPass);
    if (qNG > 0) upsertInventory(inv.ma_sp, p.lot_number, fromStage + "_NG", qNG);
    if (qPass > 0) db.transactionsLog.push({ timestamp: nowStr(), user_id: p.user_id, lot_number: p.lot_number, from_stage: fromStage, to_stage: nextStage, qty: qPass, type: "PASS" });
    if (qNG > 0) db.transactionsLog.push({ timestamp: nowStr(), user_id: p.user_id, lot_number: p.lot_number, from_stage: fromStage, to_stage: "KHO_NG", qty: qNG, type: "NG" });
    return jsonRes({ success: true, routed_to: nextStage });
  }

  if (path === "/api/sx/ng/resolve" && method === "POST") {
    const p = await readBody(opts);
    const fromStage = String(p.from_stage || "").toUpperCase();
    const ngStageId = fromStage + "_NG";
    const inv = db.inventory.find((i) => i.lot_number === p.lot_number && i.stage_id.toUpperCase() === ngStageId);
    if (!inv || inv.quantity < p.qty) return badRes("Số lượng NG hiện có không đủ để xử lý.");
    inv.quantity -= p.qty;
    if (p.action === "REWORK") upsertInventory(inv.ma_sp, p.lot_number, String(p.return_stage).toUpperCase(), p.qty);
    db.transactionsLog.push({ timestamp: nowStr(), user_id: p.user_id, lot_number: p.lot_number, from_stage: ngStageId, to_stage: p.action === "REWORK" ? p.return_stage : "SCRAP", qty: p.qty, type: "NG" });
    return jsonRes({ success: true });
  }

  if (path === "/api/sx/dashboard/matrix" && method === "GET") {
    const grouped = {};
    db.inventory.filter((i) => i.quantity > 0).forEach((i) => {
      const key = i.lot_number;
      if (!grouped[key]) grouped[key] = { lot_number: i.lot_number, product_code: i.ma_sp, production_date: db.productionOrders.find((po) => po.po_number === i.lot_number)?.production_date, total_qty: 0 };
      grouped[key].total_qty += i.quantity;
      grouped[key]["qty_" + i.stage_id.toLowerCase().replace("_ng", "")] = i.stage_id.toUpperCase().endsWith("_NG") ? undefined : i.quantity;
      if (i.stage_id.toUpperCase().endsWith("_NG")) grouped[key]["ng_" + i.stage_id.toLowerCase().replace("_ng", "")] = i.quantity;
      else grouped[key]["qty_" + i.stage_id.toLowerCase()] = i.quantity;
      if (["THANH_PHAM", "THÀNH_PHẨM"].includes(i.stage_id.toUpperCase())) grouped[key].qty_done = (grouped[key].qty_done || 0) + i.quantity;
    });
    return jsonRes({ matrix: Object.values(grouped) });
  }

  if (path === "/api/sx/leader/pending" && method === "GET") {
    const lineId = u.searchParams.get("line_id");
    const validStages = db.stages.filter((s) => s.line_id === lineId).map((s) => s.stage_id);
    const rows = db.inventory
      .filter((i) => validStages.includes(i.stage_id.toUpperCase()) && i.quantity > 0)
      .map((i) => {
        const sp = db.sanPham.find((x) => x.ma_sp === i.ma_sp);
        let toStageName = "Hoàn thành (Nhập kho)";
        if (sp?.routing_map) {
          const r = JSON.parse(sp.routing_map);
          const idx = r.findIndex((s) => s.stage_id.toUpperCase() === i.stage_id.toUpperCase());
          if (idx !== -1 && idx < r.length - 1) toStageName = r[idx + 1].stage_id.toUpperCase();
        }
        return { po_id: i.lot_number, po_number: i.lot_number, product_id: i.ma_sp, product_code: i.ma_sp, ten_sp: sp?.ten_sp, routing_map: sp?.routing_map, from_stage: i.stage_id, qty_available: i.quantity, to_stage_name: toStageName };
      });
    return jsonRes({ data: rows });
  }

  if (path === "/api/sx/ng/list" && method === "GET") {
    const rows = db.inventory.filter((i) => i.stage_id.toUpperCase().endsWith("_NG") && i.quantity > 0).map((i) => ({ lot_number: i.lot_number, product_code: i.ma_sp, ng_qty: i.quantity }));
    return jsonRes({ data: rows });
  }

  if (path === "/api/sx/history" && method === "GET") {
    const rows = db.transactionsLog
      .slice()
      .reverse()
      .map((t) => {
        const u2 = db.nguoiDung.find((x) => x.ma_nv === t.user_id);
        const po = db.productionOrders.find((p) => p.po_number === t.lot_number);
        return { timestamp: t.timestamp, ten_nv: u2?.ten_nv, username: t.user_id, po_id: t.lot_number, type: t.type, qty: t.qty, from_stage: t.from_stage, to_stage: t.to_stage, product_code: po?.ma_sp || "UNKNOWN" };
      });
    return jsonRes({ data: rows });
  }

  return badRes("Mock API: không có route " + path, 404);
}

function upsertInventory(maSp, lotNumber, stageId, qty) {
  const row = db.inventory.find((i) => i.ma_sp === maSp && i.lot_number === lotNumber && i.stage_id === stageId);
  if (row) row.quantity += qty;
  else db.inventory.push({ ma_sp: maSp, lot_number: lotNumber, stage_id: stageId, quantity: qty, updated_at: nowStr() });
}

function labelType(type) {
  const map = { NHAP_KHO: "Nhập kho", XUAT_SAN_XUAT: "Xuất ra Line Sản Xuất", XUAT_XUONG: "Xuất cho xưởng", HOAN_TRA_XUONG: "Xưởng hoàn trả kho", TRA_KHO: "Trả kho", HUY_KHO: "Hủy / Kiểm kê giảm", HUY_XUONG: "Hủy tại xưởng", OPENING: "Tồn đầu kỳ" };
  return map[type] || type;
}

export function installMockFetch() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    if (String(url).includes("/api/")) return mockFetch(url, opts || {});
    return originalFetch(url, opts);
  };
  console.info("%c[MOCK MODE] Đang dùng dữ liệu giả lập, không gọi backend thật.", "color:#7c3aed;font-weight:bold;");
}
