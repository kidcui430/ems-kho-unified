// ============================================================
// KHO NVL - KHỞI CHẠY MODULE KHO (js/kho/kho-main.js)
// Không xử lý đăng nhập/điều hướng vai trò ở đây - phần đó nằm ở
// js/main.js (router chung cho cả Kho NVL lẫn Sản Xuất).
// ============================================================
import { state, el, todayISO, toISO, escapeHtml, showToast, api, applyRoleUI } from "../state.js";

import {
  setupTypeOptions, onTypeChange, onCategoryChange, onItemChange,
  updateCaySteelImportCalc, updateCaySteelRatioCalc, updateCaySteelMetCalc,
  renderBomSuggestions, addAllBomToCart, addToCart, renderCart, submitTransaction, printCurrentCart,
  loadHistory, printFilteredHistory,
} from "./tx.js";

import { renderInventory, addItem, registerInventoryGlobals } from "./inventory.js";
import {
  renderSuppliers, addSupplier, renderProducts, addProduct, registerPartnerGlobals, registerCutRatioGlobals,
} from "./partners.js";
import { setQuickRange, loadReport, renderPieCharts, printReportPeriodVoucher, exportExcel } from "./reports.js";

export async function loadBootstrap() {
  try {
    const data = await api("/api/kho/bootstrap");
    state.inventoryData = data.items || [];
    state.supplierData = data.nccs || [];
    state.productData = data.products || [];
    state.bomData = data.boms || [];
    state.cutRatios = data.cutRatios || [];
    renderMasterData();
  } catch (e) {
    showToast("Không tải được dữ liệu gốc: " + e.message, true);
  }
}

function renderMasterData() {
  const catSet = new Set();
  for (let i = 0; i < state.inventoryData.length; i++) {
    if (state.inventoryData[i].phan_loai) catSet.add(state.inventoryData[i].phan_loai);
  }
  const cats = Array.from(catSet).sort(function (a, b) {
    return a.localeCompare(b, "vi");
  });

  let catHtml = '<option value="">-- Chọn phân loại --</option>';
  let catAllHtml = '<option value="">Tất cả nhóm</option>';
  let dataListHtml = "";

  for (let i = 0; i < cats.length; i++) {
    const safeCat = escapeHtml(cats[i]);
    catHtml += "<option>" + safeCat + "</option>";
    catAllHtml += "<option>" + safeCat + "</option>";
    dataListHtml += '<option value="' + safeCat + '"></option>';
  }

  el("categorySelect").innerHTML = catHtml;
  el("inventoryCategory").innerHTML = catAllHtml;
  el("categoryList").innerHTML = dataListHtml;

  let nccOpts = "";
  for (let i = 0; i < state.supplierData.length; i++) {
    const n = state.supplierData[i];
    nccOpts += '<option value="' + escapeHtml(n.ma_ncc) + '">' + escapeHtml(n.ma_ncc) + " | " + escapeHtml(n.ten_ncc) + "</option>";
  }
  el("txNcc").innerHTML = '<option value="">-- Tùy chọn NCC --</option>' + nccOpts;
  el("newSupplier").innerHTML = '<option value="">-- Không chọn --</option>' + nccOpts;

  let prodOpts = '<option value="">-- Chọn mã sản phẩm --</option>';
  for (let i = 0; i < state.productData.length; i++) {
    const p = state.productData[i];
    let label = escapeHtml(p.ma_sp) + " | " + escapeHtml(p.ten_sp);
    if (p.quy_cach) label += " (" + escapeHtml(p.quy_cach) + ")";
    prodOpts += '<option value="' + escapeHtml(p.ma_sp) + '">' + label + "</option>";
  }
  el("productSelect").innerHTML = prodOpts;

  renderInventory();
  renderSuppliers();
  renderProducts();
  renderBomSuggestions();
}

function setDefaultDateRanges() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  el("historyTo").value = toISO(now);
  el("historyFrom").value = toISO(now);
  el("reportFrom").value = toISO(firstDay);
  el("reportTo").value = toISO(now);
}

function switchTab(id) {
  const tabs = document.querySelectorAll("#kho-app .tab-content");
  for (let i = 0; i < tabs.length; i++) tabs[i].classList.add("hidden");
  const target = el(id);
  if (target) target.classList.remove("hidden");

  const btns = document.querySelectorAll("#kho-app .nav-btn");
  for (let i = 0; i < btns.length; i++) {
    if (btns[i].dataset.tab === id) btns[i].classList.add("active");
    else btns[i].classList.remove("active");
  }

  if (id === "tab-baocao") loadReport();
  if (id === "tab-giaodich") loadHistory();
  if (id === "tab-ncc") renderSuppliers();
  if (id === "tab-sanpham") renderProducts();
}

function switchSub(id) {
  const subs = document.querySelectorAll("#tab-giaodich .sub-content");
  for (let i = 0; i < subs.length; i++) subs[i].classList.add("hidden");
  const target = el(id);
  if (target) target.classList.remove("hidden");

  const btns = document.querySelectorAll("#tab-giaodich .sub-btn");
  for (let i = 0; i < btns.length; i++) {
    if (btns[i].dataset.sub === id) btns[i].classList.add("active");
    else btns[i].classList.remove("active");
  }

  if (id === "tx-history") loadHistory();
}

export async function enterKhoApp() {
  el("userInfo").textContent = state.user.ten_nv + " (" + (state.user.bo_phan || state.user.role) + ")";
  applyRoleUI();

  switchTab("tab-giaodich");
  switchSub("tx-create");

  el("txDate").value = todayISO();
  setupTypeOptions();
  setDefaultDateRanges();
  await loadBootstrap();
  await loadHistory();
}

export function bindKhoEvents() {
  registerInventoryGlobals(loadBootstrap);
  registerPartnerGlobals(loadBootstrap);
  registerCutRatioGlobals(loadBootstrap);

  el("logoutBtnKho").addEventListener("click", function () {
    window.logout();
  });

  el("typeSelect").addEventListener("change", onTypeChange);
  el("productSelect").addEventListener("change", function () {
    renderBomSuggestions();
    onItemChange();
  });
  el("bomTargetQty").addEventListener("input", renderBomSuggestions);
  el("addAllBomBtn").addEventListener("click", addAllBomToCart);

  el("categorySelect").addEventListener("change", onCategoryChange);
  el("itemSelect").addEventListener("change", onItemChange);

  // Panel NVL dạng cây thép: đổi nội dung theo loại GD (xem updateCaySteelPanel trong tx.js)
  el("qtyInput").addEventListener("input", updateCaySteelImportCalc);
  el("caySteelLengthInput").addEventListener("input", updateCaySteelImportCalc);
  el("caySteelConInput").addEventListener("input", updateCaySteelRatioCalc);
  el("cutLengthInput").addEventListener("input", updateCaySteelMetCalc);

  el("addToCartBtn").addEventListener("click", addToCart);
  el("printCartBtn").addEventListener("click", printCurrentCart);
  el("submitTxBtn").addEventListener("click", function () {
    submitTransaction(async function () {
      await loadBootstrap();
      await loadHistory();
    });
  });

  el("historyFilterBtn").addEventListener("click", loadHistory);
  el("printHistoryBtn").addEventListener("click", printFilteredHistory);

  el("inventoryCategory").addEventListener("change", renderInventory);
  el("inventorySearch").addEventListener("input", renderInventory);

  el("addItemBtn").addEventListener("click", function () {
    addItem(loadBootstrap);
  });
  el("addSupplierBtn").addEventListener("click", function () {
    addSupplier(loadBootstrap);
  });
  // Form "Thêm mã hàng" đã chuyển sang bên Sản Xuất, nút này có thể không còn trong HTML
  if (el("addProductBtn")) {
    el("addProductBtn").addEventListener("click", function () {
      addProduct(loadBootstrap);
    });
  }

  if (el("supplierSearch")) el("supplierSearch").addEventListener("input", renderSuppliers);
  if (el("productSearch")) el("productSearch").addEventListener("input", renderProducts);

  el("loadReportBtn").addEventListener("click", loadReport);
  el("printDailySummaryBtn").addEventListener("click", printReportPeriodVoucher);
  el("exportExcelBtn").addEventListener("click", exportExcel);
  if (el("chartProductFilter")) el("chartProductFilter").addEventListener("change", renderPieCharts);

  const quickBtns = document.querySelectorAll("#kho-app .quick-buttons button");
  for (let i = 0; i < quickBtns.length; i++) {
    quickBtns[i].addEventListener("click", function () {
      setQuickRange(this.dataset.range);
    });
  }

  const navBtns = document.querySelectorAll("#kho-app .nav-btn");
  for (let i = 0; i < navBtns.length; i++) {
    navBtns[i].addEventListener("click", function () {
      switchTab(this.dataset.tab);
    });
  }

  const subBtns = document.querySelectorAll("#tab-giaodich .sub-btn");
  for (let i = 0; i < subBtns.length; i++) {
    subBtns[i].addEventListener("click", function () {
      switchSub(this.dataset.sub);
    });
  }

  renderCart();
}
