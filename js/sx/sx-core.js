// ============================================================
// SẢN XUẤT - PHẦN DÙNG CHUNG: Stages/Lines/Machines, chuyển tab,
// lịch sử giao dịch & hàm tính thời gian chạy máy (js/sx/sx-core.js)
// ============================================================
import { state, el, escapeHtml, api } from "../state.js";

// Trả về tên sản phẩm từ Mã SP trong cache
export function getProductName(maSp) {
  if (!maSp) return "";
  const code = String(maSp).trim().toUpperCase();
  const found =
    (state.productsCache || []).find(
      (p) => String(p.ma_sp).toUpperCase() === code,
    ) ||
    (state.productData || []).find(
      (p) => String(p.ma_sp).toUpperCase() === code,
    );
  return found ? found.ten_sp || "" : "";
}

// Hiển thị chuẩn: "SP001 - Trục vít dẫn hướng"
export function formatSpDisplay(maSp, fallbackName) {
  if (!maSp) return "-";
  const name = fallbackName || getProductName(maSp);
  return name ? `${maSp} - ${name}` : maSp;
}

// Tính khoảng thời gian từ startStr đến endStr (hoặc đến hiện tại nếu đang chạy)
export function calcDurationText(startStr, endStr) {
  if (!startStr) return "-";
  const parseTime = (s) => {
    const clean = String(s).trim();
    if (clean.length === 10)
      return new Date(clean + "T08:00:00+07:00").getTime();
    return new Date(
      clean.replace(" ", "T") +
        (clean.includes("Z") || clean.includes("+") ? "" : "+07:00"),
    ).getTime();
  };
  const t1 = parseTime(startStr);
  const t2 = endStr ? parseTime(endStr) : Date.now();
  if (!Number.isFinite(t1) || !Number.isFinite(t2)) return "-";

  const diffMins = Math.max(Math.round((t2 - t1) / 60000), 1);
  const days = Math.floor(diffMins / 1440);
  const hours = Math.floor((diffMins % 1440) / 60);
  const mins = diffMins % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}p`);
  return parts.join(" ");
}

export async function loadStagesLinesMachines() {
  try {
    const [stageRes, lineRes, machineRes, prodRes] = await Promise.all([
      api("/api/stages"),
      api("/api/lines"),
      api("/api/machines"),
      api("/api/products").catch(() => ({ products: [] })),
    ]);
    state.globalStages = stageRes.data || [];
    state.globalLines = lineRes.data || [];
    state.globalMachines = machineRes.data || [];
    if (prodRes.products && prodRes.products.length > 0) {
      state.productsCache = prodRes.products;
    }
  } catch (e) {
    state.globalStages = [];
    state.globalLines = [];
    state.globalMachines = [];
  }

  try {
    const ngData = await api("/api/sx/ng/list");
    const poSelect = el("ng-po-select");
    if (poSelect) {
      let poOpts =
        '<option value="">-- Chọn LOT đang có hàng lỗi NG --</option>';
      if (ngData.data && ngData.data.length > 0) {
        ngData.data.forEach((po) => {
          const spLabel = formatSpDisplay(po.product_code, po.product_name);
          const stgName = stageName(po.from_stage);
          const valObj = JSON.stringify({
            lot_number: po.lot_number,
            from_stage: po.from_stage,
            product_code: po.product_code,
            ng_qty: Number(po.ng_qty),
          });
          poOpts += `<option value='${escapeHtml(valObj)}'>LOT: ${escapeHtml(po.lot_number)} [${escapeHtml(spLabel)}] — Có ${po.ng_qty} pcs NG tại: ${escapeHtml(stgName)}</option>`;
        });
      } else {
        poOpts = '<option value="">-- Hiện không có hàng NG nào --</option>';
      }
      poSelect.innerHTML = poOpts;
      if (typeof window.onNgLotSelectChange === "function")
        window.onNgLotSelectChange();
    }
  } catch (e) {
    console.error("Lỗi nạp danh sách NG:", e);
  }
}

window.switchTab = function (role, tabId) {
  let container = role === "admin" ? el("admin-screen") : el("leader-screen");
  let btnClass =
    role === "admin" ? ".sidebar .tab-btn" : ".tabs-mobile .tab-btn-mobile";
  let tabClass =
    role === "admin"
      ? ".app-body .tab-content"
      : ".content-mobile .tab-content";

  container.querySelectorAll(tabClass).forEach((tab) => {
    tab.classList.remove("active");
    tab.classList.add("hidden");
  });
  container
    .querySelectorAll(btnClass)
    .forEach((btn) => btn.classList.remove("active"));

  el(tabId).classList.remove("hidden");
  el(tabId).classList.add("active");
  if (window.event && window.event.currentTarget)
    window.event.currentTarget.classList.add("active");

  if (role === "admin" && tabId === "tab-matrix") window.fetchMatrixReport();
  if (role === "admin" && tabId === "tab-history") fetchHistoryLog();
  if (role === "leader" && tabId === "tab-history-leader") fetchHistoryLog();
};

let historyLogCache = [];

export async function fetchHistoryLog() {
  try {
    const res = await api("/api/sx/history");
    if (res.data) {
      historyLogCache = res.data;
      state.historyLogCache = historyLogCache;
      populateHistoryFilters();
      window.filterHistoryLog("admin");
      window.filterHistoryLog("leader");
    }
  } catch (e) {
    console.error("Lỗi tải lịch sử:", e);
  }
}

function populateHistoryFilters() {
  let stageOpts = '<option value="">-- Mọi công đoạn --</option>';
  state.globalStages.forEach((st) => {
    stageOpts += `<option value="${st.stage_id}">${st.stage_name}</option>`;
  });
  if (el("hist-stage")) el("hist-stage").innerHTML = stageOpts;
  if (el("hist-stage-ld")) el("hist-stage-ld").innerHTML = stageOpts;

  const uniqueKeywords = [
    ...new Set([
      ...historyLogCache.map((h) => h.po_id),
      ...historyLogCache.map((h) => h.product_code),
    ]),
  ].filter(Boolean);
  const suggestHTML = uniqueKeywords
    .map((k) => `<option value="${k}">${formatSpDisplay(k)}</option>`)
    .join("");
  if (el("hist-suggest")) el("hist-suggest").innerHTML = suggestHTML;
  if (el("hist-suggest-ld")) el("hist-suggest-ld").innerHTML = suggestHTML;
}

window.filterHistoryLog = function (role) {
  const isLd = role === "leader";
  const dateFrom =
    el(isLd ? "hist-date-from-ld" : "hist-date-from")?.value || "";
  const dateTo = el(isLd ? "hist-date-to-ld" : "hist-date-to")?.value || "";
  const stageVal = el(isLd ? "hist-stage-ld" : "hist-stage")?.value || "";
  const keyword = (el(isLd ? "hist-keyword-ld" : "hist-keyword")?.value || "")
    .toUpperCase()
    .trim();

  const filtered = historyLogCache.filter((log) => {
    let matchDate = true;
    if (log.timestamp) {
      const logDate = log.timestamp.split(" ")[0];
      if (dateFrom && logDate < dateFrom) matchDate = false;
      if (dateTo && logDate > dateTo) matchDate = false;
    }
    let matchStage = true;
    if (stageVal)
      matchStage =
        (log.from_stage || "").includes(stageVal) ||
        (log.to_stage || "").includes(stageVal);
    let matchKw = true;
    if (keyword) {
      const po = (log.po_id || "").toUpperCase();
      const prd = (log.product_code || "").toUpperCase();
      const prdName = (
        log.product_name ||
        getProductName(prd) ||
        ""
      ).toUpperCase();
      matchKw =
        po.includes(keyword) ||
        prd.includes(keyword) ||
        prdName.includes(keyword);
    }
    return matchDate && matchStage && matchKw;
  });

  renderHistoryTable(filtered, isLd ? "history-tbody-leader" : "history-tbody");
};

function renderHistoryTable(data, tbodyId) {
  const tbody = el(tbodyId);
  if (!tbody) return;

  if (data.length > 0) {
    tbody.innerHTML = data
      .map((log) => {
        let timeStr = "Chưa rõ";
        if (log.timestamp) {
          try {
            const utcDate = new Date(log.timestamp.replace(" ", "T") + "Z");
            timeStr = utcDate.toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              hour12: false,
            });
          } catch (e) {}
        }
        const typeStyle =
          log.type === "PASS"
            ? "color:#48BB78; font-weight:bold;"
            : "color:#ea580c; font-weight:bold;";
        const nameStr = log.ten_nv
          ? `${log.ten_nv} (${log.username})`
          : log.username || "Hệ thống";
        const spName = log.product_name || getProductName(log.product_code);

        return `<tr>
                <td>${timeStr}</td>
                <td>${escapeHtml(nameStr)}</td>
                <td>
                  <strong style="color:var(--navy);">${escapeHtml(log.product_code || "-")}</strong>
                  ${spName ? `<br><small style="color:#475569;">${escapeHtml(spName)}</small>` : ""}
                </td>
                <td style="font-weight:bold;">${escapeHtml(log.po_id || "-")}</td>
                <td style="${typeStyle}">${log.type || "-"}</td>
                <td style="font-weight:bold; color:#e53e3e;">${log.qty || 0}</td>
                <td>${escapeHtml(log.from_stage || "-")}</td>
                <td>${escapeHtml(log.to_stage || "-")}</td>
            </tr>`;
      })
      .join("");
  } else {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Không tìm thấy giao dịch nào!</td></tr>`;
  }
}

export function stageName(stageId) {
  const st = state.globalStages.find(
    (s) => s.stage_id === String(stageId).toUpperCase(),
  );
  return st ? st.stage_name : stageId;
}
