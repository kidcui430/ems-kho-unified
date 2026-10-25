// ============================================================
// CLOUDFLARE WORKER - HE THONG HOP NHAT: KHO NVL + SAN XUAT (EMS)
// D1 SQLite. Tat ca endpoint San Xuat dung tien to /api/sx/...,
// Kho NVL dung tien to /api/kho/..., phan dung chung khong co tien to.
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=UTF-8",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}
function bad(message, status = 400) {
  return json({ error: message }, status);
}
async function body(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
function cleanDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value : null;
}

// ------------------------------------------------------------
// BAM MAT KHAU: SHA-256 + salt rieng cho tung user, dinh dang
// "s2:<salt>:<hash>". Mat khau seed dang plaintext se tu nang cap
// sang dang bam ngay lan dang nhap dung dau tien.
// ------------------------------------------------------------
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(digest);
}
function randomSalt() {
  return bufferToHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}
async function verifyAndUpgradePassword(env, user, inputPassword) {
  const stored = user.password || "";
  if (stored.startsWith("s2:")) {
    const [, salt, hash] = stored.split(":");
    return (await hashPassword(inputPassword, salt)) === hash;
  }
  if (stored !== inputPassword) return false;
  const salt = randomSalt();
  const hash = await hashPassword(inputPassword, salt);
  await env.DB.prepare("UPDATE Nguoi_Dung SET password = ? WHERE ma_nv = ?")
    .bind(`s2:${salt}:${hash}`, user.ma_nv)
    .run();
  return true;
}

// ------------------------------------------------------------
// KHO NVL: helper nghiep vu kho
// ------------------------------------------------------------
function movementFor(type, qty) {
  const q = Number(qty);
  const map = {
    NHAP_KHO: { dk: q, dx: 0 },
    XUAT_XUONG: { dk: -q, dx: q },
    XUAT_SAN_XUAT: { dk: -q, dx: q },
    TRA_KHO: { dk: q, dx: -q },
    HOAN_TRA_XUONG: { dk: q, dx: -q },
    HUY_KHO: { dk: -q, dx: 0 },
    HUY_XUONG: { dk: 0, dx: -q },
  };
  return map[type] || null;
}
function canUseType(type) {
  return [
    "NHAP_KHO",
    "XUAT_SAN_XUAT",
    "HOAN_TRA_XUONG",
    "HUY_KHO",
    "HUY_XUONG",
  ].includes(type);
}
function validateStockAfter(stock, movement) {
  const warehouse = Number(stock?.ton_kho || 0) + movement.dk;
  if (warehouse < -1e-9) return "Tồn kho không đủ cho giao dịch này.";
  const workshop = Number(stock?.ton_xuong || 0) + movement.dx;
  if (workshop < -1e-9) return "Tồn tại xưởng không đủ cho giao dịch này.";
  return null;
}
function labelSqlKho() {
  return `CASE g.loai_giao_dich
    WHEN 'NHAP_KHO' THEN 'Nhập kho'
    WHEN 'XUAT_XUONG' THEN 'Xuất cho xưởng'
    WHEN 'XUAT_SAN_XUAT' THEN 'Xuất ra Line Sản Xuất'
    WHEN 'TRA_KHO' THEN 'Trả kho'
    WHEN 'HOAN_TRA_XUONG' THEN 'Xưởng hoàn trả kho'
    WHEN 'HUY_KHO' THEN 'Hủy / Kiểm kê giảm'
    WHEN 'HUY_XUONG' THEN 'Hủy tại xưởng'
    WHEN 'OPENING' THEN 'Tồn đầu kỳ'
    ELSE g.loai_giao_dich END`;
}

async function getUser(env, maNv) {
  return env.DB.prepare(
    "SELECT ma_nv, ten_nv, bo_phan, role, he_thong, line_id, active FROM Nguoi_Dung WHERE ma_nv = ?",
  )
    .bind(maNv)
    .first();
}
async function getStock(env, maHang) {
  return env.DB.prepare(
    "SELECT ma_hang, ton_kho, ton_xuong, trang_thai FROM v_ton_nvl WHERE ma_hang = ?",
  )
    .bind(maHang)
    .first();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS")
      return new Response(null, { headers: corsHeaders });
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ============================================================
      // DUNG CHUNG: AUTH
      // ============================================================
      if (path === "/api/login" && request.method === "POST") {
        const p = await body(request);
        const maNv = String(p.ma_nv || p.username || "")
          .toUpperCase()
          .trim();
        const user = await env.DB.prepare(
          "SELECT ma_nv, ten_nv, role, he_thong, bo_phan, line_id, must_change_password, password FROM Nguoi_Dung WHERE ma_nv = ? AND active = 1",
        )
          .bind(maNv)
          .first();
        const ok =
          user &&
          (await verifyAndUpgradePassword(env, user, String(p.password || "")));
        if (!ok) return bad("Sai tài khoản hoặc mật khẩu.", 401);
        return json({
          ma_nv: user.ma_nv,
          ten_nv: user.ten_nv,
          role: user.role,
          he_thong: user.he_thong,
          bo_phan: user.bo_phan,
          line_id: user.line_id,
          must_change_password: Boolean(user.must_change_password),
        });
      }

      if (path === "/api/change-password" && request.method === "POST") {
        const p = await body(request);
        const maNv = String(p.ma_nv || p.username || "")
          .toUpperCase()
          .trim();
        const newPass = String(p.new_password || "");
        if (newPass.length < 4) return bad("Mật khẩu phải từ 4 ký tự trở lên.");
        const salt = randomSalt();
        const hash = await hashPassword(newPass, salt);
        await env.DB.prepare(
          "UPDATE Nguoi_Dung SET password = ?, must_change_password = 0 WHERE ma_nv = ?",
        )
          .bind(`s2:${salt}:${hash}`, maNv)
          .run();
        return json({ success: true });
      }

      if (path === "/api/health") {
        return json({
          ok: true,
          service: "Kho NVL + San Xuat (hop nhat)",
          version: "1.0",
        });
      }

      // ============================================================
      // DUNG CHUNG: LINE / CONG DOAN / MAY (phuc vu ca Kho lan SX)
      // ============================================================
      if (path === "/api/lines" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT line_id, line_name, display_order FROM Lines WHERE is_active = 1 ORDER BY display_order",
        ).all();
        return json({ data: results });
      }
      if (path === "/api/lines" && request.method === "POST") {
        const p = await body(request);
        const lineId = String(p.line_id || "")
          .trim()
          .toUpperCase();
        if (!lineId || !p.line_name)
          return bad("Mã Line và Tên Line là bắt buộc.");
        const exist = await env.DB.prepare(
          "SELECT line_id FROM Lines WHERE line_id = ?",
        )
          .bind(lineId)
          .first();
        if (exist) return bad(`Mã Line '${lineId}' đã tồn tại.`);
        const maxRow = await env.DB.prepare(
          "SELECT COALESCE(MAX(display_order),0) AS mo FROM Lines",
        ).first();
        await env.DB.prepare(
          "INSERT INTO Lines (line_id, line_name, display_order) VALUES (?, ?, ?)",
        )
          .bind(lineId, p.line_name.trim(), Number(maxRow?.mo || 0) + 1)
          .run();
        return json({ success: true, line_id: lineId });
      }

      if (path === "/api/stages" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT stage_id AS id, stage_id, line_id, stage_name, display_order FROM Stages ORDER BY display_order",
        ).all();
        return json({ data: results });
      }
      if (path === "/api/stages" && request.method === "POST") {
        const p = await body(request);
        const stageId = String(p.stage_id || "")
          .trim()
          .toUpperCase();
        const lineId = String(p.line_id || "")
          .trim()
          .toUpperCase();
        if (!stageId || !lineId || !p.stage_name)
          return bad("Mã công đoạn, Line và Tên công đoạn là bắt buộc.");
        const line = await env.DB.prepare(
          "SELECT line_id FROM Lines WHERE line_id = ?",
        )
          .bind(lineId)
          .first();
        if (!line) return bad(`Line '${lineId}' chưa tồn tại.`);
        const exist = await env.DB.prepare(
          "SELECT stage_id FROM Stages WHERE stage_id = ?",
        )
          .bind(stageId)
          .first();
        if (exist) return bad(`Mã công đoạn '${stageId}' đã tồn tại.`);
        const maxRow = await env.DB.prepare(
          "SELECT COALESCE(MAX(display_order),0) AS mo FROM Stages",
        ).first();
        await env.DB.prepare(
          "INSERT INTO Stages (stage_id, line_id, stage_name, display_order) VALUES (?, ?, ?, ?)",
        )
          .bind(
            stageId,
            lineId,
            p.stage_name.trim(),
            Number(maxRow?.mo || 0) + 1,
          )
          .run();
        return json({ success: true, stage_id: stageId });
      }

      if (path === "/api/machines" && request.method === "GET") {
        const lineId = (url.searchParams.get("line_id") || "")
          .trim()
          .toUpperCase();
        const sql = lineId
          ? "SELECT id, machine_code, machine_name, line_id FROM Machines WHERE is_active = 1 AND line_id = ? ORDER BY machine_code"
          : "SELECT id, machine_code, machine_name, line_id FROM Machines WHERE is_active = 1 ORDER BY line_id, machine_code";
        const stmt = lineId
          ? env.DB.prepare(sql).bind(lineId)
          : env.DB.prepare(sql);
        const { results } = await stmt.all();
        return json({ data: results });
      }
      if (path === "/api/machines" && request.method === "POST") {
        const p = await body(request);
        const lineId = String(p.line_id || "")
          .trim()
          .toUpperCase();
        if (!p.machine_code || !lineId)
          return bad("Mã Máy và Line là bắt buộc.");
        const line = await env.DB.prepare(
          "SELECT line_id FROM Lines WHERE line_id = ?",
        )
          .bind(lineId)
          .first();
        if (!line) return bad(`Line '${lineId}' chưa tồn tại.`);
        try {
          await env.DB.prepare(
            "INSERT INTO Machines (machine_code, machine_name, line_id) VALUES (?, ?, ?)",
          )
            .bind(
              p.machine_code.trim().toUpperCase(),
              p.machine_name || "",
              lineId,
            )
            .run();
        } catch (e) {
          return bad(`Mã máy '${p.machine_code}' đã tồn tại.`);
        }
        return json({ success: true });
      }

      // ============================================================
      // PHAN BO SAN PHAM / LOT XUONG MAY & TINH THOI GIAN CHAY MAY
      // ============================================================
      if (path === "/api/machine-allocations" && request.method === "POST") {
        const p = await body(request);
        const lot = p.lot_number;
        const stageId = String(p.stage_id || "").toUpperCase();
        const qty = Number(p.qty);
        if (
          !lot ||
          !stageId ||
          !p.machine_id ||
          !Number.isFinite(qty) ||
          qty <= 0
        )
          return bad("Thiếu LOT, công đoạn, máy hoặc số lượng không hợp lệ.");

        const inv = await env.DB.prepare(
          "SELECT quantity, ma_sp FROM Inventory WHERE lot_number = ? AND UPPER(stage_id) = ?",
        )
          .bind(lot, stageId)
          .first();
        const available = Number(inv?.quantity || 0);

        const allocated = await env.DB.prepare(
          "SELECT COALESCE(SUM(qty),0) AS tong FROM Machine_Allocations WHERE lot_number = ? AND UPPER(stage_id) = ? AND status NOT IN ('CANCELLED', 'DONE')",
        )
          .bind(lot, stageId)
          .first();
        const remaining = available - Number(allocated?.tong || 0);
        if (qty > remaining)
          return bad(
            `Số lượng phân bổ (${qty}) vượt quá phần tồn chưa phân máy (${remaining}).`,
          );

        // Nếu không truyền giờ cụ thể, lưu kèm giờ phút hiện tại (+7h) để tính thời gian máy chạy
        const nowStr = new Date(Date.now() + 7 * 3600 * 1000)
          .toISOString()
          .slice(0, 16)
          .replace("T", " ");
        const inputTime =
          p.input_date && p.input_date.length === 10
            ? `${p.input_date} ${nowStr.slice(11, 16)}`
            : p.input_date || nowStr;

        await env.DB.prepare(
          `INSERT INTO Machine_Allocations
           (lot_number, ma_sp, stage_id, machine_id, qty, input_date, output_date, status, note, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'PLANNED', ?, ?)`,
        )
          .bind(
            lot,
            inv?.ma_sp || p.ma_sp || "",
            stageId,
            Number(p.machine_id),
            qty,
            inputTime,
            p.output_date || null,
            p.note || "",
            p.user_id || "",
          )
          .run();
        return json({ success: true });
      }

      if (
        path === "/api/leader/machine-allocations" &&
        request.method === "GET"
      ) {
        const lot = url.searchParams.get("lot_number") || "";
        const stageId = (url.searchParams.get("stage_id") || "").toUpperCase();
        if (!lot) return bad("Thiếu lot_number.");
        const wh = ["ma.lot_number = ?"];
        const binds = [lot];
        if (stageId) {
          wh.push("UPPER(ma.stage_id) = ?");
          binds.push(stageId);
        }
        const { results } = await env.DB.prepare(
          `
          SELECT ma.id, ma.lot_number, ma.ma_sp, s.ten_sp, ma.stage_id, ma.machine_id, ma.qty,
                 ma.input_date, ma.output_date, ma.status, ma.note, ma.created_at,
                 m.machine_code, m.machine_name
          FROM Machine_Allocations ma
          LEFT JOIN Machines m ON m.id = ma.machine_id
          LEFT JOIN San_Pham s ON s.ma_sp = ma.ma_sp
          WHERE ${wh.join(" AND ")} AND ma.status != 'CANCELLED'
          ORDER BY CASE WHEN ma.status = 'DONE' THEN 1 ELSE 0 END, ma.created_at DESC
        `,
        )
          .bind(...binds)
          .all();
        return json({ data: results });
      }

      // ============================================================
      // DUNG CHUNG: MA HANG SAN XUAT (San_Pham) - Kho dung cho BOM,
      // San Xuat dung cho routing qua cong doan
      // ============================================================
      if (path === "/api/products" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM San_Pham WHERE active = 1 ORDER BY ma_sp",
        ).all();
        return json({ products: results });
      }
      if (path === "/api/products" && request.method === "POST") {
        const p = await body(request);
        if (!p.ten_sp) return bad("Tên mã hàng là bắt buộc.");

        let maSp = (p.ma_sp || "").trim().toUpperCase();
        if (!maSp) {
          const row = await env.DB.prepare(
            "SELECT COALESCE(MAX(CAST(SUBSTR(ma_sp, 3) AS INTEGER)), 0) AS max_no FROM San_Pham WHERE ma_sp LIKE 'SP%'",
          ).first();
          maSp = `SP${String(Number(row?.max_no || 0) + 1).padStart(3, "0")}`;
        }
        const exist = await env.DB.prepare(
          "SELECT ma_sp FROM San_Pham WHERE UPPER(TRIM(ma_sp)) = ?",
        )
          .bind(maSp)
          .first();
        if (exist) return bad(`Mã sản phẩm '${exist.ma_sp}' đã tồn tại.`);

        let routingMapStr = null;
        if (Array.isArray(p.routing_map) && p.routing_map.length > 0) {
          routingMapStr = JSON.stringify(p.routing_map);
        }

        await env.DB.prepare(
          `INSERT INTO San_Pham (ma_sp, ten_sp, quy_cach, don_vi_tinh, routing_map, ghi_chu)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            maSp,
            p.ten_sp.trim(),
            p.quy_cach || "",
            p.don_vi_tinh || "Cái",
            routingMapStr,
            p.ghi_chu || "",
          )
          .run();

        return json({ success: true, ma_sp: maSp });
      }
      if (path === "/api/products/edit" && request.method === "POST") {
        const p = await body(request);
        if (!p.ma_sp || !p.ten_sp) return bad("Mã và tên mã hàng là bắt buộc.");
        // Kho và SX dùng chung bảng San_Pham: chỉ đổi routing_map khi request thực sự
        // gửi trường này lên (vd form Admin Sản Xuất) - form bên Kho không gửi, để
        // tránh vô tình xóa mất lộ trình công đoạn đã khai báo từ phía Sản Xuất.
        const touchesRouting = Object.prototype.hasOwnProperty.call(
          p,
          "routing_map",
        );
        let sql = `UPDATE San_Pham SET ten_sp = ?, quy_cach = ?, don_vi_tinh = ?, ghi_chu = ?`;
        const binds = [
          p.ten_sp.trim(),
          p.quy_cach || "",
          p.don_vi_tinh || "Cái",
          p.ghi_chu || "",
        ];
        if (touchesRouting) {
          const routingMapStr =
            Array.isArray(p.routing_map) && p.routing_map.length > 0
              ? JSON.stringify(p.routing_map)
              : null;
          sql += `, routing_map = ?`;
          binds.push(routingMapStr);
        }
        sql += `, updated_at = datetime('now','+7 hours') WHERE ma_sp = ?`;
        binds.push(p.ma_sp);
        await env.DB.prepare(sql)
          .bind(...binds)
          .run();
        return json({ success: true });
      }
      if (path === "/api/products/delete" && request.method === "POST") {
        const p = await body(request);
        if (!p.ma_sp) return bad("Thiếu mã hàng cần xóa.");
        const [khoUse, sxUse] = await Promise.all([
          env.DB.prepare(
            "SELECT COUNT(*) AS total FROM Giao_Dich_NVL WHERE ma_sp_sx = ?",
          )
            .bind(p.ma_sp)
            .first(),
          env.DB.prepare(
            "SELECT COUNT(*) AS total FROM Production_Orders WHERE ma_sp = ?",
          )
            .bind(p.ma_sp)
            .first(),
        ]);
        if (Number(khoUse?.total || 0) > 0 || Number(sxUse?.total || 0) > 0) {
          await env.DB.prepare(
            "UPDATE San_Pham SET active = 0, updated_at = datetime('now','+7 hours') WHERE ma_sp = ?",
          )
            .bind(p.ma_sp)
            .run();
          return json({
            success: true,
            mode: "deactivated",
            message: "Mã hàng đã có lịch sử nên chuyển sang trạng thái Ẩn.",
          });
        }
        await env.DB.prepare("DELETE FROM Dinh_Muc_BOM WHERE ma_sp = ?")
          .bind(p.ma_sp)
          .run()
          .catch(() => {});
        await env.DB.prepare("DELETE FROM San_Pham WHERE ma_sp = ?")
          .bind(p.ma_sp)
          .run();
        return json({
          success: true,
          mode: "deleted",
          message: "Đã xóa hoàn toàn mã hàng.",
        });
      }

      // ============================================================
      // KHO NVL (/api/kho/...)
      // ============================================================
      if (path === "/api/kho/bootstrap" && request.method === "GET") {
        const items = await env.DB.prepare(
          `
          SELECT v.*,
            COALESCE((SELECT SUM(so_luong) FROM Giao_Dich_NVL g WHERE g.ma_hang = v.ma_hang AND g.trang_thai='approved' AND g.loai_giao_dich='NHAP_KHO'), 0) AS tong_nhap,
            COALESCE((SELECT SUM(so_luong) FROM Giao_Dich_NVL g WHERE g.ma_hang = v.ma_hang AND g.trang_thai='approved' AND g.loai_giao_dich IN ('XUAT_SAN_XUAT','XUAT_XUONG')), 0) AS tong_xuat_sx
          FROM v_ton_nvl v
          WHERE v.trang_thai != 'INACTIVE'
          ORDER BY v.phan_loai, v.ten_hang
        `,
        ).all();

        const nccs = await env.DB.prepare(
          "SELECT * FROM Nha_Cung_Cap WHERE active = 1 ORDER BY ten_ncc",
        ).all();
        const products = await env.DB.prepare(
          "SELECT * FROM San_Pham WHERE active = 1 ORDER BY ma_sp",
        ).all();
        const boms = await env.DB.prepare(
          `
          SELECT b.id, b.ma_sp, b.ma_hang, b.dinh_muc, b.ghi_chu,
                 d.ten_hang, d.phan_loai, d.quy_cach, d.don_vi_tinh
          FROM Dinh_Muc_BOM b
          JOIN Danh_Muc_NVL d ON d.ma_hang = b.ma_hang
          WHERE d.trang_thai != 'INACTIVE'
          ORDER BY b.ma_sp, d.phan_loai, d.ten_hang
        `,
        ).all();
        const cutRatios = await env.DB.prepare(
          `
          SELECT c.id, c.ma_sp, c.ma_hang, c.so_con_moi_cay, c.ghi_chu,
                 d.ten_hang, d.chieu_dai_chuan_m, d.he_so_kg_m
          FROM Dinh_Muc_Cat c
          JOIN Danh_Muc_NVL d ON d.ma_hang = c.ma_hang
          WHERE d.trang_thai != 'INACTIVE'
          ORDER BY c.ma_sp, d.ten_hang
        `,
        ).all();

        return json({
          items: items.results || [],
          nccs: nccs.results || [],
          products: products.results || [],
          boms: boms.results || [],
          cutRatios: cutRatios.results || [],
        });
      }

      if (path === "/api/kho/items" && request.method === "POST") {
        const p = await body(request);
        if (!p.phan_loai || !p.ten_hang || !p.don_vi_tinh)
          return bad("Phân loại, tên NVL và đơn vị tính là bắt buộc.");
        const row = await env.DB.prepare(
          "SELECT COALESCE(MAX(CAST(SUBSTR(ma_hang, 4) AS INTEGER)), 0) AS max_no FROM Danh_Muc_NVL WHERE ma_hang LIKE 'NVL%'",
        ).first();
        const maHang = `NVL${String(Number(row?.max_no || 0) + 1).padStart(3, "0")}`;
        await env.DB.prepare(
          `INSERT INTO Danh_Muc_NVL (ma_hang, phan_loai, ten_hang, quy_cach, don_vi_tinh, ma_ncc, ghi_chu, he_so_kg_m, chieu_dai_chuan_m, ma_goc)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            maHang,
            p.phan_loai.trim(),
            p.ten_hang.trim(),
            p.quy_cach || "",
            p.don_vi_tinh,
            p.ma_ncc || "",
            p.ghi_chu || "",
            Number(p.he_so_kg_m || 0),
            Number(p.chieu_dai_chuan_m || 0),
            p.ma_goc || "",
          )
          .run();
        return json({ success: true, ma_hang: maHang });
      }
      if (path === "/api/kho/items/edit" && request.method === "POST") {
        const p = await body(request);
        if (!p.ma_hang || !p.ten_hang || !p.don_vi_tinh)
          return bad("Mã NVL, tên NVL và ĐVT không được để trống.");
        await env.DB.prepare(
          `UPDATE Danh_Muc_NVL SET phan_loai=?, ten_hang=?, quy_cach=?, don_vi_tinh=?, ma_ncc=?, ghi_chu=?,
           he_so_kg_m=?, chieu_dai_chuan_m=?, ma_goc=?, updated_at=datetime('now','+7 hours') WHERE ma_hang=?`,
        )
          .bind(
            p.phan_loai || "",
            p.ten_hang.trim(),
            p.quy_cach || "",
            p.don_vi_tinh,
            p.ma_ncc || "",
            p.ghi_chu || "",
            Number(p.he_so_kg_m || 0),
            Number(p.chieu_dai_chuan_m || 0),
            p.ma_goc || "",
            p.ma_hang,
          )
          .run();
        return json({ success: true });
      }
      if (path === "/api/kho/items/delete" && request.method === "POST") {
        const p = await body(request);
        if (!p.ma_hang) return bad("Thiếu mã NVL cần xóa.");
        const tx = await env.DB.prepare(
          "SELECT COUNT(*) AS total FROM Giao_Dich_NVL WHERE ma_hang = ?",
        )
          .bind(p.ma_hang)
          .first();
        if (Number(tx?.total || 0) > 0) {
          await env.DB.prepare(
            "UPDATE Danh_Muc_NVL SET trang_thai='INACTIVE', updated_at=datetime('now','+7 hours') WHERE ma_hang=?",
          )
            .bind(p.ma_hang)
            .run();
          return json({
            success: true,
            mode: "deactivated",
            message:
              "NVL đã có lịch sử giao dịch nên chuyển sang trạng thái Ẩn.",
          });
        }
        await env.DB.prepare("DELETE FROM Dinh_Muc_BOM WHERE ma_hang = ?")
          .bind(p.ma_hang)
          .run()
          .catch(() => {});
        await env.DB.prepare("DELETE FROM Danh_Muc_NVL WHERE ma_hang = ?")
          .bind(p.ma_hang)
          .run();
        return json({
          success: true,
          mode: "deleted",
          message: "Đã xóa hoàn toàn NVL.",
        });
      }

      if (path === "/api/kho/suppliers" && request.method === "POST") {
        const p = await body(request);
        if (!p.ten_ncc) return bad("Tên nhà cung cấp là bắt buộc.");
        const row = await env.DB.prepare(
          "SELECT COALESCE(MAX(CAST(SUBSTR(ma_ncc, 4) AS INTEGER)), 0) AS max_no FROM Nha_Cung_Cap WHERE ma_ncc LIKE 'NCC%'",
        ).first();
        const maNcc = `NCC${String(Number(row?.max_no || 0) + 1).padStart(3, "0")}`;
        await env.DB.prepare(
          "INSERT INTO Nha_Cung_Cap (ma_ncc, ten_ncc, dia_chi, so_dt, nguoi_lien_he, email, ghi_chu) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(
            maNcc,
            p.ten_ncc.trim(),
            p.dia_chi || "",
            p.so_dt || "",
            p.nguoi_lien_he || "",
            p.email || "",
            p.ghi_chu || "",
          )
          .run();
        return json({ success: true, ma_ncc: maNcc });
      }
      if (path === "/api/kho/suppliers/edit" && request.method === "POST") {
        const p = await body(request);
        if (!p.ma_ncc || !p.ten_ncc)
          return bad("Mã và tên nhà cung cấp là bắt buộc.");
        await env.DB.prepare(
          "UPDATE Nha_Cung_Cap SET ten_ncc=?, dia_chi=?, so_dt=?, nguoi_lien_he=?, email=?, ghi_chu=?, updated_at=datetime('now','+7 hours') WHERE ma_ncc=?",
        )
          .bind(
            p.ten_ncc.trim(),
            p.dia_chi || "",
            p.so_dt || "",
            p.nguoi_lien_he || "",
            p.email || "",
            p.ghi_chu || "",
            p.ma_ncc,
          )
          .run();
        return json({ success: true });
      }
      if (path === "/api/kho/suppliers/delete" && request.method === "POST") {
        const p = await body(request);
        if (!p.ma_ncc) return bad("Thiếu mã NCC cần xóa.");
        const [txCount, nvlCount] = await Promise.all([
          env.DB.prepare(
            "SELECT COUNT(*) AS total FROM Giao_Dich_NVL WHERE ma_ncc = ?",
          )
            .bind(p.ma_ncc)
            .first(),
          env.DB.prepare(
            "SELECT COUNT(*) AS total FROM Danh_Muc_NVL WHERE ma_ncc = ?",
          )
            .bind(p.ma_ncc)
            .first(),
        ]);
        if (
          Number(txCount?.total || 0) > 0 ||
          Number(nvlCount?.total || 0) > 0
        ) {
          await env.DB.prepare(
            "UPDATE Nha_Cung_Cap SET active=0, updated_at=datetime('now','+7 hours') WHERE ma_ncc=?",
          )
            .bind(p.ma_ncc)
            .run();
          return json({
            success: true,
            mode: "deactivated",
            message:
              "NCC đã có liên kết dữ liệu nên chuyển sang trạng thái Ẩn.",
          });
        }
        await env.DB.prepare("DELETE FROM Nha_Cung_Cap WHERE ma_ncc = ?")
          .bind(p.ma_ncc)
          .run();
        return json({
          success: true,
          mode: "deleted",
          message: "Đã xóa hoàn toàn nhà cung cấp.",
        });
      }

      if (path === "/api/kho/bom/save" && request.method === "POST") {
        const p = await body(request);
        if (!p.ma_sp || !p.ma_hang)
          return bad("Thiếu Mã sản phẩm hoặc Mã NVL.");
        const dm = Number(p.dinh_muc || 0);
        if (dm < 0) return bad("Định mức không được nhỏ hơn 0.");
        await env.DB.prepare(
          `INSERT INTO Dinh_Muc_BOM (ma_sp, ma_hang, dinh_muc, ghi_chu, updated_at) VALUES (?, ?, ?, ?, datetime('now','+7 hours'))
           ON CONFLICT(ma_sp, ma_hang) DO UPDATE SET dinh_muc=excluded.dinh_muc, ghi_chu=excluded.ghi_chu, updated_at=datetime('now','+7 hours')`,
        )
          .bind(p.ma_sp, p.ma_hang, dm, p.ghi_chu || "")
          .run();
        return json({ success: true });
      }
      if (path === "/api/kho/bom/delete" && request.method === "POST") {
        const p = await body(request);
        if (!p.ma_sp || !p.ma_hang) return bad("Thiếu thông tin cần xóa.");
        await env.DB.prepare(
          "DELETE FROM Dinh_Muc_BOM WHERE ma_sp = ? AND ma_hang = ?",
        )
          .bind(p.ma_sp, p.ma_hang)
          .run();
        return json({ success: true });
      }

      // Tỷ lệ cắt (thép cây -> số con/cây), theo cặp (ma_sp, ma_hang), áp dụng
      // theo chiều dài chuẩn (chieu_dai_chuan_m) đã khai báo ở Danh_Muc_NVL.
      if (path === "/api/kho/cat-ratio/save" && request.method === "POST") {
        const p = await body(request);
        if (!p.ma_sp || !p.ma_hang)
          return bad("Thiếu Mã sản phẩm hoặc Mã NVL.");
        const soCon = Number(p.so_con_moi_cay || 0);
        if (soCon <= 0) return bad("Số con/cây phải lớn hơn 0.");
        await env.DB.prepare(
          `INSERT INTO Dinh_Muc_Cat (ma_sp, ma_hang, so_con_moi_cay, ghi_chu, updated_at) VALUES (?, ?, ?, ?, datetime('now','+7 hours'))
           ON CONFLICT(ma_sp, ma_hang) DO UPDATE SET so_con_moi_cay=excluded.so_con_moi_cay, ghi_chu=excluded.ghi_chu, updated_at=datetime('now','+7 hours')`,
        )
          .bind(p.ma_sp, p.ma_hang, soCon, p.ghi_chu || "")
          .run();
        return json({ success: true });
      }
      if (path === "/api/kho/cat-ratio/delete" && request.method === "POST") {
        const p = await body(request);
        if (!p.ma_sp || !p.ma_hang) return bad("Thiếu thông tin cần xóa.");
        await env.DB.prepare(
          "DELETE FROM Dinh_Muc_Cat WHERE ma_sp = ? AND ma_hang = ?",
        )
          .bind(p.ma_sp, p.ma_hang)
          .run();
        return json({ success: true });
      }

      if (path === "/api/kho/transactions" && request.method === "POST") {
        const p = await body(request);
        const user = await getUser(env, p.user_id);
        if (!user || !user.active) return bad("Người dùng không hợp lệ.", 401);
        if (!Array.isArray(p.transactions) || p.transactions.length === 0)
          return bad("Phiếu chưa có NVL.");

        const txDate = cleanDate(p.tx_date);
        if (!txDate) return bad("Ngày giao dịch không hợp lệ.");

        const projected = new Map();
        const preparedRows = [];

        for (const item of p.transactions) {
          const qty = Number(item.so_luong);
          if (!item.ma_hang || !Number.isFinite(qty) || qty <= 0)
            return bad("NVL hoặc số lượng không hợp lệ.");
          if (!canUseType(item.loai_giao_dich))
            return bad(`Loại giao dịch ${item.loai_giao_dich} không hợp lệ.`);

          const stock = await getStock(env, item.ma_hang);
          if (!stock) return bad(`Không tìm thấy mã NVL ${item.ma_hang}.`);
          if (
            stock.trang_thai === "BLOCKED" &&
            item.loai_giao_dich === "XUAT_SAN_XUAT"
          )
            return bad(`Mã ${item.ma_hang} đang bị chặn xuất.`);

          const mv = movementFor(item.loai_giao_dich, qty);
          if (!mv) return bad("Loại giao dịch không được hỗ trợ.");

          const current = projected.get(item.ma_hang) || {
            ton_kho: Number(stock.ton_kho || 0),
            ton_xuong: Number(stock.ton_xuong || 0),
          };
          const err = validateStockAfter(current, mv);
          if (err) return bad(`${stock.ma_hang}: ${err}`);
          current.ton_kho += mv.dk;
          current.ton_xuong += mv.dx;
          projected.set(item.ma_hang, current);

          preparedRows.push({ item, qty, mv });
        }

        const stmts = preparedRows.map(({ item, qty, mv }) =>
          env.DB.prepare(
            `
            INSERT INTO Giao_Dich_NVL
            (ma_hang, loai_giao_dich, so_luong, sl_phu, dvt_phu, quy_cach_gd, khoi_luong_kg,
             delta_kho, delta_xuong, trang_thai, nguoi_giao_dich, nguoi_duyet, ma_ncc, ma_sp_sx, so_chung_tu,
             don_gia, thanh_tien, ghi_chu, thoi_gian_gd, approved_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, ?, ?, ?, ?, ? || ' ' || strftime('%H:%M:%S','now','+7 hours'), datetime('now','+7 hours'))
          `,
          ).bind(
            item.ma_hang,
            item.loai_giao_dich,
            qty,
            Number(item.sl_phu || 0),
            item.dvt_phu || "",
            item.quy_cach_gd || "",
            Number(item.khoi_luong_kg || 0),
            mv.dk,
            mv.dx,
            user.ma_nv,
            user.ma_nv,
            item.ma_ncc || "",
            item.ma_sp_sx || "",
            item.so_chung_tu || "",
            Number(item.don_gia || 0),
            Number(item.don_gia || 0) * qty,
            item.ghi_chu || "",
            txDate,
          ),
        );

        await env.DB.batch(stmts);
        return json({ success: true, status: "approved", count: stmts.length });
      }

      if (path === "/api/kho/history" && request.method === "GET") {
        const from = cleanDate(url.searchParams.get("from"));
        const to = cleanDate(url.searchParams.get("to"));
        const type = url.searchParams.get("type") || "";
        const q = (url.searchParams.get("q") || "").trim();

        const wh = ["1=1"];
        const binds = [];
        if (from) {
          wh.push("date(g.thoi_gian_gd) >= ?");
          binds.push(from);
        }
        if (to) {
          wh.push("date(g.thoi_gian_gd) <= ?");
          binds.push(to);
        }
        if (type) {
          wh.push("g.loai_giao_dich = ?");
          binds.push(type);
        }
        if (q) {
          wh.push(
            "(g.ma_hang LIKE ? OR d.ten_hang LIKE ? OR d.phan_loai LIKE ? OR s.ten_sp LIKE ? OR g.ma_sp_sx LIKE ? OR g.so_chung_tu LIKE ?)",
          );
          const like = `%${q}%`;
          binds.push(like, like, like, like, like, like);
        }

        const result = await env.DB.prepare(
          `
          SELECT g.*, d.ten_hang, d.phan_loai, d.quy_cach, d.don_vi_tinh,
                 u.ten_nv, u.bo_phan, s.ten_sp, n.ten_ncc, ${labelSqlKho()} AS loai_hien_thi
          FROM Giao_Dich_NVL g
          JOIN Danh_Muc_NVL d ON d.ma_hang = g.ma_hang
          LEFT JOIN Nguoi_Dung u ON u.ma_nv = g.nguoi_giao_dich
          LEFT JOIN San_Pham s ON s.ma_sp = g.ma_sp_sx
          LEFT JOIN Nha_Cung_Cap n ON n.ma_ncc = g.ma_ncc
          WHERE ${wh.join(" AND ")}
          ORDER BY g.thoi_gian_gd DESC, g.id DESC
          LIMIT 1000
        `,
        )
          .bind(...binds)
          .all();
        return json({ rows: result.results || [] });
      }

      if (path === "/api/kho/report/daily" && request.method === "GET") {
        const from = cleanDate(url.searchParams.get("from"));
        const to = cleanDate(url.searchParams.get("to"));
        if (!from || !to) return bad("Cần from và to theo YYYY-MM-DD.");
        if (from > to) return bad("Từ ngày không được lớn hơn đến ngày.");

        const wh = [
          "g.trang_thai='approved'",
          "g.loai_giao_dich!='OPENING'",
          "date(g.thoi_gian_gd) BETWEEN ? AND ?",
        ];
        const binds = [from, to];

        const [rows, total, byProduct, byCategory] = await Promise.all([
          env.DB.prepare(
            `
            SELECT d.ma_hang, d.ten_hang, d.phan_loai, d.don_vi_tinh,
              d.chieu_dai_chuan_m, d.he_so_kg_m,
              COALESCE(SUM(CASE WHEN g.loai_giao_dich='NHAP_KHO' THEN g.so_luong ELSE 0 END), 0) AS nhap,
              COALESCE(SUM(CASE WHEN g.loai_giao_dich IN ('XUAT_XUONG','XUAT_SAN_XUAT') THEN g.so_luong ELSE 0 END), 0) AS xuat_sx,
              COALESCE(SUM(CASE WHEN g.loai_giao_dich='NHAP_KHO' THEN g.khoi_luong_kg ELSE 0 END), 0) AS tong_kg_nhap,
              COALESCE(SUM(CASE WHEN g.loai_giao_dich IN ('XUAT_XUONG','XUAT_SAN_XUAT') THEN g.khoi_luong_kg ELSE 0 END), 0) AS tong_kg_xuat,
              COALESCE(SUM(CASE WHEN g.loai_giao_dich IN ('XUAT_XUONG','XUAT_SAN_XUAT') AND g.dvt_phu='pcs' THEN g.sl_phu ELSE 0 END), 0) AS tong_pcs_xuat,
              MAX(g.thoi_gian_gd) AS gd_gan_nhat,
              COALESCE(MAX(v.ton_kho), 0) AS ton_kho
            FROM Danh_Muc_NVL d
            JOIN Giao_Dich_NVL g ON g.ma_hang = d.ma_hang
            LEFT JOIN v_ton_nvl v ON v.ma_hang = d.ma_hang
            WHERE ${wh.join(" AND ")}
            GROUP BY d.ma_hang, d.ten_hang, d.phan_loai, d.don_vi_tinh, d.chieu_dai_chuan_m, d.he_so_kg_m
            ORDER BY d.phan_loai, d.ten_hang
          `,
          )
            .bind(...binds)
            .all(),
          env.DB.prepare(
            `
            SELECT
              COALESCE(SUM(CASE WHEN g.loai_giao_dich='NHAP_KHO' THEN g.so_luong ELSE 0 END), 0) AS nhap,
              COALESCE(SUM(CASE WHEN g.loai_giao_dich IN ('XUAT_XUONG','XUAT_SAN_XUAT') THEN g.so_luong ELSE 0 END), 0) AS xuat_sx
            FROM Giao_Dich_NVL g JOIN Danh_Muc_NVL d ON d.ma_hang = g.ma_hang WHERE ${wh.join(" AND ")}
          `,
          )
            .bind(...binds)
            .first(),
          env.DB.prepare(
            `
            SELECT COALESCE(NULLIF(g.ma_sp_sx, ''), 'KHAC') AS ma_sp, COALESCE(s.ten_sp, 'Chưa gắn mã SP') AS ten_sp,
                   g.ma_hang, d.ten_hang, d.don_vi_tinh, COALESCE(SUM(g.so_luong), 0) AS tong_sl
            FROM Giao_Dich_NVL g JOIN Danh_Muc_NVL d ON d.ma_hang = g.ma_hang LEFT JOIN San_Pham s ON s.ma_sp = g.ma_sp_sx
            WHERE g.trang_thai='approved' AND g.loai_giao_dich IN ('XUAT_SAN_XUAT','XUAT_XUONG') AND date(g.thoi_gian_gd) BETWEEN ? AND ?
            GROUP BY COALESCE(NULLIF(g.ma_sp_sx, ''), 'KHAC'), COALESCE(s.ten_sp, 'Chưa gắn mã SP'), g.ma_hang, d.ten_hang, d.don_vi_tinh
            ORDER BY tong_sl DESC
          `,
          )
            .bind(from, to)
            .all(),
          env.DB.prepare(
            `
            SELECT d.phan_loai, COALESCE(SUM(g.so_luong), 0) AS tong_sl, COUNT(DISTINCT g.ma_hang) AS so_ma_nvl
            FROM Giao_Dich_NVL g JOIN Danh_Muc_NVL d ON d.ma_hang = g.ma_hang
            WHERE g.trang_thai='approved' AND g.loai_giao_dich IN ('XUAT_SAN_XUAT','XUAT_XUONG') AND date(g.thoi_gian_gd) BETWEEN ? AND ?
            GROUP BY d.phan_loai ORDER BY tong_sl DESC
          `,
          )
            .bind(from, to)
            .all(),
        ]);

        return json({
          rows: rows.results || [],
          total: total || { nhap: 0, xuat_sx: 0 },
          chart_by_product: byProduct.results || [],
          chart_by_category: byCategory.results || [],
        });
      }

      if (path === "/api/kho/report/detail" && request.method === "GET") {
        const maHang = url.searchParams.get("ma_hang");
        const from = cleanDate(url.searchParams.get("from"));
        const to = cleanDate(url.searchParams.get("to"));

        const wh = ["g.trang_thai='approved'", "g.loai_giao_dich!='OPENING'"];
        const binds = [];
        if (maHang) {
          wh.push("g.ma_hang = ?");
          binds.push(maHang);
        }
        if (from) {
          wh.push("date(g.thoi_gian_gd) >= ?");
          binds.push(from);
        }
        if (to) {
          wh.push("date(g.thoi_gian_gd) <= ?");
          binds.push(to);
        }

        const result = await env.DB.prepare(
          `
          SELECT g.id, g.thoi_gian_gd, g.ma_hang, d.ten_hang, d.phan_loai, d.don_vi_tinh,
                 g.so_luong, g.sl_phu, g.dvt_phu, g.quy_cach_gd, g.khoi_luong_kg,
                 g.loai_giao_dich, ${labelSqlKho()} AS loai_hien_thi,
                 g.nguoi_giao_dich, u.ten_nv, g.ma_sp_sx, s.ten_sp, g.so_chung_tu, g.ghi_chu
          FROM Giao_Dich_NVL g
          JOIN Danh_Muc_NVL d ON d.ma_hang = g.ma_hang
          LEFT JOIN Nguoi_Dung u ON u.ma_nv = g.nguoi_giao_dich
          LEFT JOIN San_Pham s ON s.ma_sp = g.ma_sp_sx
          WHERE ${wh.join(" AND ")}
          ORDER BY g.thoi_gian_gd DESC, g.id DESC
          LIMIT 200
        `,
        )
          .bind(...binds)
          .all();
        return json({ rows: result.results || [] });
      }

      // ============================================================
      // SAN XUAT / EMS (/api/sx/...)
      // ============================================================
      if (path === "/api/sx/po/create" && request.method === "POST") {
        const p = await body(request);
        if (!p.po_number || !p.product_code || !p.total_qty)
          return bad("Thiếu thông tin LOT.");
        const maSp = String(p.product_code).trim().toUpperCase();

        const product = await env.DB.prepare(
          "SELECT ma_sp, ten_sp, routing_map FROM San_Pham WHERE ma_sp = ?",
        )
          .bind(maSp)
          .first();
        if (!product) return bad(`Mã sản phẩm '${maSp}' chưa được khai báo.`);

        let firstStage = null;
        if (product.routing_map) {
          try {
            const r = JSON.parse(product.routing_map);
            if (r.length > 0) firstStage = String(r[0].stage_id).toUpperCase();
          } catch (e) {}
        }
        if (!firstStage)
          return bad(
            `Mã sản phẩm '${maSp} - ${product.ten_sp}' chưa khai báo lộ trình công đoạn (routing).`,
          );

        const exist = await env.DB.prepare(
          "SELECT po_number FROM Production_Orders WHERE po_number = ?",
        )
          .bind(p.po_number)
          .first();
        if (exist) return bad(`Số LOT '${p.po_number}' đã tồn tại.`);

        try {
          await env.DB.batch([
            env.DB.prepare(
              "INSERT INTO Production_Orders (po_number, ma_sp, production_date, total_qty, status, created_by) VALUES (?, ?, ?, ?, 'OPEN', ?)",
            ).bind(
              p.po_number,
              maSp,
              p.production_date || null,
              Number(p.total_qty),
              p.user_id || "",
            ),
            env.DB.prepare(
              "INSERT INTO Inventory (ma_sp, lot_number, stage_id, quantity) VALUES (?, ?, ?, ?)",
            ).bind(maSp, p.po_number, firstStage, Number(p.total_qty)),
          ]);
          return json({ success: true });
        } catch (err) {
          return bad(err.message, 500);
        }
      }

      if (path === "/api/sx/move" && request.method === "POST") {
        const p = await body(request);
        const lot = p.lot_number;
        const fromStage = String(p.from_stage || "").toUpperCase();
        const qPass = parseInt(p.qty_pass) || 0;
        const qNG = parseInt(p.qty_ng) || 0;
        const totalMove = qPass + qNG;
        const userId = p.user_id || "";

        if (!lot || !fromStage) return bad("Thiếu LOT hoặc công đoạn.");
        if (totalMove <= 0) return bad("Vui lòng nhập số lượng PASS hoặc NG!");

        const inv = await env.DB.prepare(
          "SELECT ma_sp, quantity FROM Inventory WHERE lot_number = ? AND UPPER(stage_id) = ?",
        )
          .bind(lot, fromStage)
          .first();
        if (!inv) return bad("Không tìm thấy LOT tại công đoạn này.");
        if (totalMove > Number(inv.quantity || 0))
          return bad(
            `Số lượng thao tác (${totalMove}) vượt quá số lượng tồn (${inv.quantity})!`,
          );

        // Line của công đoạn có máy không? (không có máy -> cho giao thẳng từ tồn trạm)
        const machineCountRow = await env.DB.prepare(
          `SELECT COUNT(m.id) AS total FROM Stages s
           JOIN Machines m ON m.line_id = s.line_id AND m.is_active = 1
           WHERE UPPER(s.stage_id) = ?`,
        )
          .bind(fromStage)
          .first();
        const lineHasMachines = Number(machineCountRow?.total || 0) > 0;

        const product = await env.DB.prepare(
          "SELECT routing_map FROM San_Pham WHERE ma_sp = ?",
        )
          .bind(inv.ma_sp)
          .first();
        let nextStage = "THANH_PHAM";
        if (product?.routing_map) {
          try {
            const routingMap = JSON.parse(product.routing_map);
            const idx = routingMap.findIndex(
              (s) => String(s.stage_id).toUpperCase() === fromStage,
            );
            if (idx !== -1 && idx < routingMap.length - 1)
              nextStage = String(routingMap[idx + 1].stage_id).toUpperCase();
          } catch (e) {}
        }

        const nowStr = new Date(Date.now() + 7 * 3600 * 1000)
          .toISOString()
          .slice(0, 16)
          .replace("T", " ");
        const stmts = [];

        // 1. Trừ tồn kho ở công đoạn hiện tại
        stmts.push(
          env.DB.prepare(
            "UPDATE Inventory SET quantity = quantity - ?, updated_at = datetime('now','+7 hours') WHERE lot_number = ? AND UPPER(stage_id) = ?",
          ).bind(totalMove, lot, fromStage),
        );

        // 2. Bắt buộc phân bổ máy trước khi giao: chỉ SL đang chạy trên máy mới được giao (PASS + NG).
        //    Ngoại lệ: Line của công đoạn không có máy nào -> giao thẳng từ tồn trạm như cũ.
        //    Tự trừ SL trên các máy theo thứ tự máy nhận hàng trước (FIFO) và chốt giờ hoàn thành.
        let machineNote = "";
        if (lineHasMachines) {
          const { results: runningAllocs } = await env.DB.prepare(
            `SELECT ma.*, m.machine_code FROM Machine_Allocations ma
             LEFT JOIN Machines m ON m.id = ma.machine_id
             WHERE ma.lot_number = ? AND UPPER(ma.stage_id) = ? AND ma.status NOT IN ('CANCELLED', 'DONE')
             ORDER BY ma.input_date, ma.id`,
          )
            .bind(lot, fromStage)
            .all();
          const allocs = runningAllocs || [];
          const allocatedTotal = allocs.reduce(
            (s, a) => s + Number(a.qty || 0),
            0,
          );
          if (allocatedTotal <= 0)
            return bad(
              "LOT này chưa được phân bổ máy tại công đoạn hiện tại. Vui lòng Chia Xuống Máy trước khi giao.",
            );
          if (totalMove > allocatedTotal)
            return bad(
              `Số lượng thao tác (${totalMove}) vượt quá số lượng đang chạy trên máy (${allocatedTotal}). Vui lòng phân bổ thêm máy.`,
            );

          let left = totalMove;
          const usedMachines = [];
          for (const alloc of allocs) {
            if (left <= 0) break;
            const allocQty = Number(alloc.qty || 0);
            const take = Math.min(left, allocQty);
            if (take <= 0) continue;
            left -= take;
            if (alloc.machine_code && !usedMachines.includes(alloc.machine_code))
              usedMachines.push(alloc.machine_code);

            if (take >= allocQty) {
              // Hoàn thành toàn bộ mẻ trên máy này -> chốt output_date = nowStr và status = 'DONE'
              stmts.push(
                env.DB.prepare(
                  "UPDATE Machine_Allocations SET status = 'DONE', output_date = ? WHERE id = ?",
                ).bind(nowStr, alloc.id),
              );
            } else {
              // Giao một phần từ máy -> giảm số đang chạy trên máy và tách 1 dòng DONE để lưu thời gian chạy
              stmts.push(
                env.DB.prepare(
                  "UPDATE Machine_Allocations SET qty = qty - ? WHERE id = ?",
                ).bind(take, alloc.id),
              );
              stmts.push(
                env.DB.prepare(
                  `INSERT INTO Machine_Allocations (lot_number, ma_sp, stage_id, machine_id, qty, input_date, output_date, status, note, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'DONE', ?, ?)`,
                ).bind(
                  alloc.lot_number,
                  alloc.ma_sp || inv.ma_sp,
                  alloc.stage_id,
                  alloc.machine_id,
                  take,
                  alloc.input_date,
                  nowStr,
                  "Hoàn thành 1 phần",
                  userId,
                ),
              );
            }
          }
          if (usedMachines.length > 0)
            machineNote = `[Máy ${usedMachines.join(", ")}]`;
        }

        // 3. Chuyển hàng PASS sang công đoạn kế tiếp
        if (qPass > 0) {
          stmts.push(
            env.DB.prepare(
              `INSERT INTO Inventory (ma_sp, lot_number, stage_id, quantity) VALUES (?, ?, ?, ?)
             ON CONFLICT(ma_sp, lot_number, stage_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = datetime('now','+7 hours')`,
            ).bind(inv.ma_sp, lot, nextStage, qPass),
          );
          stmts.push(
            env.DB.prepare(
              "INSERT INTO Transactions_Log (user_id, lot_number, from_stage, to_stage, qty, type) VALUES (?, ?, ?, ?, ?, 'PASS')",
            ).bind(
              userId,
              lot,
              machineNote ? `${fromStage} ${machineNote}` : fromStage,
              nextStage,
              qPass,
            ),
          );
        }

        // 4. Chuyển hàng NG vào kho NG của công đoạn đó
        if (qNG > 0) {
          const ngStage = fromStage + "_NG";
          stmts.push(
            env.DB.prepare(
              `INSERT INTO Inventory (ma_sp, lot_number, stage_id, quantity) VALUES (?, ?, ?, ?)
             ON CONFLICT(ma_sp, lot_number, stage_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = datetime('now','+7 hours')`,
            ).bind(inv.ma_sp, lot, ngStage, qNG),
          );
          stmts.push(
            env.DB.prepare(
              "INSERT INTO Transactions_Log (user_id, lot_number, from_stage, to_stage, qty, type) VALUES (?, ?, ?, 'KHO_NG', ?, 'NG')",
            ).bind(
              userId,
              lot,
              machineNote ? `${fromStage} ${machineNote}` : fromStage,
              qNG,
            ),
          );
        }

        await env.DB.batch(stmts);
        return json({ success: true, routed_to: nextStage });
      }

      if (path === "/api/sx/dashboard/matrix" && request.method === "GET") {
        const stagesRes = await env.DB.prepare(
          "SELECT stage_id FROM Stages ORDER BY display_order",
        ).all();
        const stagesList = (stagesRes.results || []).map((r) => r.stage_id);

        const queryFields = stagesList
          .map(
            (st) => `
          SUM(CASE WHEN UPPER(i.stage_id) = '${st}' THEN i.quantity ELSE 0 END) AS qty_${st.toLowerCase()},
          SUM(CASE WHEN UPPER(i.stage_id) = '${st}_NG' THEN i.quantity ELSE 0 END) AS ng_${st.toLowerCase()},
          MAX(CASE WHEN UPPER(i.stage_id) = '${st}' THEN i.updated_at ELSE NULL END) AS date_${st.toLowerCase()}
        `,
          )
          .join(",");

        const [matrixRes, allocRes] = await Promise.all([
          env.DB.prepare(
            `
            SELECT i.lot_number, i.ma_sp AS product_code, COALESCE(sp.ten_sp, '') AS product_name, po.production_date,
              SUM(i.quantity) AS total_qty,
              ${queryFields},
              SUM(CASE WHEN UPPER(i.stage_id) IN ('THANH_PHAM','THÀNH_PHẨM') THEN i.quantity ELSE 0 END) AS qty_done
            FROM Inventory i
            LEFT JOIN Production_Orders po ON po.po_number = i.lot_number
            LEFT JOIN San_Pham sp ON sp.ma_sp = i.ma_sp
            WHERE i.quantity > 0
            GROUP BY i.lot_number, i.ma_sp, sp.ten_sp, po.production_date
          `,
          ).all(),
          env.DB.prepare(
            `
            SELECT ma.id, ma.lot_number, ma.ma_sp, sp.ten_sp, UPPER(ma.stage_id) AS stage_id,
                   ma.qty, ma.input_date, ma.output_date, ma.status, ma.created_at,
                   m.machine_code, m.machine_name, m.line_id
            FROM Machine_Allocations ma
            LEFT JOIN Machines m ON m.id = ma.machine_id
            LEFT JOIN San_Pham sp ON sp.ma_sp = ma.ma_sp
            WHERE ma.status != 'CANCELLED'
            ORDER BY ma.created_at DESC
          `,
          ).all(),
        ]);

        return json({
          matrix: matrixRes.results || [],
          allocations: allocRes.results || [],
        });
      }

      if (path === "/api/sx/leader/pending" && request.method === "GET") {
        const lineId = (url.searchParams.get("line_id") || "")
          .trim()
          .toUpperCase();
        if (!lineId) return json({ data: [] });

        const stagesRes = await env.DB.prepare(
          "SELECT stage_id FROM Stages WHERE line_id = ?",
        )
          .bind(lineId)
          .all();
        const validStages = (stagesRes.results || []).map((r) => r.stage_id);
        if (validStages.length === 0) return json({ data: [] });

        const placeholders = validStages.map(() => "?").join(",");
        const machineCountRow = await env.DB.prepare(
          "SELECT COUNT(*) AS total FROM Machines WHERE line_id = ? AND is_active = 1",
        )
          .bind(lineId)
          .first();
        const line_has_machines = Number(machineCountRow?.total || 0) > 0;
        const [invRes, allocRes] = await Promise.all([
          env.DB.prepare(
            `
            SELECT i.lot_number AS po_id, i.lot_number AS po_number, i.ma_sp AS product_id, i.ma_sp AS product_code,
                   COALESCE(p.ten_sp, '') AS ten_sp, p.routing_map, i.stage_id AS from_stage, i.quantity AS qty_available,
                   i.updated_at AS stage_in_time
            FROM Inventory i
            LEFT JOIN San_Pham p ON p.ma_sp = i.ma_sp
            WHERE UPPER(i.stage_id) IN (${placeholders}) AND i.quantity > 0
          `,
          )
            .bind(...validStages)
            .all(),
          env.DB.prepare(
            `
            SELECT ma.id, ma.lot_number, UPPER(ma.stage_id) AS stage_id, ma.machine_id, ma.qty,
                   ma.input_date, ma.output_date, ma.status, m.machine_code, m.machine_name
            FROM Machine_Allocations ma
            LEFT JOIN Machines m ON m.id = ma.machine_id
            WHERE UPPER(ma.stage_id) IN (${placeholders}) AND ma.status NOT IN ('CANCELLED', 'DONE')
          `,
          )
            .bind(...validStages)
            .all(),
        ]);

        const allocList = allocRes.results || [];
        const formatted = (invRes.results || []).map((row) => {
          let to_stage_name = "Hoàn thành (Nhập kho)";
          if (row.routing_map) {
            try {
              const rMap = JSON.parse(row.routing_map);
              const idx = rMap.findIndex(
                (s) =>
                  String(s.stage_id).toUpperCase() ===
                  String(row.from_stage).toUpperCase(),
              );
              if (idx !== -1 && idx < rMap.length - 1)
                to_stage_name = String(rMap[idx + 1].stage_id).toUpperCase();
            } catch (e) {}
          }
          const stageUpper = String(row.from_stage).toUpperCase();
          const active_machines = allocList.filter(
            (a) => a.lot_number === row.po_number && a.stage_id === stageUpper,
          );
          return { ...row, to_stage_name, active_machines, line_has_machines };
        });
        return json({ data: formatted });
      }

      if (path === "/api/sx/ng/resolve" && request.method === "POST") {
        const p = await body(request);
        const lot = p.lot_number;
        const fromStage = String(p.from_stage || "").toUpperCase();
        const qty = parseInt(p.qty) || 0;
        const action = p.action;
        const returnStage = String(p.return_stage || "").toUpperCase();
        const userId = p.user_id || "";

        if (!lot || !fromStage || qty <= 0)
          return bad("Thiếu thông tin xử lý hàng NG.");
        if (!["SCRAP", "REWORK"].includes(action))
          return bad("Hình thức xử lý không hợp lệ.");
        if (action === "REWORK" && !returnStage)
          return bad("Vui lòng chọn công đoạn trả về.");

        const ngStageId = fromStage + "_NG";
        const ngInv = await env.DB.prepare(
          "SELECT ma_sp, quantity FROM Inventory WHERE lot_number = ? AND UPPER(stage_id) = ?",
        )
          .bind(lot, ngStageId)
          .first();
        if (!ngInv || Number(ngInv.quantity) < qty)
          return bad("Số lượng NG hiện có không đủ để xử lý.");

        const stmts = [
          env.DB.prepare(
            "UPDATE Inventory SET quantity = quantity - ?, updated_at = datetime('now','+7 hours') WHERE lot_number = ? AND UPPER(stage_id) = ?",
          ).bind(qty, lot, ngStageId),
        ];
        if (action === "REWORK") {
          stmts.push(
            env.DB.prepare(
              `INSERT INTO Inventory (ma_sp, lot_number, stage_id, quantity) VALUES (?, ?, ?, ?)
             ON CONFLICT(ma_sp, lot_number, stage_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = datetime('now','+7 hours')`,
            ).bind(ngInv.ma_sp, lot, returnStage, qty),
          );
        }
        stmts.push(
          env.DB.prepare(
            "INSERT INTO Transactions_Log (user_id, lot_number, from_stage, to_stage, qty, type, note) VALUES (?, ?, ?, ?, ?, 'NG', ?)",
          ).bind(
            userId,
            lot,
            ngStageId,
            action === "REWORK" ? returnStage : "SCRAP",
            qty,
            action === "SCRAP"
              ? "Báo hủy hàng NG"
              : "Làm lại, trả về " + returnStage,
          ),
        );

        await env.DB.batch(stmts);
        return json({ success: true });
      }

      if (path === "/api/sx/ng/list" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          `
          SELECT i.lot_number, i.ma_sp AS product_code, COALESCE(sp.ten_sp, '') AS product_name, SUM(i.quantity) AS ng_qty
          FROM Inventory i
          LEFT JOIN San_Pham sp ON sp.ma_sp = i.ma_sp
          WHERE (UPPER(i.stage_id) = 'NG' OR UPPER(i.stage_id) LIKE '%_NG') AND i.quantity > 0
          GROUP BY i.lot_number, i.ma_sp, sp.ten_sp
        `,
        ).all();
        return json({ data: results });
      }

      if (path === "/api/sx/history" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          `
          SELECT t.timestamp, u.ten_nv, t.user_id AS username, t.lot_number AS po_id,
                 t.type, t.qty, t.from_stage, t.to_stage,
                 COALESCE(po.ma_sp, 'UNKNOWN') AS product_code,
                 COALESCE(sp.ten_sp, '') AS product_name
          FROM Transactions_Log t
          LEFT JOIN Nguoi_Dung u ON u.ma_nv = t.user_id
          LEFT JOIN Production_Orders po ON po.po_number = t.lot_number
          LEFT JOIN San_Pham sp ON sp.ma_sp = po.ma_sp
          ORDER BY t.timestamp DESC LIMIT 500
        `,
        ).all();
        return json({ data: results });
      }

      return bad("API not found", 404);
    } catch (error) {
      return bad(error?.message || "Lỗi máy chủ.", 500);
    }
  },
};
