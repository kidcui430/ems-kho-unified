// ============================================================
// SẢN XUẤT - ADMIN: Mã hàng & lộ trình, LOT, Line/Máy, NG, Ma trận
// (js/sx/sx-admin.js)
// ============================================================
import { state, el, escapeHtml, showToast, api } from "../state.js";
import { loadStagesLinesMachines } from "./sx-core.js";

let routingStepCount = 0;

window.addRoutingStep = function () {
  routingStepCount++;
  const container = el("routing-builder");
  const stepDiv = document.createElement("div");
  stepDiv.style.display = "flex";
  stepDiv.style.gap = "10px";
  stepDiv.style.marginBottom = "10px";
  stepDiv.innerHTML =
    `<span style="font-weight:bold; min-width: 70px;">Bước ${routingStepCount}:</span>` +
    `<select class="routing-stage-select" required style="padding: 8px; flex: 1;"><option value="">-- Chọn công đoạn --</option>${state.globalStages.map((s) => `<option value="${s.stage_id}">${s.stage_name}</option>`).join("")}</select>` +
    `<button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">Xóa</button>`;
  container.appendChild(stepDiv);
};

export async function fetchProductsList() {
  try {
    const data = await api("/api/products");
    if (data.products) {
      state.productsCache = data.products;
      if (el("product-suggestions")) {
        el("product-suggestions").innerHTML = state.productsCache.map((p) => `<option value="${p.ma_sp}">${p.ten_sp}</option>`).join("");
      }
      renderMasterTable(state.productsCache);
    }
  } catch (e) {
    console.error("Lỗi:", e);
  }
}

function renderMasterTable(data) {
  const container = el("master-list-container");
  if (!container) return;
  let html = `<table class="matrix-table" style="font-size: 13px;"><thead><tr><th>Mã Hàng</th><th>Tên</th><th>Lộ trình (Trạm)</th></tr></thead><tbody>`;
  data.forEach((p) => {
    let routingText = "Chỉ dùng cho BOM kho";
    if (p.routing_map) {
      try {
        routingText = JSON.parse(p.routing_map)
          .map((step) => {
            const obj = state.globalStages.find((st) => st.stage_id == step.stage_id);
            return obj ? obj.stage_name : step.stage_id;
          })
          .join(" ➔ ");
      } catch (e) {
        routingText = "Lỗi";
      }
    }
    html += `<tr><td style="font-weight:bold; color:var(--navy);">${escapeHtml(p.ma_sp)}</td><td>${escapeHtml(p.ten_sp)}</td><td>${routingText}</td></tr>`;
  });
  container.innerHTML = html + `</tbody></table>`;
}

window.filterMasterData = function () {
  const val = (el("search-master")?.value || "").toLowerCase();
  renderMasterTable(state.productsCache.filter((p) => (p.ma_sp || "").toLowerCase().includes(val) || (p.ten_sp || "").toLowerCase().includes(val)));
};

export function bindMasterDataForm(reload) {
  const form = el("form-create-product");
  if (!form) return;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const routingMap = [];
    document.querySelectorAll(".routing-stage-select").forEach((sel, idx) => {
      if (sel.value) routingMap.push({ order: idx + 1, stage_id: sel.value });
    });
    try {
      const payload = {
        ma_sp: el("md-product-code").value.trim().toUpperCase(),
        ten_sp: el("md-product-name").value.trim(),
        don_vi_tinh: "Cái",
      };
      if (routingMap.length > 0) payload.routing_map = routingMap;
      await api("/api/products", { method: "POST", body: JSON.stringify(payload) });
      showToast("Khởi tạo mã hàng thành công!");
      form.reset();
      el("routing-builder").innerHTML = "";
      routingStepCount = 0;
      await fetchProductsList();
      if (typeof reload === "function") await reload();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

export function bindPoCreateForm() {
  const form = el("form-create-po");
  if (!form) return;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!state.user) return;

    const prefix = el("po-prefix").value.trim().toUpperCase();
    const productCode = el("product-code").value.trim().toUpperCase();
    const poDate = el("po-date").value;
    const totalQty = parseInt(el("po-total").value);
    const splitQty = parseInt(el("po-split").value);

    if (splitQty > totalQty) return showToast("Kích thước 1 LOT không được lớn hơn Tổng sản lượng!", true);

    const lots = [];
    let remaining = totalQty;
    let counter = 1;
    while (remaining > 0) {
      const qtyForThisLot = remaining > splitQty ? splitQty : remaining;
      lots.push({ po_number: `${prefix}-${String(counter).padStart(2, "0")}`, qty: qtyForThisLot });
      remaining -= qtyForThisLot;
      counter++;
    }

    if (!confirm(`Hệ thống sẽ chẻ thành ${lots.length} LOT (${lots.map((l) => l.qty).join(", ")}).\nBạn có chắc chắn?`)) return;

    let successCount = 0;
    const errorMessages = [];

    for (const lot of lots) {
      try {
        await api("/api/sx/po/create", {
          method: "POST",
          body: JSON.stringify({ po_number: lot.po_number, product_code: productCode, production_date: poDate, total_qty: lot.qty, user_id: state.user.ma_nv }),
        });
        successCount++;
      } catch (err) {
        errorMessages.push(`Lỗi LOT ${lot.po_number}: ${err.message}`);
      }
    }

    if (errorMessages.length > 0) {
      alert(`Đã tạo được ${successCount}/${lots.length} LOT.\nDanh sách lỗi:\n` + errorMessages.join("\n"));
    } else {
      showToast(`Đã cấp phát THÀNH CÔNG ${successCount}/${lots.length} LOT vào dây chuyền!`);
      form.reset();
      setSxDefaultDates();
    }

    window.fetchMatrixReport();
  });
}

// ---------------- LINE / CÔNG ĐOẠN / MÁY ----------------
export async function renderLineMachineTable() {
  const container = el("linemay-list-container");
  if (!container) return;

  let html = '<div class="table-responsive"><table class="matrix-table" style="font-size:13px;"><thead><tr><th>Line</th><th>Công đoạn</th><th>Máy</th></tr></thead><tbody>';
  if (state.globalLines.length === 0) {
    html += '<tr><td colspan="3" style="text-align:center;">Chưa có Line nào.</td></tr>';
  } else {
    state.globalLines.forEach((line) => {
      const stages = state.globalStages.filter((s) => s.line_id === line.line_id).map((s) => s.stage_name).join(", ") || "-";
      const machines = state.globalMachines.filter((m) => m.line_id === line.line_id).map((m) => m.machine_code).join(", ") || "-";
      html += `<tr><td style="font-weight:bold; color:var(--navy);">${escapeHtml(line.line_name)} (${escapeHtml(line.line_id)})</td><td>${escapeHtml(stages)}</td><td>${escapeHtml(machines)}</td></tr>`;
    });
  }
  container.innerHTML = html + "</tbody></table></div>";

  const lineOpts = '<option value="">-- Chọn Line --</option>' + state.globalLines.map((l) => `<option value="${l.line_id}">${l.line_name}</option>`).join("");
  if (el("new-stage-line")) el("new-stage-line").innerHTML = lineOpts;
  if (el("new-machine-line")) el("new-machine-line").innerHTML = lineOpts;
}

export function bindLineMachineForms(reload) {
  const lineForm = el("form-create-line");
  if (lineForm) {
    lineForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        await api("/api/lines", { method: "POST", body: JSON.stringify({ line_id: el("new-line-id").value.trim(), line_name: el("new-line-name").value.trim() }) });
        showToast("Đã thêm Line mới.");
        lineForm.reset();
        await loadStagesLinesMachines();
        await renderLineMachineTable();
        if (typeof reload === "function") await reload();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  const stageForm = el("form-create-stage");
  if (stageForm) {
    stageForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        await api("/api/stages", {
          method: "POST",
          body: JSON.stringify({ stage_id: el("new-stage-id").value.trim(), line_id: el("new-stage-line").value, stage_name: el("new-stage-name").value.trim() }),
        });
        showToast("Đã thêm Công đoạn mới.");
        stageForm.reset();
        await loadStagesLinesMachines();
        await renderLineMachineTable();
        if (typeof reload === "function") await reload();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  const machineForm = el("form-create-machine");
  if (machineForm) {
    machineForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        await api("/api/machines", {
          method: "POST",
          body: JSON.stringify({ machine_code: el("new-machine-code").value.trim(), machine_name: el("new-machine-name").value.trim(), line_id: el("new-machine-line").value }),
        });
        showToast("Đã thêm Máy mới.");
        machineForm.reset();
        await loadStagesLinesMachines();
        await renderLineMachineTable();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }
}

// ---------------- XỬ LÝ HÀNG NG ----------------
window.toggleReworkStage = function () {
  const isRework = el("ng-action").value === "REWORK";
  el("group-return-stage").classList.toggle("hidden", !isRework);
};

export function bindNgForm(reload) {
  const form = el("form-resolve-ng");
  if (!form) return;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const lot = el("ng-po-select").value;
    const fromStage = el("ng-current-stage").value;
    const qty = parseInt(el("ng-qty").value) || 0;
    const action = el("ng-action").value;
    const returnStage = el("ng-return-stage").value;

    if (!lot || !fromStage || qty <= 0) return showToast("Vui lòng điền đủ thông tin.", true);
    if (action === "REWORK" && !returnStage) return showToast("Vui lòng chọn công đoạn trả về.", true);

    try {
      await api("/api/sx/ng/resolve", {
        method: "POST",
        body: JSON.stringify({
          lot_number: lot,
          from_stage: fromStage,
          qty,
          action,
          return_stage: action === "REWORK" ? returnStage : "",
          user_id: state.user.ma_nv,
        }),
      });
      showToast(action === "SCRAP" ? "Đã báo hủy hàng NG." : "Đã chuyển hàng NG đi làm lại.");
      form.reset();
      el("group-return-stage").classList.add("hidden");
      await loadStagesLinesMachines();
      if (typeof reload === "function") await reload();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

// ---------------- MA TRẬN WIP ----------------
const lineColors = { CUTTING: "#ffebee", NC: "#e3f2fd", MNC: "#e8f5e9", GS_GV: "#fff3e0", GP_GE_GI: "#f3e5f5", ASSY: "#fffde7", KENSA: "#eceff1" };

window.fetchMatrixReport = async function () {
  if (!state.user || state.user.role !== "ADMIN") return;
  try {
    const data = await api("/api/sx/dashboard/matrix");
    if (!data.matrix) return;

    const columns = state.globalStages;
    const rows = data.matrix.map((row) => {
      const stages = {};
      columns.forEach((c) => {
        const colLower = c.stage_id.toLowerCase();
        stages[c.stage_id] = { good: row[`qty_${colLower}`] || 0, ng: row[`ng_${colLower}`] || 0, date: row[`date_${colLower}`] };
      });
      return {
        production_date: row.production_date, po_number: row.lot_number, product_code: row.product_code,
        total_qty: row.total_qty, finished_qty: row.qty_done, stages,
      };
    });
    state.currentMatrixData = { columns, rows };
    window.filterMatrix();
  } catch (error) {}
};

function renderMatrixTable(rows) {
  const container = el("matrix-table-container");
  if (!state.currentMatrixData || !container) return;

  let tableHTML = `<table class="matrix-table" id="export-table"><thead><tr>`;
  tableHTML += `<th rowspan="2" style="vertical-align: middle;">Ngày</th><th rowspan="2" style="vertical-align: middle;">Số LOT</th><th rowspan="2" style="vertical-align: middle;">Mã Hàng</th><th rowspan="2" style="vertical-align: middle;">Tổng</th>`;

  state.currentMatrixData.columns.forEach((col) => {
    tableHTML += `<th colspan="2" style="background-color: ${lineColors[col.line_id] || "transparent"}; border-bottom:1px solid #ccc; text-align:center;">${col.stage_name}</th>`;
  });
  tableHTML += `<th rowspan="2" style="vertical-align: middle;">KHO</th></tr><tr>`;

  state.currentMatrixData.columns.forEach((col) => {
    tableHTML += `<th style="background-color: ${lineColors[col.line_id] || "transparent"}; color: #48BB78; font-size:11px;">OK</th><th style="background-color: ${lineColors[col.line_id] || "transparent"}; color: #ea580c; font-size:11px; border-right: 2px solid rgba(0,0,0,0.1);">NG</th>`;
  });
  tableHTML += `</tr></thead><tbody>`;

  if (rows.length === 0) {
    tableHTML += `<tr><td colspan="${state.currentMatrixData.columns.length * 2 + 5}" style="text-align: center; padding: 20px;">Không tìm thấy dữ liệu.</td></tr>`;
  }

  rows.forEach((row) => {
    tableHTML += `<tr><td>${row.production_date || "-"}</td><td style="font-weight:bold; color:var(--navy);">${escapeHtml(row.po_number)}</td><td>${escapeHtml(row.product_code)}</td><td style="font-weight:bold;">${row.total_qty}</td>`;

    state.currentMatrixData.columns.forEach((col) => {
      const stg = row.stages[col.stage_id];
      let timeStr = "Chưa thao tác";
      if (stg && stg.date) {
        try {
          timeStr = new Date(stg.date.replace(" ", "T") + "Z")
            .toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
            .replace(",", "");
        } catch (e) {}
      }

      tableHTML +=
        stg && stg.good > 0
          ? `<td class="has-tooltip" data-time="${timeStr}" style="background-color: ${lineColors[col.line_id] || "transparent"}; text-align:center;"><span class="badge-good">${stg.good}</span></td>`
          : `<td style="background-color: ${lineColors[col.line_id] || "transparent"}; text-align:center;"><span class="cell-empty">-</span></td>`;

      tableHTML +=
        stg && stg.ng > 0
          ? `<td style="background-color: ${lineColors[col.line_id] || "transparent"}; text-align:center; border-right: 2px solid rgba(0,0,0,0.1);"><span style="background:#ea580c; color:#fff; border-radius:4px; padding: 2px 6px; font-size: 11px;">${stg.ng}</span></td>`
          : `<td style="background-color: ${lineColors[col.line_id] || "transparent"}; text-align:center; border-right: 2px solid rgba(0,0,0,0.1);"><span class="cell-empty">-</span></td>`;
    });
    tableHTML += `<td style="font-weight:bold; color:#48BB78;">${row.finished_qty > 0 ? row.finished_qty : "-"}</td></tr>`;
  });
  container.innerHTML = tableHTML + `</tbody></table>`;
}

window.filterMatrix = function () {
  if (!state.currentMatrixData) return;
  const dateVal = (el("search-date")?.value || "").toLowerCase();
  const lotVal = (el("search-lot")?.value || "").toLowerCase();
  const codeVal = (el("search-code")?.value || "").toLowerCase();
  renderMatrixTable(
    state.currentMatrixData.rows.filter(
      (r) => (r.production_date || "").toLowerCase().includes(dateVal) && (r.po_number || "").toLowerCase().includes(lotVal) && (r.product_code || "").toLowerCase().includes(codeVal),
    ),
  );
};

window.exportExcel = function () {
  const table = el("export-table");
  if (!table) return alert("Không tìm thấy bảng dữ liệu để xuất!");

  let csv = "﻿";
  const rows = table.querySelectorAll("tr");
  rows.forEach((row) => {
    const cols = row.querySelectorAll("th, td");
    const rowData = Array.from(cols).map((c) => `"${c.innerText.replace(/"/g, '""')}"`);
    csv += rowData.join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Bao_Cao_WIP_${new Date().toLocaleDateString("vi-VN").replace(/\//g, "-")}.csv`;
  link.click();
};

export function setSxDefaultDates() {
  const d = new Date().toISOString().split("T")[0];
  if (el("po-date")) el("po-date").value = d;
  if (el("action-date")) el("action-date").value = d;
}
