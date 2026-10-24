// ============================================================
// KHO NVL - GIAO DỊCH NHẬP/XUẤT, GỢI Ý BOM & LỊCH SỬ (js/kho/tx.js)
// ============================================================
import {
  state, el, fmt, escapeHtml, formatDateOnly, formatDateTime, typeLabel,
  formatRefInfo, showToast, api, isWorkshop,
} from "../state.js";
import { openPrintVoucher } from "./print.js";

export function setupTypeOptions() {
  const typeEl = el("typeSelect");
  if (!typeEl) return;

  typeEl.innerHTML =
    '<option value="XUAT_SAN_XUAT">Xuất ra Line Sản Xuất</option>' +
    '<option value="NHAP_KHO">Nhập hàng vào Kho</option>' +
    '<option value="HOAN_TRA_XUONG">Xưởng hoàn trả NVL về Kho</option>' +
    '<option value="HUY_KHO">Xuất hủy / Kiểm kê giảm</option>';
  typeEl.disabled = false;

  const histTypeEl = el("historyType");
  if (histTypeEl) {
    histTypeEl.innerHTML =
      '<option value="">Tất cả loại GD</option>' +
      '<option value="XUAT_SAN_XUAT">Xuất Sản Xuất</option>' +
      '<option value="NHAP_KHO">Nhập kho</option>' +
      '<option value="HOAN_TRA_XUONG">Hoàn trả kho</option>' +
      '<option value="HUY_KHO">Xuất hủy / Kiểm kê</option>';
  }
  onTypeChange();
}

export function onTypeChange() {
  const type = el("typeSelect").value;
  // NCC & Đơn giá là mối quan tâm của VP/thu mua; Xưởng luôn ẩn 2 trường này
  // kể cả khi tự nhập kho tại chỗ, để form gọn hơn trên màn hình điện thoại.
  if (type === "NHAP_KHO" && !isWorkshop()) {
    el("nccWrap").classList.remove("hidden");
    el("priceWrap").classList.remove("hidden");
  } else {
    el("nccWrap").classList.add("hidden");
    el("priceWrap").classList.add("hidden");
  }

  if (type === "XUAT_SAN_XUAT") {
    el("productWrap").classList.remove("hidden");
    renderBomSuggestions();
  } else {
    el("productWrap").classList.add("hidden");
    el("bomSuggestPanel").classList.add("hidden");
  }

  updateCaySteelPanel();
}

export function renderBomSuggestions() {
  const type = el("typeSelect").value;
  const maSp = el("productSelect").value;
  const panel = el("bomSuggestPanel");

  if (type !== "XUAT_SAN_XUAT" || !maSp) {
    panel.classList.add("hidden");
    return;
  }

  const bomList = [];
  for (let i = 0; i < state.bomData.length; i++) {
    if (state.bomData[i].ma_sp === maSp) bomList.push(state.bomData[i]);
  }

  panel.classList.remove("hidden");
  const tbody = el("bomSuggestTable").querySelector("tbody");

  if (bomList.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-muted">' +
      "Mã hàng này chưa được VP cài đặt định mức BOM. Bạn vẫn có thể chọn xuất bất kỳ NVL nào bên dưới bình thường." +
      "</td></tr>";
    return;
  }

  const targetQty = Number(el("bomTargetQty").value) || 1;
  let html = "";

  for (let i = 0; i < bomList.length; i++) {
    const b = bomList[i];
    let invItem = null;
    for (let j = 0; j < state.inventoryData.length; j++) {
      if (state.inventoryData[j].ma_hang === b.ma_hang) {
        invItem = state.inventoryData[j];
        break;
      }
    }
    const tonKho = invItem ? Number(invItem.ton_kho || 0) : 0;
    const suggested = Number(b.dinh_muc) > 0 ? Number((Number(b.dinh_muc) * targetQty).toFixed(3)) : 0;

    const stockColor =
      tonKho <= 0 || (suggested > 0 && tonKho < suggested) ? "color:var(--danger); font-weight:bold;" : "color:var(--success); font-weight:bold;";

    html +=
      "<tr>" +
      "<td><b>" + escapeHtml(b.ma_hang) + "</b></td>" +
      "<td>" + escapeHtml(b.ten_hang) + (b.ghi_chu ? '<br><small class="text-muted">' + escapeHtml(b.ghi_chu) + "</small>" : "") + "</td>" +
      "<td>" + escapeHtml(b.don_vi_tinh) + "</td>" +
      "<td><b>" + (Number(b.dinh_muc) > 0 ? fmt(b.dinh_muc) : "Tùy chọn") + "</b></td>" +
      '<td style="color:var(--accent); font-weight:bold;">' + (suggested > 0 ? fmt(suggested) : "-") + "</td>" +
      '<td style="' + stockColor + '">' + fmt(tonKho) + "</td>" +
      "<td>" + `<button type="button" class="btn-sm" onclick="pickBomItem('${escapeHtml(b.ma_hang)}', ${suggested})">Chọn ↓</button>` + "</td>" +
      "</tr>";
  }
  tbody.innerHTML = html;
}

window.pickBomItem = function (maHang, suggestedQty) {
  let item = null;
  for (let i = 0; i < state.inventoryData.length; i++) {
    if (state.inventoryData[i].ma_hang === maHang) {
      item = state.inventoryData[i];
      break;
    }
  }
  if (!item) return showToast("Không tìm thấy NVL trong danh mục.", true);

  el("categorySelect").value = item.phan_loai;
  onCategoryChange();
  el("itemSelect").value = item.ma_hang;
  onItemChange();

  if (Number(suggestedQty) > 0) el("qtyInput").value = suggestedQty;
  else el("qtyInput").focus();
  showToast("Đã điền gợi ý NVL " + item.ma_hang + " xuống khung nhập.");
};

export function addAllBomToCart() {
  const maSp = el("productSelect").value;
  if (!maSp) return showToast("Vui lòng chọn Mã sản phẩm trước.", true);

  const targetQty = Number(el("bomTargetQty").value) || 1;
  const bomList = state.bomData.filter(function (b) {
    return b.ma_sp === maSp && Number(b.dinh_muc) > 0;
  });

  if (bomList.length === 0) {
    return showToast("Chưa có dòng BOM nào có định mức > 0 để nạp tự động.", true);
  }

  let addedCount = 0;
  for (let i = 0; i < bomList.length; i++) {
    const b = bomList[i];
    const inv = state.inventoryData.find(function (x) {
      return x.ma_hang === b.ma_hang;
    });
    if (!inv || inv.trang_thai === "BLOCKED") continue;

    const reqQty = Number((Number(b.dinh_muc) * targetQty).toFixed(3));
    if (reqQty <= 0) continue;

    if (reqQty > Number(inv.ton_kho || 0)) {
      showToast("NVL " + inv.ma_hang + " tồn kho (" + fmt(inv.ton_kho) + ") nhỏ hơn mức gợi ý (" + fmt(reqQty) + "). Hãy nhập tay số thực xuất.", true);
      continue;
    }

    state.cart.push({
      ma_hang: inv.ma_hang, phan_loai: inv.phan_loai, ten_hang: inv.ten_hang, don_vi_tinh: inv.don_vi_tinh,
      loai_giao_dich: "XUAT_SAN_XUAT", so_luong: reqQty, sl_phu: 0, dvt_phu: "",
      quy_cach_gd: "Theo BOM (" + targetQty + " SP)", khoi_luong_kg: 0, ma_ncc: "", ma_sp_sx: maSp,
      so_chung_tu: el("docInput").value.trim(), don_gia: 0, ghi_chu: b.ghi_chu || el("noteInput").value.trim(),
    });
    addedCount++;
  }

  renderCart();
  if (addedCount > 0) showToast("Đã nạp " + addedCount + " NVL theo định mức BOM vào Phiếu tạm.");
}

export function onCategoryChange() {
  const cat = el("categorySelect").value;
  const sel = el("itemSelect");
  sel.disabled = !cat;

  let html = '<option value="">-- Chọn NVL --</option>';
  for (let i = 0; i < state.inventoryData.length; i++) {
    const item = state.inventoryData[i];
    if (item.phan_loai === cat && item.trang_thai !== "INACTIVE") {
      let label = escapeHtml(item.ma_hang) + " | " + escapeHtml(item.ten_hang);
      if (item.quy_cach) label += " (" + escapeHtml(item.quy_cach) + ")";
      html += '<option value="' + escapeHtml(item.ma_hang) + '">' + label + "</option>";
    }
  }
  sel.innerHTML = html;
  el("stockPanel").classList.add("hidden");
}

export function onItemChange() {
  const val = el("itemSelect").value;
  const item = state.inventoryData.find(function (x) {
    return x.ma_hang === val;
  });

  if (!item) {
    el("stockPanel").classList.add("hidden");
    return;
  }

  el("stockPanel").classList.remove("hidden");
  el("stockWarehouse").textContent = fmt(item.ton_kho);
  el("stockUnit").textContent = item.don_vi_tinh || "-";

  updateCaySteelPanel();

  const type = el("typeSelect").value;
  const maSp = el("productSelect").value;
  if (item.trang_thai === "BLOCKED") {
    el("stockStatus").textContent = "CHẶN XUẤT";
    el("stockStatus").style.color = "var(--danger)";
  } else if (type === "XUAT_SAN_XUAT" && maSp) {
    const bomMatch = state.bomData.find(function (b) {
      return b.ma_sp === maSp && b.ma_hang === item.ma_hang;
    });
    if (bomMatch) {
      el("stockStatus").textContent = "Thuộc BOM (ĐM: " + fmt(bomMatch.dinh_muc) + ")";
      el("stockStatus").style.color = "#0284c7";
    } else {
      el("stockStatus").textContent = "Ngoài BOM (Vẫn cho xuất)";
      el("stockStatus").style.color = "var(--warning)";
    }
  } else {
    el("stockStatus").textContent = "Bình thường";
    el("stockStatus").style.color = "var(--success)";
  }
}

// ============================================================
// NVL DẠNG CÂY/THANH (he_so_kg_m > 0): panel đổi nội dung theo loại GD
// - NHAP_KHO: nhập chiều dài mỗi cây, tự tính tổng Kg từ Số cây (SL chính)
// - XUAT_SAN_XUAT có khai báo Tỷ lệ cắt cho (Mã SP, Mã NVL): gợi ý Số cây
//   cần xuất từ Số con cần sản xuất
// - XUAT_SAN_XUAT chưa có tỷ lệ cắt: cắt mét thủ công (hành vi cũ)
// ============================================================
function currentCaySteelItem() {
  const val = el("itemSelect").value;
  return state.inventoryData.find(function (x) {
    return x.ma_hang === val;
  });
}

export function updateCaySteelPanel() {
  const panel = el("caySteelPanel");
  if (!panel) return;
  const importMode = el("caySteelImportMode");
  const ratioMode = el("caySteelRatioMode");
  const metMode = el("caySteelMetMode");
  importMode.classList.add("hidden");
  ratioMode.classList.add("hidden");
  metMode.classList.add("hidden");

  const item = currentCaySteelItem();
  if (!item || !(Number(item.he_so_kg_m) > 0)) {
    panel.classList.add("hidden");
    return;
  }

  const type = el("typeSelect").value;

  if (type === "NHAP_KHO") {
    panel.classList.remove("hidden");
    importMode.classList.remove("hidden");
    if (!el("caySteelLengthInput").value) el("caySteelLengthInput").value = item.chieu_dai_chuan_m || "";
    updateCaySteelImportCalc();
    return;
  }

  if (type === "XUAT_SAN_XUAT") {
    const maSp = el("productSelect").value;
    const ratio = maSp
      ? state.cutRatios.find(function (r) {
          return r.ma_sp === maSp && r.ma_hang === item.ma_hang;
        })
      : null;

    panel.classList.remove("hidden");
    if (ratio) {
      ratioMode.classList.remove("hidden");
      el("caySteelRatioHint").textContent =
        "1 cây (" + fmt(ratio.chieu_dai_chuan_m) + "m) cắt được " + fmt(ratio.so_con_moi_cay) + " con" + (ratio.ghi_chu ? " · " + ratio.ghi_chu : "") + ". Phần dư đầu/đuôi sau khi cắt, hãy trả về kho bằng phiếu Hoàn trả với mã Phế liệu.";
    } else {
      metMode.classList.remove("hidden");
      el("cutLengthUnitHint").textContent = item.don_vi_tinh || "Kg";
      let hint = "Quy đổi chuẩn: " + fmt(item.he_so_kg_m) + " Kg/mét";
      if (Number(item.chieu_dai_chuan_m) > 0) hint += " · cây chuẩn " + fmt(item.chieu_dai_chuan_m) + "m";
      el("cutLengthHint").textContent = hint;
    }
    return;
  }

  panel.classList.add("hidden");
}

export function updateCaySteelImportCalc() {
  const item = currentCaySteelItem();
  if (!item) return;
  const soCay = Number(el("qtyInput").value) || 0;
  const length = Number(el("caySteelLengthInput").value) || 0;
  const tongMet = soCay * length;
  const tongKg = Number((tongMet * Number(item.he_so_kg_m)).toFixed(3));
  el("caySteelImportHint").textContent =
    soCay > 0 && length > 0
      ? "Tổng: " + fmt(tongMet) + " m ≈ " + fmt(tongKg) + " Kg"
      : "Nhập Số cây ở ô bên dưới và chiều dài mỗi cây để xem tổng Kg.";
}

export function updateCaySteelRatioCalc() {
  const item = currentCaySteelItem();
  const maSp = el("productSelect").value;
  if (!item || !maSp) return;
  const ratio = state.cutRatios.find(function (r) {
    return r.ma_sp === maSp && r.ma_hang === item.ma_hang;
  });
  if (!ratio) return;
  const soCon = Number(el("caySteelConInput").value) || 0;
  if (soCon <= 0) return;
  el("qtyInput").value = Math.ceil(soCon / Number(ratio.so_con_moi_cay));
}

export function updateCaySteelMetCalc() {
  const item = currentCaySteelItem();
  if (!item || !(Number(item.he_so_kg_m) > 0)) return;
  const meters = Number(el("cutLengthInput").value) || 0;
  const chieuDai = Number(item.chieu_dai_chuan_m) || 0;
  if (meters <= 0 || chieuDai <= 0) return;
  // ĐVT chuẩn là Cây: số cây tương đương = số mét cắt / chiều dài 1 cây (có thể lẻ)
  el("qtyInput").value = Number((meters / chieuDai).toFixed(3));
}

export function addToCart() {
  const val = el("itemSelect").value;
  const item = state.inventoryData.find(function (x) {
    return x.ma_hang === val;
  });

  const qty = Number(el("qtyInput").value);
  const type = el("typeSelect").value;

  if (!item) return showToast("Hãy chọn Nguyên Vật Liệu.", true);
  if (!Number.isFinite(qty) || qty <= 0) return showToast("Số lượng chính phải lớn hơn 0.", true);
  if (item.trang_thai === "BLOCKED" && type === "XUAT_SAN_XUAT") return showToast("NVL này đang bị khóa xuất.", true);
  if (type === "XUAT_SAN_XUAT" && !el("productSelect").value) {
    return showToast("Vui lòng chọn Mã hàng sản xuất khi xuất ra chuyền.", true);
  }

  let inCartOut = 0;
  for (let i = 0; i < state.cart.length; i++) {
    if (state.cart[i].ma_hang === item.ma_hang && (state.cart[i].loai_giao_dich === "XUAT_SAN_XUAT" || state.cart[i].loai_giao_dich === "HUY_KHO")) {
      inCartOut += Number(state.cart[i].so_luong || 0);
    }
  }

  if ((type === "XUAT_SAN_XUAT" || type === "HUY_KHO") && qty + inCartOut > Number(item.ton_kho || 0)) {
    return showToast("Số lượng vượt quá Tồn Kho hiện tại (" + fmt(item.ton_kho) + ").", true);
  }

  const maSp = type === "XUAT_SAN_XUAT" ? el("productSelect").value : "";
  const caySteel = buildCaySteelMeta(item, type, qty, maSp);

  state.cart.push({
    ma_hang: item.ma_hang, phan_loai: item.phan_loai, ten_hang: item.ten_hang, don_vi_tinh: item.don_vi_tinh,
    loai_giao_dich: type, so_luong: qty, sl_phu: 0, dvt_phu: "",
    quy_cach_gd: caySteel.quy_cach_gd, khoi_luong_kg: caySteel.khoi_luong_kg,
    ma_ncc: type === "NHAP_KHO" ? el("txNcc").value : "", ma_sp_sx: maSp,
    so_chung_tu: el("docInput").value.trim(), don_gia: type === "NHAP_KHO" ? Number(el("priceInput").value || 0) : 0,
    ghi_chu: el("noteInput").value.trim(),
  });

  renderCart();
  el("qtyInput").value = "";
  el("noteInput").value = "";
  if (el("caySteelLengthInput")) el("caySteelLengthInput").value = "";
  if (el("caySteelConInput")) el("caySteelConInput").value = "";
  if (el("cutLengthInput")) el("cutLengthInput").value = "";
  updateCaySteelPanel();
}

// Suy ra Quy cách/Kg của dòng hàng từ panel cây thép đang hiện (nếu có),
// thay cho khối "Quy cách đóng gói" cũ đã ẩn.
function buildCaySteelMeta(item, type, qty, maSp) {
  if (!item || !(Number(item.he_so_kg_m) > 0)) return { quy_cach_gd: "", khoi_luong_kg: 0 };

  if (type === "NHAP_KHO") {
    const length = Number(el("caySteelLengthInput")?.value) || 0;
    const kg = Number((qty * length * Number(item.he_so_kg_m)).toFixed(3));
    return { quy_cach_gd: length > 0 ? "Cây dài " + fmt(length) + "m" : "", khoi_luong_kg: kg };
  }

  if (type === "XUAT_SAN_XUAT") {
    const ratio = maSp
      ? state.cutRatios.find(function (r) {
          return r.ma_sp === maSp && r.ma_hang === item.ma_hang;
        })
      : null;
    if (ratio) {
      const soCon = Number(el("caySteelConInput")?.value) || 0;
      const note = "Tỷ lệ cắt: " + fmt(ratio.so_con_moi_cay) + " con/cây" + (soCon > 0 ? " (cần " + fmt(soCon) + " con)" : "");
      const kg = Number((qty * Number(item.chieu_dai_chuan_m || 0) * Number(item.he_so_kg_m)).toFixed(3));
      return { quy_cach_gd: note, khoi_luong_kg: kg };
    }
    const meters = Number(el("cutLengthInput")?.value) || 0;
    if (meters > 0) {
      const kg = Number((meters * Number(item.he_so_kg_m)).toFixed(3));
      return { quy_cach_gd: "Cắt " + fmt(meters) + " m", khoi_luong_kg: kg };
    }
  }

  return { quy_cach_gd: "", khoi_luong_kg: 0 };
}

export function renderCart() {
  const tbody = el("cartTable").querySelector("tbody");
  if (state.cart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Chưa có vật tư nào trong phiếu tạm.</td></tr>';
    return;
  }

  let html = "";
  for (let i = 0; i < state.cart.length; i++) {
    const x = state.cart[i];
    const quyDoi = formatRefInfo(x.sl_phu, x.dvt_phu, x.quy_cach_gd, x.khoi_luong_kg);

    html +=
      "<tr>" +
      "<td><b>" + escapeHtml(x.ma_hang) + "</b><br>" + escapeHtml(x.ten_hang) + "</td>" +
      "<td>" + quyDoi + "</td>" +
      "<td>" + escapeHtml(typeLabel(x.loai_giao_dich)) + "</td>" +
      "<td><b>" + escapeHtml(x.ma_sp_sx || x.ma_ncc || "-") + "</b></td>" +
      "<td><b>" + fmt(x.so_luong) + "</b> " + escapeHtml(x.don_vi_tinh) + "</td>" +
      "<td>" + escapeHtml(x.ghi_chu || "-") + "</td>" +
      '<td><button class="danger btn-sm" onclick="removeCart(' + i + ')">Xóa</button></td>' +
      "</tr>";
  }
  tbody.innerHTML = html;
}

window.removeCart = function (idx) {
  state.cart.splice(idx, 1);
  renderCart();
};

export async function submitTransaction(onSuccessReload) {
  if (state.cart.length === 0) return showToast("Phiếu tạm đang trống.", true);
  try {
    await api("/api/kho/transactions", {
      method: "POST",
      body: JSON.stringify({ user_id: state.user.ma_nv, tx_date: el("txDate").value, transactions: state.cart }),
    });
    state.cart = [];
    renderCart();
    showToast("Đã ghi sổ giao dịch và cập nhật tồn kho thành công!");
    if (typeof onSuccessReload === "function") await onSuccessReload();
    onItemChange();
    renderBomSuggestions();
  } catch (e) {
    showToast(e.message, true);
  }
}

export function printCurrentCart() {
  if (state.cart.length === 0) return showToast("Hãy thêm ít nhất 1 NVL vào phiếu tạm để in.", true);
  const firstType = state.cart[0].loai_giao_dich;
  const title = firstType === "NHAP_KHO" ? "PHIẾU NHẬP KHO NGUYÊN VẬT LIỆU" : "PHIẾU XUẤT KHO SẢN XUẤT";
  const txDate = el("txDate").value;

  openPrintVoucher({
    title, subtitle: "Bản in từ Phiếu giao dịch ngày " + formatDateOnly(txDate), dateStr: formatDateOnly(txDate),
    docNo: el("docInput").value.trim() || "PX-" + txDate.replace(/-/g, ""),
    targetInfo: firstType === "XUAT_SAN_XUAT" ? "Xuất cho Mã hàng SX: " + (state.cart[0].ma_sp_sx || "-") : "Nhập kho vật tư",
    rows: state.cart,
  });
}

export async function loadHistory() {
  try {
    const params = new URLSearchParams();
    if (el("historyFrom").value) params.set("from", el("historyFrom").value);
    if (el("historyTo").value) params.set("to", el("historyTo").value);
    if (el("historyType").value) params.set("type", el("historyType").value);
    const qEl = el("historyQ");
    if (qEl && qEl.value.trim()) params.set("q", qEl.value.trim());

    const data = await api("/api/kho/history?" + params.toString());
    state.historyRows = data.rows || [];
    renderHistory(state.historyRows);
  } catch (e) {
    showToast(e.message, true);
  }
}

export function renderHistory(rows) {
  const tbody = el("historyTable").querySelector("tbody");
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không có giao dịch nào trong khoảng lọc này.</td></tr>';
    return;
  }

  let html = "";
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const refStr = formatRefInfo(r.sl_phu, r.dvt_phu, r.quy_cach_gd, r.khoi_luong_kg);
    const subLine = refStr !== "-" ? '<br><small class="text-muted">ĐG: ' + refStr + "</small>" : "";
    const ctLine = r.so_chung_tu ? '<span class="bom-badge">CT: ' + escapeHtml(r.so_chung_tu) + "</span><br>" : "";

    html +=
      "<tr>" +
      "<td>" + formatDateTime(r.thoi_gian_gd) + "</td>" +
      "<td><b>" + escapeHtml(r.ten_nv || r.nguoi_giao_dich) + "</b><br><small class='text-muted'>" + escapeHtml(r.bo_phan || "") + "</small></td>" +
      "<td><b>" + escapeHtml(r.ma_hang) + "</b><br>" + escapeHtml(r.ten_hang) + "</td>" +
      "<td>" + escapeHtml(r.loai_hien_thi || typeLabel(r.loai_giao_dich)) + "</td>" +
      "<td><b>" + escapeHtml(r.ma_sp_sx || r.ma_ncc || "-") + "</b><br><small class='text-muted'>" + escapeHtml(r.ten_sp || r.ten_ncc || "") + "</small></td>" +
      "<td><b>" + fmt(r.so_luong) + "</b> " + escapeHtml(r.don_vi_tinh || "") + subLine + "</td>" +
      "<td>" + ctLine + escapeHtml(r.ghi_chu || "-") + "</td>" +
      "<td>" + '<button type="button" class="btn-sm secondary" onclick="printSingleHistoryRow(' + i + ')" title="In phiếu cho dòng này">🖨️ In</button>' + "</td>" +
      "</tr>";
  }
  tbody.innerHTML = html;
}

window.printSingleHistoryRow = function (idx) {
  const r = state.historyRows[idx];
  if (!r) return;
  const isImport = r.loai_giao_dich === "NHAP_KHO";
  openPrintVoucher({
    title: isImport ? "PHIẾU NHẬP KHO NGUYÊN VẬT LIỆU" : "PHIẾU XUẤT KHO SẢN XUẤT",
    subtitle: "Mã giao dịch: #" + r.id, dateStr: formatDateTime(r.thoi_gian_gd),
    creator: (r.ten_nv || r.nguoi_giao_dich) + " (" + (r.bo_phan || "") + ")",
    docNo: r.so_chung_tu || "GD-" + r.id,
    targetInfo: isImport ? "Nhà cung cấp: " + (r.ten_ncc || r.ma_ncc || "-") : "Sản phẩm SX: " + (r.ten_sp ? r.ma_sp_sx + " - " + r.ten_sp : "-"),
    rows: [r],
  });
};

export function printFilteredHistory() {
  if (!state.historyRows || state.historyRows.length === 0) return showToast("Không có dữ liệu trong bảng lịch sử để in.", true);
  const from = el("historyFrom").value;
  const to = el("historyTo").value;
  const type = el("historyType").value;

  let title = "BẢNG KÊ PHIẾU GIAO DỊCH KHO NVL";
  if (type === "XUAT_SAN_XUAT") title = "PHIẾU TỔNG HỢP XUẤT KHO SẢN XUẤT";
  if (type === "NHAP_KHO") title = "PHIẾU TỔNG HỢP NHẬP KHO NGUYÊN VẬT LIỆU";

  const dateLabel = from === to ? "Ngày " + formatDateOnly(from) : "Từ ngày " + formatDateOnly(from) + " đến " + formatDateOnly(to);

  openPrintVoucher({
    title, subtitle: "Lưu trữ chứng từ kho (" + dateLabel + ")", dateStr: dateLabel,
    docNo: "TH-" + (from || "").replace(/-/g, ""), targetInfo: type ? typeLabel(type) : "Tất cả giao dịch Nhập / Xuất",
    rows: state.historyRows,
  });
}
