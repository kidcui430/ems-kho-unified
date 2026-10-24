// ============================================================
// STATE DÙNG CHUNG CHO CẢ KHO NVL & SẢN XUẤT (js/state.js)
// ============================================================

// TODO: đổi lại URL này sau khi bạn deploy worker.js lên Cloudflare của bạn
export const API_URL = "https://api-ems-kho-unified.quangtriet430.workers.dev";

export const state = {
  user: null,

  // Kho NVL
  inventoryData: [],
  supplierData: [],
  productData: [],
  bomData: [],
  cutRatios: [],
  cart: [],
  historyRows: [],
  currentReportData: [],
  chartByProduct: [],
  chartByCategory: [],

  // Sản xuất
  globalStages: [],
  globalLines: [],
  globalMachines: [],
  productsCache: [],
  leaderPOsCache: [],
  currentMatrixData: null,
  historyLogCache: [],
  currentAllocations: [],
  allocationRowCount: 0,
};

export function el(id) {
  return document.getElementById(id);
}

export function fmt(n) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(n || 0));
}

export function toISO(d) {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
}

export function todayISO() {
  return toISO(new Date());
}

export function formatDateOnly(s) {
  if (!s) return "";
  const parts = s.slice(0, 10).split("-");
  if (parts.length < 3) return s;
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}

export function formatDateTime(s) {
  if (!s) return "";
  const timePart = s.length >= 16 ? " " + s.slice(11, 16) : "";
  return formatDateOnly(s) + timePart;
}

export function escapeHtml(v) {
  if (v === null || v === undefined) v = "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#39;")
    .replace(/"/g, "&quot;");
}

export function showToast(message, isError) {
  const toastEl = el("toast");
  if (!toastEl) return;
  toastEl.textContent = message;
  if (isError) toastEl.classList.add("error");
  else toastEl.classList.remove("error");
  toastEl.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function () {
    toastEl.classList.add("hidden");
  }, 3500);
}

export async function api(path, options) {
  const opts = options || {};
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  const res = await fetch(API_URL + path, Object.assign({}, opts, { headers }));
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    // ignore
  }
  if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
  return data;
}

// ---------------- Phân quyền phía Kho NVL ----------------
export function isWorkshop() {
  return Boolean(state.user && (state.user.bo_phan === "XUONG" || state.user.bo_phan === "SX"));
}

export function applyRoleUI() {
  const vpElements = document.querySelectorAll(".vp-only");
  for (let i = 0; i < vpElements.length; i++) {
    const elem = vpElements[i];
    if (elem.classList.contains("tab-content") || elem.classList.contains("sub-content") || elem.classList.contains("modal-overlay")) {
      if (isWorkshop()) elem.classList.add("hidden");
      continue;
    }
    if (isWorkshop()) elem.classList.add("hidden");
    else elem.classList.remove("hidden");
  }
}

export function typeLabel(type) {
  const map = {
    NHAP_KHO: "Nhập kho",
    XUAT_SAN_XUAT: "Xuất ra Line Sản Xuất",
    XUAT_XUONG: "Xuất cho xưởng",
    HOAN_TRA_XUONG: "Xưởng hoàn trả kho",
    TRA_KHO: "Trả hàng kho",
    HUY_KHO: "Xuất hủy / Kiểm kê giảm",
    HUY_XUONG: "Báo phế tại xưởng",
    OPENING: "Tồn đầu kỳ",
  };
  return map[type] || type;
}

export function formatRefInfo(slPhu, dvtPhu, quyCach, kg) {
  const parts = [];
  if (Number(slPhu) > 0) parts.push("<b>" + fmt(slPhu) + " " + escapeHtml(dvtPhu) + "</b>");
  if (quyCach) parts.push("<span>[" + escapeHtml(quyCach) + "]</span>");
  if (Number(kg) > 0) parts.push('<b style="color:var(--accent)">' + fmt(kg) + " Kg</b>");
  return parts.length > 0 ? parts.join(" • ") : "-";
}
