// ============================================================
// KHO NVL - QUẢN LÝ TỒN KHO & DANH MỤC NVL (js/kho/inventory.js)
// ============================================================
import { state, el, fmt, escapeHtml, showToast, api, applyRoleUI } from "../state.js";

export function renderInventory() {
  const q = el("inventorySearch").value.trim().toLowerCase();
  const cat = el("inventoryCategory").value;

  const rows = [];
  for (let i = 0; i < state.inventoryData.length; i++) {
    const item = state.inventoryData[i];
    if (cat && item.phan_loai !== cat) continue;
    if (q) {
      const searchStr = (item.ma_hang + " " + item.ten_hang + " " + (item.quy_cach || "")).toLowerCase();
      if (searchStr.indexOf(q) === -1) continue;
    }
    rows.push(item);
  }

  const tbody = el("inventoryTable").querySelector("tbody");

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Không tìm thấy NVL phù hợp.</td></tr>';
  } else {
    let html = "";
    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      const btnHtml =
        `<button class="btn-sm" style="background:#0284c7; color:#fff;" onclick="openEditModal('${escapeHtml(item.ma_hang)}')">Sửa</button>` +
        `<button class="btn-sm danger" style="margin-left:4px;" onclick="deleteItem('${escapeHtml(item.ma_hang)}')">Xóa</button>`;

      const nhapXuatSub =
        '<br><small class="text-muted">Tổng Nhập: <b style="color:var(--success)">' +
        fmt(item.tong_nhap || 0) +
        '</b> | Tổng Xuất SX: <b style="color:var(--danger)">' +
        fmt(item.tong_xuat_sx || 0) +
        "</b></small>";

      const quyDoiBadge =
        Number(item.he_so_kg_m) > 0
          ? '<br><span class="bom-badge">' +
            fmt(item.he_so_kg_m) +
            " Kg/m" +
            (Number(item.chieu_dai_chuan_m) > 0 ? " · cây " + fmt(item.chieu_dai_chuan_m) + "m" : "") +
            "</span>"
          : "";
      const maGocBadge = item.ma_goc
        ? '<br><span class="bom-badge" style="background:#f1f5f9;">Khúc dư của ' + escapeHtml(item.ma_goc) + "</span>"
        : "";

      html +=
        "<tr>" +
        "<td><b>" + escapeHtml(item.ma_hang) + "</b></td>" +
        "<td>" + escapeHtml(item.phan_loai) + "</td>" +
        "<td><b>" + escapeHtml(item.ten_hang) + "</b>" + maGocBadge + "</td>" +
        "<td>" + escapeHtml(item.quy_cach || "-") + quyDoiBadge + "</td>" +
        "<td>" + escapeHtml(item.don_vi_tinh) + "</td>" +
        "<td><b style='font-size:15px; color:var(--navy);'>" + fmt(item.ton_kho) + "</b>" + nhapXuatSub + "</td>" +
        '<td class="vp-only">' + btnHtml + "</td>" +
        "</tr>";
    }
    tbody.innerHTML = html;
  }

  applyRoleUI();
}

export async function addItem(reloadCallback) {
  try {
    const payload = {
      phan_loai: el("newCategory").value.trim(),
      ten_hang: el("newName").value.trim(),
      quy_cach: el("newSpec").value.trim(),
      don_vi_tinh: el("newUnit").value,
      ma_ncc: el("newSupplier").value,
      ghi_chu: el("newNote").value.trim(),
      he_so_kg_m: Number(el("newKgPerMet").value || 0),
      chieu_dai_chuan_m: Number(el("newChieuDaiChuan").value || 0),
      ma_goc: el("newMaGoc").value.trim().toUpperCase(),
    };
    if (!payload.phan_loai || !payload.ten_hang) {
      return showToast("Vui lòng nhập Phân loại và Tên NVL.", true);
    }

    await api("/api/kho/items", { method: "POST", body: JSON.stringify(payload) });
    showToast("Đã thêm NVL mới thành công.");

    el("newCategory").value = "";
    el("newName").value = "";
    el("newSpec").value = "";
    el("newNote").value = "";
    el("newKgPerMet").value = "";
    el("newChieuDaiChuan").value = "";
    el("newMaGoc").value = "";

    if (typeof reloadCallback === "function") await reloadCallback();
  } catch (e) {
    showToast(e.message, true);
  }
}

export function registerInventoryGlobals(reloadCallback) {
  window.openEditModal = function (maHang) {
    const item = state.inventoryData.find(function (x) {
      return x.ma_hang === maHang;
    });
    if (!item) return;

    el("editItemCode").value = item.ma_hang;
    el("editItemCat").value = item.phan_loai;
    el("editItemName").value = item.ten_hang;
    el("editItemSpec").value = item.quy_cach || "";
    el("editItemUnit").value = item.don_vi_tinh;
    el("editKgPerMet").value = item.he_so_kg_m || "";
    el("editChieuDaiChuan").value = item.chieu_dai_chuan_m || "";
    el("editMaGoc").value = item.ma_goc || "";

    el("editItemModal").classList.remove("hidden");
  };

  window.closeEditModal = function () {
    el("editItemModal").classList.add("hidden");
  };

  window.saveEditItem = async function () {
    try {
      const payload = {
        ma_hang: el("editItemCode").value,
        phan_loai: el("editItemCat").value.trim(),
        ten_hang: el("editItemName").value.trim(),
        quy_cach: el("editItemSpec").value.trim(),
        don_vi_tinh: el("editItemUnit").value,
        he_so_kg_m: Number(el("editKgPerMet").value || 0),
        chieu_dai_chuan_m: Number(el("editChieuDaiChuan").value || 0),
        ma_goc: el("editMaGoc").value.trim().toUpperCase(),
      };

      if (!payload.ten_hang || !payload.don_vi_tinh) {
        return showToast("Tên NVL và ĐVT không được để trống.", true);
      }

      await api("/api/kho/items/edit", { method: "POST", body: JSON.stringify(payload) });

      window.closeEditModal();
      showToast("Đã cập nhật thông tin NVL.");
      if (typeof reloadCallback === "function") await reloadCallback();
    } catch (e) {
      showToast(e.message, true);
    }
  };

  window.deleteItem = async function (maHang) {
    const msg = "Xác nhận Xóa mã " + maHang + "?\n\nLưu ý: Nếu NVL này đã phát sinh nhập/xuất, hệ thống sẽ tự động chuyển sang trạng thái Ẩn.";
    if (!confirm(msg)) return;

    try {
      await api("/api/kho/items/delete", { method: "POST", body: JSON.stringify({ ma_hang: maHang }) });
      showToast("Đã Xóa/Ẩn NVL thành công.");
      if (typeof reloadCallback === "function") await reloadCallback();
    } catch (e) {
      showToast(e.message, true);
    }
  };
}
