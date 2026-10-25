// ============================================================
// KHO NVL - GIAO DỊCH NHẬP/XUẤT, GỢI Ý BOM & LỊCH SỬ (js/kho/tx.js)
// ============================================================
import {
  state,
  el,
  fmt,
  escapeHtml,
  formatDateOnly,
  formatDateTime,
  typeLabel,
  formatRefInfo,
  showToast,
  api,
  isWorkshop,
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
    const invItem = state.inventoryData.find(function (x) {
      return x.ma_hang === b.ma_hang;
    });
    const tonKho = invItem ? Number(invItem.ton_kho || 0) : 0;

    // Kiểm tra xem có Tỷ lệ cắt cho cặp (maSp, ma_hang) không
    const ratio = state.cutRatios.find(function (r) {
      return r.ma_sp === maSp && r.ma_hang === b.ma_hang;
    });

    let suggested =
      Number(b.dinh_muc) > 0
        ? Number((Number(b.dinh_muc) * targetQty).toFixed(3))
        : 0;
    if (ratio && Number(ratio.so_con_moi_cay) > 0 && targetQty > 0) {
      suggested = Math.ceil(targetQty / Number(ratio.so_con_moi_cay));
    }

    const stockColor =
      tonKho <= 0 || (suggested > 0 && tonKho < suggested)
        ? "color:var(--danger); font-weight:bold;"
        : "color:var(--success); font-weight:bold;";

    const ratioBadge = ratio
      ? '<br><span class="bom-badge" style="background:#e0f2fe; color:#0369a1;">1 cây ' +
        (Number(ratio.chieu_dai_chuan_m) > 0
          ? fmt(ratio.chieu_dai_chuan_m) + "m "
          : "") +
        "= " +
        fmt(ratio.so_con_moi_cay) +
        " pcs</span>"
      : "";

    html +=
      "<tr>" +
      "<td><b>" +
      escapeHtml(b.ma_hang) +
      "</b></td>" +
      "<td>" +
      escapeHtml(b.ten_hang) +
      ratioBadge +
      (b.ghi_chu
        ? '<br><small class="text-muted">' + escapeHtml(b.ghi_chu) + "</small>"
        : "") +
      "</td>" +
      "<td>" +
      escapeHtml(b.don_vi_tinh) +
      "</td>" +
      "<td><b>" +
      (Number(b.dinh_muc) > 0
        ? fmt(b.dinh_muc)
        : ratio
          ? fmt(ratio.so_con_moi_cay) + " pcs/cây"
          : "Tùy chọn") +
      "</b></td>" +
      '<td style="color:var(--accent); font-weight:bold;">' +
      (suggested > 0 ? fmt(suggested) : "-") +
      "</td>" +
      '<td style="' +
      stockColor +
      '">' +
      fmt(tonKho) +
      "</td>" +
      "<td>" +
      `<button type="button" class="btn-sm" onclick="pickBomItem('${escapeHtml(b.ma_hang)}', ${suggested}, ${targetQty})">Chọn ↓</button>` +
      "</td>" +
      "</tr>";
  }
  tbody.innerHTML = html;
}

window.pickBomItem = function (maHang, suggestedQty, targetQty) {
  const item = state.inventoryData.find(function (x) {
    return x.ma_hang === maHang;
  });
  if (!item) return showToast("Không tìm thấy NVL trong danh mục.", true);

  el("categorySelect").value = item.phan_loai;
  onCategoryChange();
  el("itemSelect").value = item.ma_hang;
  onItemChange();

  if (Number(suggestedQty) > 0) {
    el("qtyInput").value = suggestedQty;
  } else {
    el("qtyInput").focus();
  }

  if (el("caySteelConInput") && Number(targetQty) > 0) {
    el("caySteelConInput").value = targetQty;
  }
  syncCutOutputFromQty();
  showToast("Đã điền gợi ý NVL " + item.ma_hang + " xuống khung nhập.");
};

export function addAllBomToCart() {
  const maSp = el("productSelect").value;
  if (!maSp) return showToast("Vui lòng chọn Mã sản phẩm trước.", true);

  const targetQty = Number(el("bomTargetQty").value) || 1;
  const bomList = state.bomData.filter(function (b) {
    return b.ma_sp === maSp;
  });

  if (bomList.length === 0) {
    return showToast("Chưa có dòng BOM nào để nạp tự động.", true);
  }

  let addedCount = 0;
  for (let i = 0; i < bomList.length; i++) {
    const b = bomList[i];
    const inv = state.inventoryData.find(function (x) {
      return x.ma_hang === b.ma_hang;
    });
    if (!inv || inv.trang_thai === "BLOCKED") continue;

    const ratio = state.cutRatios.find(function (r) {
      return r.ma_sp === maSp && r.ma_hang === b.ma_hang;
    });

    let reqQty =
      Number(b.dinh_muc) > 0
        ? Number((Number(b.dinh_muc) * targetQty).toFixed(3))
        : 0;
    if (ratio && Number(ratio.so_con_moi_cay) > 0 && targetQty > 0) {
      reqQty = Math.ceil(targetQty / Number(ratio.so_con_moi_cay));
    }
    if (reqQty <= 0) continue;

    if (reqQty > Number(inv.ton_kho || 0)) {
      showToast(
        "NVL " +
          inv.ma_hang +
          " tồn kho (" +
          fmt(inv.ton_kho) +
          ") nhỏ hơn mức gợi ý (" +
          fmt(reqQty) +
          "). Hãy nhập tay số thực xuất.",
        true,
      );
      continue;
    }

    const meta = computeCartMetaFor(inv, "XUAT_SAN_XUAT", reqQty, maSp, {
      soCon: ratio ? targetQty : 0,
      bomTargetQty: targetQty,
    });

    state.cart.push({
      ma_hang: inv.ma_hang,
      phan_loai: inv.phan_loai,
      ten_hang: inv.ten_hang,
      don_vi_tinh: inv.don_vi_tinh,
      loai_giao_dich: "XUAT_SAN_XUAT",
      so_luong: reqQty,
      sl_phu: meta.sl_phu,
      dvt_phu: meta.dvt_phu,
      quy_cach_gd: meta.quy_cach_gd,
      khoi_luong_kg: meta.khoi_luong_kg,
      ma_ncc: "",
      ma_sp_sx: maSp,
      so_chung_tu: el("docInput").value.trim(),
      don_gia: 0,
      ghi_chu: b.ghi_chu || el("noteInput").value.trim(),
    });
    addedCount++;
  }

  renderCart();
  if (addedCount > 0)
    showToast("Đã nạp " + addedCount + " NVL theo định mức vào Phiếu tạm.");
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
      if (Number(item.chieu_dai_chuan_m) > 0)
        label += " [1 cây = " + fmt(item.chieu_dai_chuan_m) + "m]";
      html +=
        '<option value="' +
        escapeHtml(item.ma_hang) +
        '">' +
        label +
        "</option>";
    }
  }
  sel.innerHTML = html;
  el("stockPanel").classList.add("hidden");
  updateCaySteelPanel();
}

export function onItemChange() {
  const val = el("itemSelect").value;
  const item = state.inventoryData.find(function (x) {
    return x.ma_hang === val;
  });

  if (!item) {
    el("stockPanel").classList.add("hidden");
    updateCaySteelPanel();
    return;
  }

  el("stockPanel").classList.remove("hidden");
  el("stockWarehouse").textContent = fmt(item.ton_kho);

  let unitText = item.don_vi_tinh || "-";
  if (Number(item.chieu_dai_chuan_m) > 0) {
    unitText += " (1 cây = " + fmt(item.chieu_dai_chuan_m) + "m)";
  }
  el("stockUnit").textContent = unitText;

  // Điền sẵn chiều dài chuẩn của NVL đó khi chọn sang mã NVL mới
  if (el("caySteelLengthInput")) {
    el("caySteelLengthInput").value =
      Number(item.chieu_dai_chuan_m) > 0 ? item.chieu_dai_chuan_m : "";
  }
  if (el("txKgInput")) el("txKgInput").value = "";
  if (el("txOutKgInput")) el("txOutKgInput").value = "";

  updateCaySteelPanel();

  const type = el("typeSelect").value;
  const maSp = el("productSelect").value;
  if (item.trang_thai === "BLOCKED") {
    el("stockStatus").textContent = "CHẶN XUẤT";
    el("stockStatus").style.color = "var(--danger)";
  } else if (type === "XUAT_SAN_XUAT" && maSp) {
    const ratioMatch = state.cutRatios.find(function (r) {
      return r.ma_sp === maSp && r.ma_hang === item.ma_hang;
    });
    const bomMatch = state.bomData.find(function (b) {
      return b.ma_sp === maSp && b.ma_hang === item.ma_hang;
    });
    if (ratioMatch) {
      const lenStr =
        Number(ratioMatch.chieu_dai_chuan_m || item.chieu_dai_chuan_m) > 0
          ? "cây " +
            fmt(ratioMatch.chieu_dai_chuan_m || item.chieu_dai_chuan_m) +
            "m = "
          : "";
      el("stockStatus").textContent =
        "Tỷ lệ cắt: " + lenStr + fmt(ratioMatch.so_con_moi_cay) + " pcs/cây";
      el("stockStatus").style.color = "#7c3aed";
    } else if (bomMatch) {
      el("stockStatus").textContent =
        "Thuộc BOM (ĐM: " + fmt(bomMatch.dinh_muc) + ")";
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
  if (!item) {
    panel.classList.add("hidden");
    return;
  }

  const type = el("typeSelect").value;
  const hasBarSpec =
    Number(item.he_so_kg_m) > 0 ||
    Number(item.chieu_dai_chuan_m) > 0 ||
    ["Cây", "Mét", "Thanh"].includes(item.don_vi_tinh);

  // 1. Khi NHẬP KHO: Luôn hiện panel cho mọi NVL để nhập Số Kg và chiều dài cây (1 cây = bao nhiêu mét)
  if (type === "NHAP_KHO") {
    panel.classList.remove("hidden");
    importMode.classList.remove("hidden");

    const lenInput = el("caySteelLengthInput");
    if (lenInput && !lenInput.value && Number(item.chieu_dai_chuan_m) > 0) {
      lenInput.value = item.chieu_dai_chuan_m;
    }
    updateCaySteelImportCalc();
    return;
  }

  // 2. Khi XUẤT SẢN XUẤT:
  if (type === "XUAT_SAN_XUAT") {
    const maSp = el("productSelect").value;
    const ratio = maSp
      ? state.cutRatios.find(function (r) {
          return r.ma_sp === maSp && r.ma_hang === item.ma_hang;
        })
      : null;

    if (ratio) {
      panel.classList.remove("hidden");
      ratioMode.classList.remove("hidden");
      syncCutOutputFromQty();
      return;
    }

    if (hasBarSpec) {
      panel.classList.remove("hidden");
      metMode.classList.remove("hidden");
      el("cutLengthUnitHint").textContent = item.don_vi_tinh || "Cây";
      const parts = [];
      if (Number(item.chieu_dai_chuan_m) > 0)
        parts.push("1 cây chuẩn = " + fmt(item.chieu_dai_chuan_m) + "m");
      if (Number(item.he_so_kg_m) > 0)
        parts.push("Hệ số: " + fmt(item.he_so_kg_m) + " Kg/mét");
      el("cutLengthHint").textContent =
        parts.join(" · ") || "Nhập số mét cắt ra nếu xuất lẻ.";
      return;
    }
  }

  panel.classList.add("hidden");
}

export function updateCaySteelImportCalc() {
  const item = currentCaySteelItem();
  if (!item) return;

  const type = el("typeSelect").value;
  if (type === "XUAT_SAN_XUAT") {
    syncCutOutputFromQty();
    return;
  }

  const soCay = Number(el("qtyInput").value) || 0;
  const length =
    Number(el("caySteelLengthInput")?.value) ||
    Number(item.chieu_dai_chuan_m) ||
    0;
  const heSoKg = Number(item.he_so_kg_m) || 0;
  const tongMet = soCay * length;
  const autoKg =
    heSoKg > 0 && tongMet > 0 ? Number((tongMet * heSoKg).toFixed(3)) : 0;

  if (el("txKgInput") && autoKg > 0) {
    el("txKgInput").value = autoKg;
  } else if (el("txKgInput") && item.don_vi_tinh === "Kg" && soCay > 0) {
    el("txKgInput").value = soCay;
  }

  const hintParts = [];
  if (length > 0) hintParts.push("Quy cách: 1 cây = " + fmt(length) + " mét");
  if (soCay > 0 && length > 0)
    hintParts.push("Tổng chiều dài: " + fmt(tongMet) + " mét");
  if (autoKg > 0)
    hintParts.push(
      "Khối lượng lý thuyết: ≈ " +
        fmt(autoKg) +
        " Kg (bạn có thể sửa lại ô Số Kg thực tế)",
    );

  if (el("caySteelImportHint")) {
    el("caySteelImportHint").textContent =
      hintParts.length > 0
        ? hintParts.join(" · ")
        : "Nhập chiều dài 1 cây (mét) và Số Kg cân thực tế cho lô NVL nhập kho.";
  }
}

export function updateCaySteelRatioCalc() {
  const item = currentCaySteelItem();
  const maSp = el("productSelect").value;
  if (!item || !maSp) return;
  const ratio = state.cutRatios.find(function (r) {
    return r.ma_sp === maSp && r.ma_hang === item.ma_hang;
  });
  if (!ratio || !(Number(ratio.so_con_moi_cay) > 0)) return;

  const soCon = Number(el("caySteelConInput").value) || 0;
  if (soCon > 0) {
    const soCay = Math.ceil(soCon / Number(ratio.so_con_moi_cay));
    el("qtyInput").value = soCay;
  }
  syncCutOutputFromQty();
}

function syncCutOutputFromQty() {
  const item = currentCaySteelItem();
  const maSp = el("productSelect")?.value;
  if (!item || !maSp) return;

  const ratio = state.cutRatios.find(function (r) {
    return r.ma_sp === maSp && r.ma_hang === item.ma_hang;
  });
  if (!ratio) return;

  const chieuDai = Number(
    ratio.chieu_dai_chuan_m || item.chieu_dai_chuan_m || 0,
  );
  const soConMoiCay = Number(ratio.so_con_moi_cay || 0);
  const qty = Number(el("qtyInput")?.value) || 0;
  const typedCon = Number(el("caySteelConInput")?.value) || 0;
  const totalPcs =
    typedCon > 0 ? typedCon : qty > 0 ? Math.round(qty * soConMoiCay) : 0;

  if (
    el("txOutKgInput") &&
    qty > 0 &&
    chieuDai > 0 &&
    Number(item.he_so_kg_m) > 0
  ) {
    el("txOutKgInput").value = Number(
      (qty * chieuDai * Number(item.he_so_kg_m)).toFixed(3),
    );
  }

  if (el("caySteelRatioHint")) {
    const lenText = chieuDai > 0 ? "1 cây " + fmt(chieuDai) + "m" : "1 cây";
    let msg =
      "✂️ Định mức cắt: " +
      lenText +
      " = " +
      fmt(soConMoiCay) +
      " pcs (con hàng)";
    if (qty > 0) {
      msg +=
        " ➔ Xuất " +
        fmt(qty) +
        " " +
        (item.don_vi_tinh || "cây") +
        (chieuDai > 0 ? " (" + fmt(qty * chieuDai) + "m)" : "") +
        " = " +
        fmt(totalPcs) +
        " pcs";
    }
    if (ratio.ghi_chu) msg += " · (" + ratio.ghi_chu + ")";
    el("caySteelRatioHint").textContent = msg;
  }
}

export function updateCaySteelMetCalc() {
  const item = currentCaySteelItem();
  if (!item) return;
  const meters = Number(el("cutLengthInput").value) || 0;
  const chieuDai = Number(item.chieu_dai_chuan_m) || 0;
  if (meters <= 0) return;

  if (chieuDai > 0) {
    el("qtyInput").value = Number((meters / chieuDai).toFixed(3));
  } else if (item.don_vi_tinh === "Mét") {
    el("qtyInput").value = meters;
  }
}

function computeCartMetaFor(item, type, qty, maSp, opts) {
  const options = opts || {};
  if (!item)
    return { sl_phu: 0, dvt_phu: "", quy_cach_gd: "", khoi_luong_kg: 0 };

  const defaultLen = Number(item.chieu_dai_chuan_m || 0);
  const heSoKg = Number(item.he_so_kg_m || 0);

  if (type === "NHAP_KHO") {
    const length =
      Number(
        options.length ?? el("caySteelLengthInput")?.value ?? defaultLen,
      ) || 0;
    const manualKg = Number(options.kg ?? el("txKgInput")?.value) || 0;
    const calcKg =
      length > 0 && heSoKg > 0 ? Number((qty * length * heSoKg).toFixed(3)) : 0;
    const finalKg =
      manualKg > 0 ? manualKg : item.don_vi_tinh === "Kg" ? qty : calcKg;

    const specParts = [];
    if (length > 0) {
      specParts.push(
        "1 cây = " + fmt(length) + "m (Tổng " + fmt(qty * length) + "m)",
      );
    }
    return {
      sl_phu: length > 0 ? Number((qty * length).toFixed(3)) : 0,
      dvt_phu: length > 0 ? "m" : "",
      quy_cach_gd: specParts.join(" · "),
      khoi_luong_kg: finalKg,
    };
  }

  if (type === "XUAT_SAN_XUAT") {
    const ratio = maSp
      ? state.cutRatios.find(function (r) {
          return r.ma_sp === maSp && r.ma_hang === item.ma_hang;
        })
      : null;

    if (ratio && Number(ratio.so_con_moi_cay) > 0) {
      const chieuDai = Number(ratio.chieu_dai_chuan_m || defaultLen || 0);
      const soConMoiCay = Number(ratio.so_con_moi_cay);
      const inputCon =
        Number(options.soCon ?? el("caySteelConInput")?.value) || 0;
      const totalPcs = inputCon > 0 ? inputCon : Math.round(qty * soConMoiCay);

      const manualOutKg = Number(options.kg ?? el("txOutKgInput")?.value) || 0;
      const calcKg =
        chieuDai > 0 && heSoKg > 0
          ? Number((qty * chieuDai * heSoKg).toFixed(3))
          : 0;
      const finalKg = manualOutKg > 0 ? manualOutKg : calcKg;

      const lenLabel = chieuDai > 0 ? "1 cây " + fmt(chieuDai) + "m" : "1 cây";
      const note =
        lenLabel +
        " = " +
        fmt(soConMoiCay) +
        " pcs → Cắt " +
        fmt(totalPcs) +
        " pcs";

      return {
        sl_phu: totalPcs,
        dvt_phu: "pcs",
        quy_cach_gd: note,
        khoi_luong_kg: finalKg,
      };
    }

    const meters = Number(options.meters ?? el("cutLengthInput")?.value) || 0;
    if (meters > 0) {
      const kg = heSoKg > 0 ? Number((meters * heSoKg).toFixed(3)) : 0;
      return {
        sl_phu: meters,
        dvt_phu: "m",
        quy_cach_gd:
          (defaultLen > 0 ? "1 cây = " + fmt(defaultLen) + "m · " : "") +
          "Cắt " +
          fmt(meters) +
          "m",
        khoi_luong_kg: kg,
      };
    }

    if (defaultLen > 0) {
      const kg =
        heSoKg > 0 ? Number((qty * defaultLen * heSoKg).toFixed(3)) : 0;
      return {
        sl_phu: Number((qty * defaultLen).toFixed(3)),
        dvt_phu: "m",
        quy_cach_gd: "1 cây = " + fmt(defaultLen) + "m",
        khoi_luong_kg: kg,
      };
    }

    if (options.bomTargetQty) {
      return {
        sl_phu: 0,
        dvt_phu: "",
        quy_cach_gd: "Theo BOM (" + fmt(options.bomTargetQty) + " SP)",
        khoi_luong_kg: item.don_vi_tinh === "Kg" ? qty : 0,
      };
    }
  }

  return { sl_phu: 0, dvt_phu: "", quy_cach_gd: "", khoi_luong_kg: 0 };
}

export function addToCart() {
  const val = el("itemSelect").value;
  const item = state.inventoryData.find(function (x) {
    return x.ma_hang === val;
  });

  const qty = Number(el("qtyInput").value);
  const type = el("typeSelect").value;

  if (!item) return showToast("Hãy chọn Nguyên Vật Liệu.", true);
  if (!Number.isFinite(qty) || qty <= 0)
    return showToast("Số lượng chính phải lớn hơn 0.", true);
  if (item.trang_thai === "BLOCKED" && type === "XUAT_SAN_XUAT")
    return showToast("NVL này đang bị khóa xuất.", true);
  if (type === "XUAT_SAN_XUAT" && !el("productSelect").value) {
    return showToast(
      "Vui lòng chọn Mã hàng sản xuất khi xuất ra chuyền.",
      true,
    );
  }

  let inCartOut = 0;
  for (let i = 0; i < state.cart.length; i++) {
    if (
      state.cart[i].ma_hang === item.ma_hang &&
      (state.cart[i].loai_giao_dich === "XUAT_SAN_XUAT" ||
        state.cart[i].loai_giao_dich === "HUY_KHO")
    ) {
      inCartOut += Number(state.cart[i].so_luong || 0);
    }
  }

  if (
    (type === "XUAT_SAN_XUAT" || type === "HUY_KHO") &&
    qty + inCartOut > Number(item.ton_kho || 0)
  ) {
    return showToast(
      "Số lượng vượt quá Tồn Kho hiện tại (" + fmt(item.ton_kho) + ").",
      true,
    );
  }

  const maSp = type === "XUAT_SAN_XUAT" ? el("productSelect").value : "";
  const caySteel = computeCartMetaFor(item, type, qty, maSp);

  state.cart.push({
    ma_hang: item.ma_hang,
    phan_loai: item.phan_loai,
    ten_hang: item.ten_hang,
    don_vi_tinh: item.don_vi_tinh,
    loai_giao_dich: type,
    so_luong: qty,
    sl_phu: caySteel.sl_phu,
    dvt_phu: caySteel.dvt_phu,
    quy_cach_gd: caySteel.quy_cach_gd,
    khoi_luong_kg: caySteel.khoi_luong_kg,
    ma_ncc: type === "NHAP_KHO" ? el("txNcc").value : "",
    ma_sp_sx: maSp,
    so_chung_tu: el("docInput").value.trim(),
    don_gia: type === "NHAP_KHO" ? Number(el("priceInput").value || 0) : 0,
    ghi_chu: el("noteInput").value.trim(),
  });

  renderCart();
  el("qtyInput").value = "";
  el("noteInput").value = "";
  if (el("txKgInput")) el("txKgInput").value = "";
  if (el("txOutKgInput")) el("txOutKgInput").value = "";
  if (el("caySteelConInput")) el("caySteelConInput").value = "";
  if (el("cutLengthInput")) el("cutLengthInput").value = "";
  // Giữ nguyên chiều dài chuẩn của NVL đang chọn để không bị mất hiển thị "1 cây = X mét"
  if (el("caySteelLengthInput") && Number(item.chieu_dai_chuan_m) > 0) {
    el("caySteelLengthInput").value = item.chieu_dai_chuan_m;
  }
  updateCaySteelPanel();
}

export function renderCart() {
  const tbody = el("cartTable").querySelector("tbody");
  if (state.cart.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-muted">Chưa có vật tư nào trong phiếu tạm.</td></tr>';
    return;
  }

  let html = "";
  for (let i = 0; i < state.cart.length; i++) {
    const x = state.cart[i];
    const quyDoi = formatRefInfo(
      x.sl_phu,
      x.dvt_phu,
      x.quy_cach_gd,
      x.khoi_luong_kg,
    );

    html +=
      "<tr>" +
      "<td><b>" +
      escapeHtml(x.ma_hang) +
      "</b><br>" +
      escapeHtml(x.ten_hang) +
      "</td>" +
      "<td>" +
      quyDoi +
      "</td>" +
      "<td>" +
      escapeHtml(typeLabel(x.loai_giao_dich)) +
      "</td>" +
      "<td><b>" +
      escapeHtml(x.ma_sp_sx || x.ma_ncc || "-") +
      "</b></td>" +
      "<td><b>" +
      fmt(x.so_luong) +
      "</b> " +
      escapeHtml(x.don_vi_tinh) +
      "</td>" +
      "<td>" +
      escapeHtml(x.ghi_chu || "-") +
      "</td>" +
      '<td><button class="danger btn-sm" onclick="removeCart(' +
      i +
      ')">Xóa</button></td>' +
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
      body: JSON.stringify({
        user_id: state.user.ma_nv,
        tx_date: el("txDate").value,
        transactions: state.cart,
      }),
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
  if (state.cart.length === 0)
    return showToast("Hãy thêm ít nhất 1 NVL vào phiếu tạm để in.", true);
  const firstType = state.cart[0].loai_giao_dich;
  const title =
    firstType === "NHAP_KHO"
      ? "PHIẾU NHẬP KHO NGUYÊN VẬT LIỆU"
      : "PHIẾU XUẤT KHO SẢN XUẤT";
  const txDate = el("txDate").value;

  openPrintVoucher({
    title,
    subtitle: "Bản in từ Phiếu giao dịch ngày " + formatDateOnly(txDate),
    dateStr: formatDateOnly(txDate),
    docNo: el("docInput").value.trim() || "PX-" + txDate.replace(/-/g, ""),
    targetInfo:
      firstType === "XUAT_SAN_XUAT"
        ? "Xuất cho Mã hàng SX: " + (state.cart[0].ma_sp_sx || "-")
        : "Nhập kho vật tư",
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
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center text-muted">Không có giao dịch nào trong khoảng lọc này.</td></tr>';
    return;
  }

  let html = "";
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const refStr = formatRefInfo(
      r.sl_phu,
      r.dvt_phu,
      r.quy_cach_gd,
      r.khoi_luong_kg,
    );
    const subLine =
      refStr !== "-"
        ? '<br><small class="text-muted">Quy đổi: ' + refStr + "</small>"
        : "";
    const ctLine = r.so_chung_tu
      ? '<span class="bom-badge">CT: ' +
        escapeHtml(r.so_chung_tu) +
        "</span><br>"
      : "";

    html +=
      "<tr>" +
      "<td>" +
      formatDateTime(r.thoi_gian_gd) +
      "</td>" +
      "<td><b>" +
      escapeHtml(r.ten_nv || r.nguoi_giao_dich) +
      "</b><br><small class='text-muted'>" +
      escapeHtml(r.bo_phan || "") +
      "</small></td>" +
      "<td><b>" +
      escapeHtml(r.ma_hang) +
      "</b><br>" +
      escapeHtml(r.ten_hang) +
      "</td>" +
      "<td>" +
      escapeHtml(r.loai_hien_thi || typeLabel(r.loai_giao_dich)) +
      "</td>" +
      "<td><b>" +
      escapeHtml(r.ma_sp_sx || r.ma_ncc || "-") +
      "</b><br><small class='text-muted'>" +
      escapeHtml(r.ten_sp || r.ten_ncc || "") +
      "</small></td>" +
      "<td><b>" +
      fmt(r.so_luong) +
      "</b> " +
      escapeHtml(r.don_vi_tinh || "") +
      subLine +
      "</td>" +
      "<td>" +
      ctLine +
      escapeHtml(r.ghi_chu || "-") +
      "</td>" +
      "<td>" +
      '<button type="button" class="btn-sm secondary" onclick="printSingleHistoryRow(' +
      i +
      ')" title="In phiếu cho dòng này">🖨️ In</button>' +
      "</td>" +
      "</tr>";
  }
  tbody.innerHTML = html;
}

window.printSingleHistoryRow = function (idx) {
  const r = state.historyRows[idx];
  if (!r) return;
  const isImport = r.loai_giao_dich === "NHAP_KHO";
  openPrintVoucher({
    title: isImport
      ? "PHIẾU NHẬP KHO NGUYÊN VẬT LIỆU"
      : "PHIẾU XUẤT KHO SẢN XUẤT",
    subtitle: "Mã giao dịch: #" + r.id,
    dateStr: formatDateTime(r.thoi_gian_gd),
    creator: (r.ten_nv || r.nguoi_giao_dich) + " (" + (r.bo_phan || "") + ")",
    docNo: r.so_chung_tu || "GD-" + r.id,
    targetInfo: isImport
      ? "Nhà cung cấp: " + (r.ten_ncc || r.ma_ncc || "-")
      : "Sản phẩm SX: " + (r.ten_sp ? r.ma_sp_sx + " - " + r.ten_sp : "-"),
    rows: [r],
  });
};

export function printFilteredHistory() {
  if (!state.historyRows || state.historyRows.length === 0)
    return showToast("Không có dữ liệu trong bảng lịch sử để in.", true);
  const from = el("historyFrom").value;
  const to = el("historyTo").value;
  const type = el("historyType").value;

  let title = "BẢNG KÊ PHIẾU GIAO DỊCH KHO NVL";
  if (type === "XUAT_SAN_XUAT") title = "PHIẾU TỔNG HỢP XUẤT KHO SẢN XUẤT";
  if (type === "NHAP_KHO") title = "PHIẾU TỔNG HỢP NHẬP KHO NGUYÊN VẬT LIỆU";

  const dateLabel =
    from === to
      ? "Ngày " + formatDateOnly(from)
      : "Từ ngày " + formatDateOnly(from) + " đến " + formatDateOnly(to);

  openPrintVoucher({
    title,
    subtitle: "Lưu trữ chứng từ kho (" + dateLabel + ")",
    dateStr: dateLabel,
    docNo: "TH-" + (from || "").replace(/-/g, ""),
    targetInfo: type ? typeLabel(type) : "Tất cả giao dịch Nhập / Xuất",
    rows: state.historyRows,
  });
}
