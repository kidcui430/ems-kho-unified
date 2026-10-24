// ============================================================
// KHO NVL - IN PHIẾU XUẤT / NHẬP KHO (js/kho/print.js)
// ============================================================
import { state, el, fmt, escapeHtml, formatDateOnly, formatDateTime, typeLabel, showToast } from "../state.js";

export function openPrintVoucher(config) {
  const rows = config.rows || [];
  if (rows.length === 0) return showToast("Không có dữ liệu giao dịch nào để in phiếu.", true);

  const title = config.title || "PHIẾU XUẤT KHO NGUYÊN VẬT LIỆU";
  const subtitle = config.subtitle || "";
  const dateStr = config.dateStr || formatDateOnly(new Date().toISOString());
  const creator = config.creator || (state.user ? state.user.ten_nv + " (" + state.user.bo_phan + ")" : "-");
  const docNo = config.docNo || "Tự động theo ngày";
  const targetInfo = config.targetInfo || "Bộ phận Sản Xuất / Kho NVL";

  let tableRowsHtml = "";
  let totalKg = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const kg = Number(r.khoi_luong_kg || 0);
    totalKg += kg;

    const packParts = [];
    if (Number(r.sl_phu) > 0) packParts.push(fmt(r.sl_phu) + " " + escapeHtml(r.dvt_phu || ""));
    if (r.quy_cach_gd) packParts.push("[" + escapeHtml(r.quy_cach_gd) + "]");
    if (kg > 0) packParts.push(fmt(kg) + " Kg");
    const packStr = packParts.length > 0 ? packParts.join(" | ") : "-";

    const spOrNcc = r.ten_sp || r.ma_sp_sx || r.ten_ncc || r.ma_ncc || typeLabel(r.loai_giao_dich);

    tableRowsHtml +=
      "<tr>" +
      '<td style="text-align:center;">' + (i + 1) + "</td>" +
      "<td><b>" + escapeHtml(r.ma_hang) + "</b></td>" +
      "<td>" + escapeHtml(r.ten_hang) + "</td>" +
      '<td style="text-align:center;">' + escapeHtml(r.don_vi_tinh || "") + "</td>" +
      '<td style="text-align:right; font-weight:bold;">' + fmt(r.so_luong) + "</td>" +
      "<td>" + packStr + "</td>" +
      "<td>" + escapeHtml(spOrNcc) + "</td>" +
      "<td>" + escapeHtml(r.ghi_chu || "") + "</td>" +
      "</tr>";
  }

  const html =
    '<div class="voucher-header">' +
    "<div>" +
    '<strong style="font-size:13pt;">HỆ THỐNG QUẢN LÝ KHO & SẢN XUẤT</strong><br>' +
    '<span style="font-size:11pt;">Bộ phận: Kho Nguyên Vật Liệu</span>' +
    "</div>" +
    '<div style="text-align:right; font-size:11pt;">' +
    "<b>Số chứng từ:</b> " + escapeHtml(docNo) + "<br>" +
    "<b>Ngày in:</b> " + formatDateTime(new Date().toISOString()) +
    "</div>" +
    "</div>" +
    '<div class="voucher-title">' +
    "<h1>" + escapeHtml(title) + "</h1>" +
    (subtitle ? '<div style="font-size:12pt; margin-top:4px; font-style:italic;">' + escapeHtml(subtitle) + "</div>" : "") +
    "</div>" +
    '<div class="voucher-meta">' +
    "<div><b>Ngày giao dịch:</b> " + escapeHtml(dateStr) + "</div>" +
    "<div><b>Người lập / Thao tác:</b> " + escapeHtml(creator) + "</div>" +
    '<div style="grid-column: 1 / -1;"><b>Đối tượng / Mục đích:</b> ' + escapeHtml(targetInfo) + "</div>" +
    "</div>" +
    '<table class="voucher-table">' +
    "<thead><tr>" +
    '<th style="width:38px;">STT</th><th style="width:85px;">Mã NVL</th><th>Tên Nguyên Vật Liệu</th>' +
    '<th style="width:55px;">ĐVT</th><th style="width:85px;">Số Lượng</th><th>Quy cách đóng gói / Số Kg</th>' +
    "<th>Mã SP SX / NCC</th><th>Ghi chú</th>" +
    "</tr></thead>" +
    "<tbody>" + tableRowsHtml + "</tbody>" +
    "<tfoot><tr>" +
    '<th colspan="4" style="text-align:right;">Tổng số dòng vật tư: ' + rows.length + " mục</th>" +
    '<th colspan="4" style="text-align:left;">' + (totalKg > 0 ? "Tổng khối lượng cân: " + fmt(totalKg) + " Kg" : "") + "</th>" +
    "</tr></tfoot>" +
    "</table>" +
    '<div class="voucher-signatures">' +
    "<div><b>NGƯỜI LẬP PHIẾU</b><p>(Ký và ghi rõ họ tên)</p></div>" +
    "<div><b>THỦ KHO / GIAO HÀNG</b><p>(Ký và ghi rõ họ tên)</p></div>" +
    "<div><b>NGƯỜI NHẬN / XƯỞNG SX</b><p>(Ký và ghi rõ họ tên)</p></div>" +
    "</div>";

  el("printableArea").innerHTML = html;
  el("printPreviewModal").classList.remove("hidden");
}

window.closePrintModal = function () {
  el("printPreviewModal").classList.add("hidden");
};

window.triggerBrowserPrint = function () {
  window.print();
};
