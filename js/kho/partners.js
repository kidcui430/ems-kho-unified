// ============================================================
// KHO NVL - NHÀ CUNG CẤP, MÃ HÀNG SX & ĐỊNH MỨC BOM (js/kho/partners.js)
// ============================================================
import { state, el, fmt, escapeHtml, showToast, api, applyRoleUI } from "../state.js";

// ---------------- NHÀ CUNG CẤP ----------------
export function renderSuppliers() {
  const table = el("supplierTable");
  if (!table) return;
  const tbody = table.querySelector("tbody");
  const qEl = el("supplierSearch");
  const q = qEl ? qEl.value.trim().toLowerCase() : "";

  const rows = [];
  for (let i = 0; i < state.supplierData.length; i++) {
    const n = state.supplierData[i];
    if (q) {
      const searchStr = ((n.ma_ncc || "") + " " + (n.ten_ncc || "") + " " + (n.so_dt || "") + " " + (n.nguoi_lien_he || "") + " " + (n.dia_chi || "")).toLowerCase();
      if (searchStr.indexOf(q) === -1) continue;
    }
    rows.push(n);
  }

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không tìm thấy nhà cung cấp nào.</td></tr>';
    return;
  }

  let html = "";
  for (let i = 0; i < rows.length; i++) {
    const n = rows[i];
    const btnHtml =
      `<button class="btn-sm" style="background:#0284c7; color:#fff;" onclick="openEditSupplierModal('${escapeHtml(n.ma_ncc)}')">Sửa</button>` +
      `<button class="btn-sm danger" style="margin-left:4px;" onclick="deleteSupplier('${escapeHtml(n.ma_ncc)}')">Xóa</button>`;

    html +=
      "<tr>" +
      "<td><b>" + escapeHtml(n.ma_ncc) + "</b></td>" +
      "<td><b>" + escapeHtml(n.ten_ncc) + "</b></td>" +
      "<td>" + escapeHtml(n.dia_chi || "-") + "</td>" +
      "<td>" + escapeHtml(n.so_dt || "-") + "</td>" +
      "<td>" + escapeHtml(n.nguoi_lien_he || "-") + "</td>" +
      "<td>" + escapeHtml(n.email || "-") + "</td>" +
      "<td>" + escapeHtml(n.ghi_chu || "-") + "</td>" +
      '<td class="vp-only">' + btnHtml + "</td>" +
      "</tr>";
  }
  tbody.innerHTML = html;
  applyRoleUI();
}

export async function addSupplier(reloadCallback) {
  try {
    const payload = {
      ten_ncc: el("supName").value.trim(), dia_chi: el("supAddress").value.trim(), so_dt: el("supPhone").value.trim(),
      nguoi_lien_he: el("supContact").value.trim(), email: el("supEmail").value.trim(), ghi_chu: el("supNote").value.trim(),
    };
    if (!payload.ten_ncc) return showToast("Tên nhà cung cấp không được để trống.", true);

    await api("/api/kho/suppliers", { method: "POST", body: JSON.stringify(payload) });
    showToast("Đã thêm NCC thành công.");

    el("supName").value = "";
    el("supAddress").value = "";
    el("supPhone").value = "";
    el("supContact").value = "";
    el("supEmail").value = "";
    el("supNote").value = "";

    if (typeof reloadCallback === "function") await reloadCallback();
  } catch (e) {
    showToast(e.message, true);
  }
}

// ---------------- MÃ HÀNG SẢN XUẤT & ĐỊNH MỨC BOM ----------------
export function renderProducts() {
  const table = el("productTable");
  if (!table) return;
  const tbody = table.querySelector("tbody");
  const qEl = el("productSearch");
  const q = qEl ? qEl.value.trim().toLowerCase() : "";

  const rows = [];
  for (let i = 0; i < state.productData.length; i++) {
    const p = state.productData[i];
    if (q) {
      const searchStr = ((p.ma_sp || "") + " " + (p.ten_sp || "") + " " + (p.quy_cach || "") + " " + (p.ghi_chu || "")).toLowerCase();
      if (searchStr.indexOf(q) === -1) continue;
    }
    rows.push(p);
  }

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không tìm thấy mã hàng sản xuất nào.</td></tr>';
    return;
  }

  let html = "";
  for (let i = 0; i < rows.length; i++) {
    const p = rows[i];

    const boms = state.bomData.filter(function (b) {
      return b.ma_sp === p.ma_sp;
    });

    let bomSummaryHtml = '<span class="text-muted" style="font-size:12px;">Chưa gán BOM</span>';
    if (boms.length > 0) {
      const badges = boms.map(function (b) {
        return '<span class="bom-badge">' + escapeHtml(b.ten_hang) + ": <b>" + (Number(b.dinh_muc) > 0 ? fmt(b.dinh_muc) : "Tùy chọn") + " " + escapeHtml(b.don_vi_tinh) + "</b></span>";
      });
      bomSummaryHtml = badges.join(" ");
    }

    const routingBadge = p.routing_map ? '<br><span class="bom-badge" style="background:#e0f2fe; color:#0369a1;">Có lộ trình SX</span>' : "";

    const cutRatios = state.cutRatios.filter(function (r) {
      return r.ma_sp === p.ma_sp;
    });
    let cutRatioSummaryHtml = '<span class="text-muted" style="font-size:12px;">Chưa khai báo</span>';
    if (cutRatios.length > 0) {
      cutRatioSummaryHtml = cutRatios
        .map(function (r) {
          return '<span class="bom-badge">' + escapeHtml(r.ten_hang) + ": <b>" + fmt(r.so_con_moi_cay) + " con/cây</b></span>";
        })
        .join(" ");
    }

    const btnHtml =
      `<button class="btn-sm" style="background:#0f766e; color:#fff;" onclick="openBomModal('${escapeHtml(p.ma_sp)}')">⚙️ Định mức BOM (${boms.length})</button>` +
      `<button class="btn-sm" style="background:#7c3aed; color:#fff; margin-left:4px;" onclick="openCutRatioModal('${escapeHtml(p.ma_sp)}')">✂️ Tỷ lệ cắt (${cutRatios.length})</button>` +
      `<button class="btn-sm" style="background:#0284c7; color:#fff; margin-left:4px;" onclick="openEditProductModal('${escapeHtml(p.ma_sp)}')">Sửa</button>` +
      `<button class="btn-sm danger" style="margin-left:4px;" onclick="deleteProduct('${escapeHtml(p.ma_sp)}')">Xóa</button>`;

    html +=
      "<tr>" +
      "<td><b>" + escapeHtml(p.ma_sp) + "</b>" + routingBadge + "</td>" +
      "<td><b>" + escapeHtml(p.ten_sp) + "</b></td>" +
      "<td>" + escapeHtml(p.quy_cach || "-") + "</td>" +
      "<td>" + escapeHtml(p.don_vi_tinh || "Cái") + "</td>" +
      "<td>" + bomSummaryHtml + "</td>" +
      "<td>" + cutRatioSummaryHtml + "</td>" +
      "<td>" + escapeHtml(p.ghi_chu || "-") + "</td>" +
      '<td class="vp-only" style="white-space:nowrap;">' + btnHtml + "</td>" +
      "</tr>";
  }
  tbody.innerHTML = html;
  applyRoleUI();
}

export async function addProduct(reloadCallback) {
  try {
    const payload = {
      ma_sp: el("newProductCode").value.trim(), ten_sp: el("newProductName").value.trim(),
      quy_cach: el("newProductSpec").value.trim(), don_vi_tinh: el("newProductUnit").value, ghi_chu: el("newProductNote").value.trim(),
    };
    if (!payload.ten_sp) return showToast("Vui lòng nhập tên sản phẩm.", true);

    const res = await api("/api/products", { method: "POST", body: JSON.stringify(payload) });
    showToast("Đã thêm mã hàng sản xuất [" + (res.ma_sp || payload.ma_sp) + "] thành công.");

    el("newProductCode").value = "";
    el("newProductName").value = "";
    el("newProductSpec").value = "";
    el("newProductNote").value = "";

    if (typeof reloadCallback === "function") await reloadCallback();
  } catch (e) {
    showToast(e.message, true);
  }
}

function renderBomModalList(maSp) {
  const tbody = el("bomModalTable").querySelector("tbody");
  const rows = state.bomData.filter(function (b) {
    return b.ma_sp === maSp;
  });

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa có NVL nào trong định mức BOM của sản phẩm này.</td></tr>';
    return;
  }

  let html = "";
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    html +=
      "<tr>" +
      "<td><b>" + escapeHtml(r.ma_hang) + "</b></td>" +
      "<td>" + escapeHtml(r.ten_hang) + "</td>" +
      "<td>" + escapeHtml(r.don_vi_tinh) + "</td>" +
      "<td><b>" + fmt(r.dinh_muc) + "</b></td>" +
      "<td>" + escapeHtml(r.ghi_chu || "-") + "</td>" +
      `<td><button type="button" class="danger btn-sm" onclick="removeBomEntry('${escapeHtml(r.ma_sp)}', '${escapeHtml(r.ma_hang)}')">Xóa</button></td>` +
      "</tr>";
  }
  tbody.innerHTML = html;
}

export function registerPartnerGlobals(reloadCallback) {
  window.openEditSupplierModal = function (maNcc) {
    const sup = state.supplierData.find(function (x) {
      return x.ma_ncc === maNcc;
    });
    if (!sup) return;

    el("editSupCode").value = sup.ma_ncc;
    el("editSupCodeDisplay").value = sup.ma_ncc;
    el("editSupName").value = sup.ten_ncc || "";
    el("editSupAddress").value = sup.dia_chi || "";
    el("editSupPhone").value = sup.so_dt || "";
    el("editSupContact").value = sup.nguoi_lien_he || "";
    el("editSupEmail").value = sup.email || "";
    el("editSupNote").value = sup.ghi_chu || "";

    el("editSupplierModal").classList.remove("hidden");
  };

  window.closeEditSupplierModal = function () {
    el("editSupplierModal").classList.add("hidden");
  };

  window.saveEditSupplier = async function () {
    try {
      const payload = {
        ma_ncc: el("editSupCode").value, ten_ncc: el("editSupName").value.trim(), dia_chi: el("editSupAddress").value.trim(),
        so_dt: el("editSupPhone").value.trim(), nguoi_lien_he: el("editSupContact").value.trim(),
        email: el("editSupEmail").value.trim(), ghi_chu: el("editSupNote").value.trim(),
      };
      if (!payload.ten_ncc) return showToast("Tên nhà cung cấp không được để trống.", true);
      await api("/api/kho/suppliers/edit", { method: "POST", body: JSON.stringify(payload) });
      window.closeEditSupplierModal();
      showToast("Đã cập nhật thông tin NCC.");
      if (typeof reloadCallback === "function") await reloadCallback();
    } catch (e) {
      showToast(e.message, true);
    }
  };

  window.deleteSupplier = async function (maNcc) {
    if (!confirm("Xác nhận xóa / ẩn Nhà cung cấp [" + maNcc + "]?")) return;
    try {
      const res = await api("/api/kho/suppliers/delete", { method: "POST", body: JSON.stringify({ ma_ncc: maNcc }) });
      showToast(res.message || "Đã xóa / ẩn NCC.");
      if (typeof reloadCallback === "function") await reloadCallback();
    } catch (e) {
      showToast(e.message, true);
    }
  };

  window.openEditProductModal = function (maSp) {
    const prod = state.productData.find(function (x) {
      return x.ma_sp === maSp;
    });
    if (!prod) return;

    el("editProductCode").value = prod.ma_sp;
    el("editProductCodeDisplay").value = prod.ma_sp;
    el("editProductName").value = prod.ten_sp || "";
    el("editProductSpec").value = prod.quy_cach || "";
    el("editProductUnit").value = prod.don_vi_tinh || "Cái";
    el("editProductNote").value = prod.ghi_chu || "";

    el("editProductModal").classList.remove("hidden");
  };

  window.closeEditProductModal = function () {
    el("editProductModal").classList.add("hidden");
  };

  window.saveEditProduct = async function () {
    try {
      // Cố ý KHÔNG gửi routing_map từ form bên Kho, để worker giữ nguyên lộ trình
      // công đoạn (nếu có) do bên Sản Xuất khai báo cho mã hàng này.
      const payload = {
        ma_sp: el("editProductCode").value, ten_sp: el("editProductName").value.trim(),
        quy_cach: el("editProductSpec").value.trim(), don_vi_tinh: el("editProductUnit").value, ghi_chu: el("editProductNote").value.trim(),
      };
      if (!payload.ten_sp) return showToast("Tên sản phẩm không được để trống.", true);
      await api("/api/products/edit", { method: "POST", body: JSON.stringify(payload) });
      window.closeEditProductModal();
      showToast("Đã cập nhật mã hàng sản xuất.");
      if (typeof reloadCallback === "function") await reloadCallback();
    } catch (e) {
      showToast(e.message, true);
    }
  };

  window.deleteProduct = async function (maSp) {
    if (!confirm("Xác nhận xóa / ẩn Mã hàng SX [" + maSp + "]?")) return;
    try {
      const res = await api("/api/products/delete", { method: "POST", body: JSON.stringify({ ma_sp: maSp }) });
      showToast(res.message || "Đã xóa / ẩn mã hàng.");
      if (typeof reloadCallback === "function") await reloadCallback();
    } catch (e) {
      showToast(e.message, true);
    }
  };

  window.openBomModal = function (maSp) {
    const prod = state.productData.find(function (x) {
      return x.ma_sp === maSp;
    });
    if (!prod) return;

    el("bomModalSp").value = prod.ma_sp;
    el("bomModalTitle").textContent = "Định mức BOM: " + prod.ma_sp + " - " + prod.ten_sp;

    let itemOpts = '<option value="">-- Chọn NVL đưa vào BOM --</option>';
    for (let i = 0; i < state.inventoryData.length; i++) {
      const inv = state.inventoryData[i];
      itemOpts += '<option value="' + escapeHtml(inv.ma_hang) + '">' + escapeHtml(inv.ma_hang) + " | " + escapeHtml(inv.ten_hang) + " (" + escapeHtml(inv.don_vi_tinh) + ")</option>";
    }
    el("bomItemSelect").innerHTML = itemOpts;
    el("bomQtyInput").value = "";
    el("bomNoteInput").value = "";

    renderBomModalList(prod.ma_sp);
    el("bomModal").classList.remove("hidden");
  };

  window.closeBomModal = function () {
    el("bomModal").classList.add("hidden");
  };

  window.saveBomEntry = async function () {
    const maSp = el("bomModalSp").value;
    const maHang = el("bomItemSelect").value;
    const dinhMuc = Number(el("bomQtyInput").value || 0);
    const ghiChu = el("bomNoteInput").value.trim();

    if (!maSp || !maHang) return showToast("Vui lòng chọn Nguyên Vật Liệu.", true);

    try {
      await api("/api/kho/bom/save", { method: "POST", body: JSON.stringify({ ma_sp: maSp, ma_hang: maHang, dinh_muc: dinhMuc, ghi_chu: ghiChu }) });
      showToast("Đã lưu định mức BOM.");
      el("bomQtyInput").value = "";
      el("bomNoteInput").value = "";
      if (typeof reloadCallback === "function") await reloadCallback();
      renderBomModalList(maSp);
    } catch (e) {
      showToast(e.message, true);
    }
  };

  window.removeBomEntry = async function (maSp, maHang) {
    try {
      await api("/api/kho/bom/delete", { method: "POST", body: JSON.stringify({ ma_sp: maSp, ma_hang: maHang }) });
      showToast("Đã gỡ NVL khỏi BOM.");
      if (typeof reloadCallback === "function") await reloadCallback();
      renderBomModalList(maSp);
    } catch (e) {
      showToast(e.message, true);
    }
  };
}

// ---------------- TỶ LỆ CẮT (THÉP CÂY -> SỐ CON/CÂY) ----------------
function renderCutRatioModalList(maSp) {
  const tbody = el("cutRatioModalTable").querySelector("tbody");
  const rows = state.cutRatios.filter(function (r) {
    return r.ma_sp === maSp;
  });

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa khai báo tỷ lệ cắt nào cho sản phẩm này.</td></tr>';
    return;
  }

  let html = "";
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    html +=
      "<tr>" +
      "<td><b>" + escapeHtml(r.ma_hang) + "</b></td>" +
      "<td>" + escapeHtml(r.ten_hang) + "</td>" +
      "<td>" + (Number(r.chieu_dai_chuan_m) > 0 ? fmt(r.chieu_dai_chuan_m) + " m" : "-") + "</td>" +
      "<td><b>" + fmt(r.so_con_moi_cay) + "</b></td>" +
      "<td>" + escapeHtml(r.ghi_chu || "-") + "</td>" +
      `<td><button type="button" class="danger btn-sm" onclick="removeCutRatioEntry('${escapeHtml(r.ma_sp)}', '${escapeHtml(r.ma_hang)}')">Xóa</button></td>` +
      "</tr>";
  }
  tbody.innerHTML = html;
}

export function registerCutRatioGlobals(reloadCallback) {
  window.openCutRatioModal = function (maSp) {
    const prod = state.productData.find(function (x) {
      return x.ma_sp === maSp;
    });
    if (!prod) return;

    el("cutRatioModalSp").value = prod.ma_sp;
    el("cutRatioModalTitle").textContent = "Tỷ lệ cắt: " + prod.ma_sp + " - " + prod.ten_sp;

    // Chỉ liệt kê NVL dạng cây/thanh (đã khai báo hệ số Kg/mét)
    let itemOpts = '<option value="">-- Chọn NVL dạng cây/thanh --</option>';
    for (let i = 0; i < state.inventoryData.length; i++) {
      const inv = state.inventoryData[i];
      if (!(Number(inv.he_so_kg_m) > 0)) continue;
      itemOpts += '<option value="' + escapeHtml(inv.ma_hang) + '">' + escapeHtml(inv.ma_hang) + " | " + escapeHtml(inv.ten_hang) + (Number(inv.chieu_dai_chuan_m) > 0 ? " (cây " + fmt(inv.chieu_dai_chuan_m) + "m)" : "") + "</option>";
    }
    el("cutRatioItemSelect").innerHTML = itemOpts;
    el("cutRatioQtyInput").value = "";
    el("cutRatioNoteInput").value = "";

    renderCutRatioModalList(prod.ma_sp);
    el("cutRatioModal").classList.remove("hidden");
  };

  window.closeCutRatioModal = function () {
    el("cutRatioModal").classList.add("hidden");
  };

  window.saveCutRatioEntry = async function () {
    const maSp = el("cutRatioModalSp").value;
    const maHang = el("cutRatioItemSelect").value;
    const soCon = Number(el("cutRatioQtyInput").value || 0);
    const ghiChu = el("cutRatioNoteInput").value.trim();

    if (!maSp || !maHang) return showToast("Vui lòng chọn Nguyên Vật Liệu dạng cây/thanh.", true);
    if (soCon <= 0) return showToast("Số con/cây phải lớn hơn 0.", true);

    try {
      await api("/api/kho/cat-ratio/save", { method: "POST", body: JSON.stringify({ ma_sp: maSp, ma_hang: maHang, so_con_moi_cay: soCon, ghi_chu: ghiChu }) });
      showToast("Đã lưu tỷ lệ cắt.");
      el("cutRatioQtyInput").value = "";
      el("cutRatioNoteInput").value = "";
      if (typeof reloadCallback === "function") await reloadCallback();
      renderCutRatioModalList(maSp);
    } catch (e) {
      showToast(e.message, true);
    }
  };

  window.removeCutRatioEntry = async function (maSp, maHang) {
    try {
      await api("/api/kho/cat-ratio/delete", { method: "POST", body: JSON.stringify({ ma_sp: maSp, ma_hang: maHang }) });
      showToast("Đã xóa tỷ lệ cắt.");
      if (typeof reloadCallback === "function") await reloadCallback();
      renderCutRatioModalList(maSp);
    } catch (e) {
      showToast(e.message, true);
    }
  };
}
