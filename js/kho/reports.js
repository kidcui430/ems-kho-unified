// ============================================================
// KHO NVL - BÁO CÁO TỔNG, BIỂU ĐỒ & XUẤT EXCEL (js/kho/reports.js)
// ============================================================
import {
  state, el, fmt, toISO, escapeHtml, formatDateOnly, formatDateTime, typeLabel,
  formatRefInfo, showToast, api,
} from "../state.js";
import { openPrintVoucher } from "./print.js";

let productChartInstance = null;
let categoryChartInstance = null;

const CHART_COLORS = ["#0284c7", "#0f766e", "#d97706", "#dc2626", "#7c3aed", "#2563eb", "#059669", "#db2777", "#4f46e5", "#64748b"];

export function setQuickRange(kind) {
  const now = new Date();
  let from = new Date(now);
  let to = new Date(now);

  if (kind === "today") {
    from = now;
    to = now;
  } else if (kind === "7days") {
    from.setDate(now.getDate() - 6);
  } else if (kind === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  el("reportFrom").value = toISO(from);
  el("reportTo").value = toISO(to);
  loadReport();
}

export async function loadReport() {
  const from = el("reportFrom").value;
  const to = el("reportTo").value;
  const type = el("reportType").value;
  const q = el("reportQ").value.trim();

  if (!from || !to) return;

  try {
    const url = "/api/kho/report/daily?from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to) + "&type=" + encodeURIComponent(type) + "&q=" + encodeURIComponent(q);
    const data = await api(url);
    state.currentReportData = data.rows || [];
    state.chartByProduct = data.chart_by_product || [];
    state.chartByCategory = data.chart_by_category || [];

    renderReportMatrix(state.currentReportData, data.total || {});
    populateChartProductDropdown();
    renderPieCharts();
  } catch (e) {
    showToast(e.message, true);
  }
}

function populateChartProductDropdown() {
  const sel = el("chartProductFilter");
  if (!sel) return;
  const currentVal = sel.value || "ALL";

  const spMap = new Map();
  for (let i = 0; i < state.chartByProduct.length; i++) {
    const r = state.chartByProduct[i];
    if (!spMap.has(r.ma_sp)) spMap.set(r.ma_sp, r.ten_sp);
  }

  let html = '<option value="ALL">-- Tỷ trọng giữa các Mã Hàng SX --</option>';
  spMap.forEach(function (tenSp, maSp) {
    html += '<option value="' + escapeHtml(maSp) + '">Chi tiết NVL của: ' + escapeHtml(maSp) + " | " + escapeHtml(tenSp) + "</option>";
  });

  sel.innerHTML = html;
  if (spMap.has(currentVal) || currentVal === "ALL") sel.value = currentVal;
}

export function renderPieCharts() {
  if (typeof Chart === "undefined") return;

  const filterSp = el("chartProductFilter") ? el("chartProductFilter").value : "ALL";
  const canvas1 = el("productPieChart");
  const empty1 = el("productChartEmpty");
  const wrap1 = canvas1 ? canvas1.parentElement : null;

  const labels1 = [];
  const values1 = [];

  if (filterSp === "ALL") {
    const grouped = new Map();
    for (let i = 0; i < state.chartByProduct.length; i++) {
      const r = state.chartByProduct[i];
      const key = (r.ma_sp || "KHAC") + " - " + (r.ten_sp || "Chưa gắn mã SP");
      grouped.set(key, (grouped.get(key) || 0) + Number(r.tong_sl || 0));
    }
    grouped.forEach(function (val, key) {
      if (val > 0) {
        labels1.push(key);
        values1.push(Number(val.toFixed(3)));
      }
    });
  } else {
    for (let i = 0; i < state.chartByProduct.length; i++) {
      const r = state.chartByProduct[i];
      if (r.ma_sp === filterSp && Number(r.tong_sl) > 0) {
        labels1.push(r.ma_hang + " - " + r.ten_hang + " (" + r.don_vi_tinh + ")");
        values1.push(Number(Number(r.tong_sl).toFixed(3)));
      }
    }
  }

  if (productChartInstance) {
    productChartInstance.destroy();
    productChartInstance = null;
  }

  if (values1.length === 0) {
    if (wrap1) wrap1.classList.add("hidden");
    if (canvas1) canvas1.classList.add("hidden");
    if (empty1) empty1.classList.remove("hidden");
  } else {
    if (wrap1) wrap1.classList.remove("hidden");
    if (canvas1) canvas1.classList.remove("hidden");
    if (empty1) empty1.classList.add("hidden");

    productChartInstance = new Chart(canvas1, {
      type: "doughnut",
      data: { labels: labels1, datasets: [{ data: values1, backgroundColor: CHART_COLORS, borderWidth: 2, borderColor: "#ffffff" }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "right" },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                return " " + ctx.label + ": " + fmt(ctx.raw) + " (" + pct + "%)";
              },
            },
          },
        },
      },
    });
  }

  const canvas2 = el("categoryPieChart");
  const empty2 = el("categoryChartEmpty");
  const wrap2 = canvas2 ? canvas2.parentElement : null;
  const labels2 = [];
  const values2 = [];

  for (let i = 0; i < state.chartByCategory.length; i++) {
    const c = state.chartByCategory[i];
    if (Number(c.tong_sl) > 0) {
      labels2.push(c.phan_loai + " (" + c.so_ma_nvl + " mã)");
      values2.push(Number(Number(c.tong_sl).toFixed(3)));
    }
  }

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
    categoryChartInstance = null;
  }

  if (values2.length === 0) {
    if (wrap2) wrap2.classList.add("hidden");
    if (canvas2) canvas2.classList.add("hidden");
    if (empty2) empty2.classList.remove("hidden");
  } else {
    if (wrap2) wrap2.classList.remove("hidden");
    if (canvas2) canvas2.classList.remove("hidden");
    if (empty2) empty2.classList.add("hidden");

    categoryChartInstance = new Chart(canvas2, {
      type: "pie",
      data: { labels: labels2, datasets: [{ data: values2, backgroundColor: CHART_COLORS.slice().reverse(), borderWidth: 2, borderColor: "#ffffff" }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "right" },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                return " " + ctx.label + ": " + fmt(ctx.raw) + " (" + pct + "%)";
              },
            },
          },
        },
      },
    });
  }
}

export function renderReportMatrix(rows, total) {
  const tbody = el("reportTable").querySelector("tbody");
  let sumKg = 0;

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không có dữ liệu giao dịch trong khoảng thời gian này.</td></tr>';
  } else {
    let html = "";
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const kg = Number(r.tong_kg_nhap || 0);
      sumKg += kg;

      const latestStr = r.gd_gan_nhat ? '<br><small class="text-muted">GD gần nhất: ' + formatDateTime(r.gd_gan_nhat) + "</small>" : "";

      html +=
        `<tr class="matrix-row" onclick="toggleMatrixDetail(this, '${escapeHtml(r.ma_hang)}')">` +
        "<td><b>" + escapeHtml(r.ma_hang) + "</b></td>" +
        '<td><span style="color:var(--accent); font-weight:600;">' + escapeHtml(r.ten_hang) + '</span> <span style="font-size:11px;color:#888;">(▾ Chi tiết)</span>' + latestStr + "</td>" +
        "<td>" + escapeHtml(r.phan_loai) + "</td>" +
        "<td>" + escapeHtml(r.don_vi_tinh) + "</td>" +
        '<td><b style="color:var(--success)">' + fmt(r.nhap) + "</b></td>" +
        "<td>" + (kg > 0 ? '<b style="color:var(--accent)">' + fmt(kg) + " Kg</b>" : "-") + "</td>" +
        '<td><b style="color:var(--danger)">' + fmt(r.xuat_sx) + "</b></td>" +
        '<td><b style="color:var(--navy)">' + fmt(r.ton_kho) + "</b></td>" +
        "</tr>";
    }
    tbody.innerHTML = html;
  }

  el("footIn").textContent = fmt(total.nhap);
  el("footWeight").textContent = sumKg > 0 ? fmt(sumKg) + " Kg" : "-";
  el("footProd").textContent = fmt(total.xuat_sx);
}

window.toggleMatrixDetail = async function (row, maHang) {
  const next = row.nextElementSibling;
  if (next && next.classList.contains("detail-row")) {
    next.remove();
    return;
  }

  const from = el("reportFrom").value;
  const to = el("reportTo").value;

  try {
    const url = "/api/kho/report/detail?ma_hang=" + encodeURIComponent(maHang) + "&from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to);
    const data = await api(url);
    const tr = document.createElement("tr");
    tr.className = "detail-row";

    const rows = data.rows || [];
    let detailHtml = "";

    if (rows.length === 0) {
      detailHtml = '<tr><td colspan="7">Không có giao dịch chi tiết.</td></tr>';
    } else {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const refInfo = formatRefInfo(r.sl_phu, r.dvt_phu, r.quy_cach_gd, r.khoi_luong_kg);

        detailHtml +=
          "<tr>" +
          "<td>" + formatDateTime(r.thoi_gian_gd) + "</td>" +
          "<td><b>" + escapeHtml(r.loai_hien_thi) + "</b></td>" +
          "<td><b>" + fmt(r.so_luong) + "</b></td>" +
          "<td>" + refInfo + "</td>" +
          "<td>" + escapeHtml(r.ten_sp || r.ma_sp_sx || "-") + "</td>" +
          "<td>" + escapeHtml(r.ten_nv || r.nguoi_giao_dich) + "</td>" +
          "<td>" + escapeHtml(r.ghi_chu || "-") + "</td>" +
          "</tr>";
      }
    }

    tr.innerHTML =
      '<td colspan="8" style="padding:0; border:0;">' +
      '<div class="detail-box">' +
      '<p style="margin:0 0 10px; font-weight:600; color:var(--navy);">Lịch sử giao dịch chi tiết của mã ' + escapeHtml(maHang) + "</p>" +
      '<div class="table-responsive">' +
      '<table style="min-width:650px; background:#fff;">' +
      "<thead><tr><th>Thời gian</th><th>Loại GD</th><th>SL Chính</th><th>Đóng gói / Quy cách / Số Kg</th><th>Mã SP SX</th><th>Người thực hiện</th><th>Ghi chú</th></tr></thead>" +
      "<tbody>" + detailHtml + "</tbody>" +
      "</table></div></div></td>";

    row.parentNode.insertBefore(tr, row.nextSibling);
  } catch (e) {
    showToast(e.message, true);
  }
};

export async function printReportPeriodVoucher() {
  const from = el("reportFrom").value;
  const to = el("reportTo").value;
  const type = el("reportType").value;
  const q = el("reportQ").value.trim();

  if (!from || !to) return showToast("Vui lòng chọn Từ ngày và Đến ngày.", true);

  try {
    const params = new URLSearchParams({ from, to });
    if (type) params.set("type", type);
    if (q) params.set("q", q);

    const data = await api("/api/kho/history?" + params.toString());
    const rows = data.rows || [];
    if (rows.length === 0) return showToast("Không có giao dịch nào trong kỳ để in phiếu.", true);

    const dateLabel = from === to ? "Ngày " + formatDateOnly(from) : "Từ " + formatDateOnly(from) + " đến " + formatDateOnly(to);

    openPrintVoucher({
      title: type === "NHAP_KHO" ? "PHIẾU TỔNG HỢP NHẬP KHO THEO NGÀY" : "PHIẾU TỔNG HỢP XUẤT KHO SẢN XUẤT",
      subtitle: "Kỳ báo cáo: " + dateLabel, dateStr: dateLabel, docNo: "BC-" + from.replace(/-/g, ""),
      targetInfo: type ? typeLabel(type) : "Tổng hợp Nhập & Xuất Kho", rows,
    });
  } catch (e) {
    showToast(e.message, true);
  }
}

export async function exportExcel() {
  const from = el("reportFrom").value;
  const to = el("reportTo").value;
  const type = el("reportType").value;
  const q = el("reportQ").value.trim();

  if (!from || !to) return showToast("Vui lòng chọn Từ ngày và Đến ngày.", true);
  if (typeof XLSX === "undefined") return showToast("Đang tải thư viện Excel, vui lòng đợi giây lát.", true);

  showToast("Đang kết xuất dữ liệu Excel...");

  try {
    const params = new URLSearchParams({ from, to });
    if (type) params.set("type", type);
    if (q) params.set("q", q);

    const data = await api("/api/kho/history?" + params.toString());
    const rows = data.rows || [];

    if (rows.length === 0) return showToast("Không có dữ liệu chi tiết để xuất.", true);

    const ws_data = [
      ["THỜI GIAN", "NGƯỜI THAO TÁC", "BỘ PHẬN", "MÃ NVL", "TÊN NVL", "LOẠI GIAO DỊCH", "SL CHÍNH", "ĐVT CHÍNH", "SL ĐÓNG GÓI", "ĐVT ĐÓNG GÓI", "CHI TIẾT QUY CÁCH", "KHỐI LƯỢNG (KG)", "MÃ SP SX", "TÊN SP SX / NCC", "SỐ CHỨNG TỪ", "GHI CHÚ"],
    ];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      ws_data.push([
        formatDateTime(r.thoi_gian_gd), r.ten_nv || r.nguoi_giao_dich, r.bo_phan || "", r.ma_hang, r.ten_hang,
        r.loai_hien_thi || typeLabel(r.loai_giao_dich), Number(r.so_luong), r.don_vi_tinh,
        r.sl_phu > 0 ? Number(r.sl_phu) : "", r.dvt_phu || "", r.quy_cach_gd || "",
        r.khoi_luong_kg > 0 ? Number(r.khoi_luong_kg) : "", r.ma_sp_sx || "", r.ten_sp || r.ten_ncc || "", r.so_chung_tu || "", r.ghi_chu || "",
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws["!cols"] = [
      { wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 26 }, { wch: 18 }, { wch: 14 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 15 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 28 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SoCaiGiaoDich");
    XLSX.writeFile(wb, "SoCaiKhoNVL_" + from + "_den_" + to + ".xlsx");
  } catch (e) {
    showToast(e.message, true);
  }
}
