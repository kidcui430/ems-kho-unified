// ============================================================
// SẢN XUẤT - PHẦN DÙNG CHUNG: Stages/Lines/Machines, chuyển tab,
// lịch sử giao dịch (js/sx/sx-core.js)
// ============================================================
import { state, el, escapeHtml, showToast, api } from "../state.js";

export async function loadStagesLinesMachines() {
  try {
    const [stageRes, lineRes, machineRes] = await Promise.all([
      api("/api/stages"), api("/api/lines"), api("/api/machines"),
    ]);
    state.globalStages = stageRes.data || [];
    state.globalLines = lineRes.data || [];
    state.globalMachines = machineRes.data || [];
  } catch (e) {
    state.globalStages = [];
    state.globalLines = [];
    state.globalMachines = [];
  }

  let stageOpts = '<option value="">-- Chọn công đoạn --</option>';
  state.globalStages.forEach((col) => {
    stageOpts += `<option value="${col.stage_id}">${col.stage_name}</option>`;
  });
  if (el("ng-current-stage")) el("ng-current-stage").innerHTML = stageOpts;
  if (el("ng-return-stage")) el("ng-return-stage").innerHTML = stageOpts;

  try {
    const ngData = await api("/api/sx/ng/list");
    const poSelect = el("ng-po-select");
    if (poSelect) {
      let poOpts = '<option value="">-- Chọn Lô / PO --</option>';
      if (ngData.data && ngData.data.length > 0) {
        ngData.data.forEach((po) => {
          poOpts += `<option value="${po.lot_number}">${po.lot_number} [${po.product_code}] - Lỗi: ${po.ng_qty}</option>`;
        });
      } else {
        poOpts = '<option value="">-- Hiện không có hàng NG nào --</option>';
      }
      poSelect.innerHTML = poOpts;
    }
  } catch (e) {
    console.error("Lỗi nạp danh sách NG:", e);
  }
}

window.switchTab = function (role, tabId) {
  let container = role === "admin" ? el("admin-screen") : el("leader-screen");
  let btnClass = role === "admin" ? ".sidebar .tab-btn" : ".tabs-mobile .tab-btn-mobile";
  let tabClass = role === "admin" ? ".app-body .tab-content" : ".content-mobile .tab-content";

  container.querySelectorAll(tabClass).forEach((tab) => {
    tab.classList.remove("active");
    tab.classList.add("hidden");
  });
  container.querySelectorAll(btnClass).forEach((btn) => btn.classList.remove("active"));

  el(tabId).classList.remove("hidden");
  el(tabId).classList.add("active");
  if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add("active");

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

  const uniqueKeywords = [...new Set([...historyLogCache.map((h) => h.po_id), ...historyLogCache.map((h) => h.product_code)])].filter(Boolean);
  const suggestHTML = uniqueKeywords.map((k) => `<option value="${k}">`).join("");
  if (el("hist-suggest")) el("hist-suggest").innerHTML = suggestHTML;
  if (el("hist-suggest-ld")) el("hist-suggest-ld").innerHTML = suggestHTML;
}

window.filterHistoryLog = function (role) {
  const isLd = role === "leader";
  const dateFrom = el(isLd ? "hist-date-from-ld" : "hist-date-from")?.value || "";
  const dateTo = el(isLd ? "hist-date-to-ld" : "hist-date-to")?.value || "";
  const stageVal = el(isLd ? "hist-stage-ld" : "hist-stage")?.value || "";
  const keyword = (el(isLd ? "hist-keyword-ld" : "hist-keyword")?.value || "").toUpperCase().trim();

  const filtered = historyLogCache.filter((log) => {
    let matchDate = true;
    if (log.timestamp) {
      const logDate = log.timestamp.split(" ")[0];
      if (dateFrom && logDate < dateFrom) matchDate = false;
      if (dateTo && logDate > dateTo) matchDate = false;
    }
    let matchStage = true;
    if (stageVal) matchStage = log.from_stage === stageVal || log.to_stage === stageVal;
    let matchKw = true;
    if (keyword) {
      const po = (log.po_id || "").toUpperCase();
      const prd = (log.product_code || "").toUpperCase();
      matchKw = po.includes(keyword) || prd.includes(keyword);
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
            timeStr = utcDate.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false });
          } catch (e) {}
        }
        const typeStyle = log.type === "PASS" ? "color:#48BB78; font-weight:bold;" : "color:#ea580c; font-weight:bold;";
        const nameStr = log.ten_nv ? `${log.ten_nv} (${log.username})` : log.username || "Hệ thống";

        return `<tr>
                <td>${timeStr}</td>
                <td>${escapeHtml(nameStr)}</td>
                <td style="color:var(--navy); font-weight:bold;">${escapeHtml(log.product_code || "-")}</td>
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
  const st = state.globalStages.find((s) => s.stage_id === String(stageId).toUpperCase());
  return st ? st.stage_name : stageId;
}
