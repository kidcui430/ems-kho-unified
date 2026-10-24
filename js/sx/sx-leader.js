// ============================================================
// SẢN XUẤT - LEADER: hàng chờ xử lý, giao nhận, chia xuống máy
// (js/sx/sx-leader.js)
// ============================================================
import { state, el, fmt, escapeHtml, showToast, api } from "../state.js";
import { stageName } from "./sx-core.js";

export async function fetchPendingPOs() {
  if (!state.user || state.user.role !== "LEADER") return;
  try {
    const result = await api("/api/sx/leader/pending?line_id=" + encodeURIComponent(state.user.line_id || ""));
    state.leaderPOsCache = result.data || [];
    populateLeaderSearchDropdowns();
  } catch (error) {}
}

function populateLeaderSearchDropdowns() {
  const productList = el("leader-product-list");
  if (!productList) {
    window.filterLeaderPOs();
    return;
  }
  const uniqueProducts = [...new Set(state.leaderPOsCache.map((po) => po.product_code))].filter(Boolean);
  productList.innerHTML = uniqueProducts.map((p) => `<option value="${p}">`).join("");
  window.updateLeaderLotOptions();
}

window.updateLeaderLotOptions = function () {
  const productInput = el("search-leader-product");
  const lotList = el("leader-lot-list");
  if (!productInput || !lotList) return;

  const selectedProduct = productInput.value.trim().toUpperCase();
  let availableLots = state.leaderPOsCache;
  if (selectedProduct) {
    availableLots = state.leaderPOsCache.filter((po) => (po.product_code || "").toUpperCase().includes(selectedProduct));
  }
  const uniqueLots = [...new Set(availableLots.map((po) => po.po_number))].filter(Boolean);
  lotList.innerHTML = uniqueLots.map((l) => `<option value="${l}">`).join("");

  window.filterLeaderPOs();
};

window.filterLeaderPOs = function () {
  const prodVal = (el("search-leader-product")?.value || "").trim().toUpperCase();
  const lotVal = (el("search-leader-lot")?.value || "").trim().toUpperCase();

  const filtered = state.leaderPOsCache.filter((po) => {
    const matchProd = prodVal === "" || (po.product_code || "").toUpperCase().includes(prodVal);
    const matchLot = lotVal === "" || (po.po_number || "").toUpperCase().includes(lotVal);
    return matchProd && matchLot;
  });

  renderLeaderPOs(filtered);
};

function renderLeaderPOs(data) {
  const selectEl = el("po-select");
  const wipContainer = el("tab-wip");
  if (!selectEl || !wipContainer) return;

  let currentSelectedPoId = null;
  if (selectEl.value) {
    try {
      currentSelectedPoId = JSON.parse(selectEl.value).po_id;
    } catch (e) {}
  }

  selectEl.innerHTML = '<option value="">-- Chọn PO để xử lý --</option>';
  wipContainer.innerHTML = "";

  if (data.length > 0) {
    data.forEach((po) => {
      const currentStageName = stageName(String(po.from_stage).toUpperCase());
      const toStageName = stageName(po.to_stage_name) || po.to_stage_name;

      const optionValue = JSON.stringify({ po_id: po.po_id, product_id: po.product_id, from_stage: po.from_stage, max_qty: po.qty_available });
      const optionText = `${po.po_number} [${po.product_code}] - Tồn: ${po.qty_available} | ➔ Tới: ${toStageName}`;
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionText;
      selectEl.appendChild(option);

      const card = document.createElement("div");
      card.className = "card";
      card.style.borderLeft = "4px solid var(--lime)";
      card.innerHTML =
        `<h3 style="color: var(--navy); margin-bottom: 8px;">${escapeHtml(po.po_number)} <span style="font-size: 14px; color: var(--gray-dark);">(${escapeHtml(po.product_code)})</span></h3>` +
        `<p style="margin-bottom: 5px;">📦 Đang chờ: <strong class="text-primary" style="font-size: 18px;">${po.qty_available}</strong></p>` +
        `<p style="font-size: 14px;">📍 Hiện tại: <strong style="color: var(--maroon);">${escapeHtml(currentStageName)}</strong></p>` +
        `<p style="font-size: 14px;">➔ Sau khi PASS sẽ đến: <strong>${escapeHtml(toStageName)}</strong></p>`;
      wipContainer.appendChild(card);
    });

    if (currentSelectedPoId) {
      const options = Array.from(selectEl.options);
      const targetOpt = options.find((opt) => {
        if (!opt.value) return false;
        try {
          return JSON.parse(opt.value).po_id === currentSelectedPoId;
        } catch (e) {
          return false;
        }
      });
      if (targetOpt) selectEl.value = targetOpt.value;
    }
  } else {
    selectEl.innerHTML = '<option value="">Chưa có dữ liệu</option>';
    wipContainer.innerHTML = `<div class="card" style="text-align: center; color: var(--gray-dark); padding: 30px;">Không có lô hàng nào kẹt tại công đoạn bạn quản lý.</div>`;
  }
}

window.submitMove = async function () {
  const selectEl = el("po-select");
  if (!selectEl) return;
  const selectedValue = selectEl.value;
  if (!selectedValue) return alert("Vui lòng chọn 1 PO!");

  const routeData = JSON.parse(selectedValue);
  const qtyPass = parseInt(el("qty-pass").value) || 0;
  const qtyNg = parseInt(el("qty-ng").value) || 0;
  if (qtyPass + qtyNg <= 0) return alert("Vui lòng nhập số lượng PASS hoặc NG!");
  if (qtyPass + qtyNg > routeData.max_qty) return alert(`Số lượng thao tác (${qtyPass + qtyNg}) vượt quá số lượng tồn (${routeData.max_qty})!`);

  try {
    await api("/api/sx/move", {
      method: "POST",
      body: JSON.stringify({ lot_number: routeData.po_id, product_id: routeData.product_id, from_stage: routeData.from_stage, qty_pass: qtyPass, qty_ng: qtyNg, user_id: state.user.ma_nv }),
    });
    showToast("Đã cập nhật luân chuyển thành công!");
    el("qty-pass").value = 0;
    el("qty-ng").value = 0;
    await fetchPendingPOs();
  } catch (error) {
    showToast(error.message, true);
  }
};

// ---------------- CHIA LOT XUỐNG MÁY ----------------
window.onPoSelectChange = async function () {
  const selectEl = el("po-select");
  const card = el("allocation-card");
  if (!selectEl || !card) return;

  if (!selectEl.value) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");
  el("allocation-rows").innerHTML = "";
  state.allocationRowCount = 0;
  addAllocationRowInternal();
  await loadLotAllocations();
};

function currentRouteData() {
  try {
    return JSON.parse(el("po-select").value);
  } catch (e) {
    return null;
  }
}

function addAllocationRowInternal() {
  state.allocationRowCount++;
  const idx = state.allocationRowCount;
  const route = currentRouteData();
  const lineMachines = state.globalMachines.filter((m) => m.line_id === state.user.line_id);
  const lineStages = state.globalStages.filter((s) => s.line_id === state.user.line_id);

  const row = document.createElement("div");
  row.className = "allocation-row";
  row.dataset.rowId = idx;
  row.style.cssText = "border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:10px;";
  row.innerHTML =
    `<div style="display:flex; gap:8px; margin-bottom:8px;">` +
    `<select class="alloc-machine" style="flex:1; padding:8px;"><option value="">-- Máy --</option>${lineMachines.map((m) => `<option value="${m.id}">${escapeHtml(m.machine_code)}</option>`).join("")}</select>` +
    `<select class="alloc-stage" style="flex:1; padding:8px;"><option value="">-- Công đoạn --</option>${lineStages.map((s) => `<option value="${s.stage_id}" ${route && s.stage_id === String(route.from_stage).toUpperCase() ? "selected" : ""}>${escapeHtml(s.stage_name)}</option>`).join("")}</select>` +
    `</div>` +
    `<div style="display:flex; gap:8px;">` +
    `<input type="number" class="alloc-qty" placeholder="Số lượng" min="1" style="flex:1; padding:8px;" oninput="window.updateAllocationTotal()" />` +
    `<input type="date" class="alloc-input-date" style="flex:1; padding:8px;" />` +
    `<input type="date" class="alloc-output-date" style="flex:1; padding:8px;" />` +
    `<button type="button" class="btn btn-danger" onclick="this.closest('.allocation-row').remove(); window.updateAllocationTotal();">X</button>` +
    `</div>`;
  el("allocation-rows").appendChild(row);
}

window.addAllocationRow = function () {
  addAllocationRowInternal();
};

window.updateAllocationTotal = function () {
  let total = 0;
  document.querySelectorAll("#allocation-rows .alloc-qty").forEach((inp) => {
    total += Number(inp.value) || 0;
  });
  const route = currentRouteData();
  const already = state.currentAllocations.reduce((s, a) => s + Number(a.qty || 0), 0);
  const max = route ? Number(route.max_qty) : 0;
  el("allocation-total").textContent = fmt(total);
  el("allocation-remaining").textContent = fmt(Math.max(max - already - total, 0));
};

async function loadLotAllocations() {
  const route = currentRouteData();
  if (!route) return;
  try {
    const res = await api("/api/leader/machine-allocations?lot_number=" + encodeURIComponent(route.po_id) + "&stage_id=" + encodeURIComponent(String(route.from_stage).toUpperCase()));
    state.currentAllocations = res.data || [];
  } catch (e) {
    state.currentAllocations = [];
  }
  renderLotAllocationsTable();
  window.updateAllocationTotal();
}

function renderLotAllocationsTable() {
  const tbody = el("allocation-list-tbody");
  if (!tbody) return;
  if (state.currentAllocations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Chưa có dữ liệu</td></tr>';
    return;
  }
  tbody.innerHTML = state.currentAllocations
    .map(
      (a) =>
        `<tr><td>${escapeHtml(a.machine_code || "-")}</td><td>${escapeHtml(stageName(a.stage_id))}</td><td>${fmt(a.qty)}</td><td>${a.input_date || "-"}</td><td>${a.output_date || "-"}</td></tr>`,
    )
    .join("");
}

window.submitMachineAllocations = async function () {
  const route = currentRouteData();
  if (!route) return showToast("Vui lòng chọn 1 PO trước.", true);

  const rows = Array.from(document.querySelectorAll("#allocation-rows .allocation-row"));
  const payloadRows = [];
  for (const row of rows) {
    const machineId = row.querySelector(".alloc-machine").value;
    const stageId = row.querySelector(".alloc-stage").value;
    const qty = Number(row.querySelector(".alloc-qty").value) || 0;
    const inputDate = row.querySelector(".alloc-input-date").value;
    const outputDate = row.querySelector(".alloc-output-date").value;
    if (!machineId || !stageId || qty <= 0) continue;
    payloadRows.push({ machine_id: machineId, stage_id: stageId, qty, input_date: inputDate, output_date: outputDate });
  }

  if (payloadRows.length === 0) return showToast("Chưa có dòng phân bổ hợp lệ nào.", true);

  let successCount = 0;
  const errors = [];
  for (const r of payloadRows) {
    try {
      await api("/api/machine-allocations", {
        method: "POST",
        body: JSON.stringify({ lot_number: route.po_id, stage_id: r.stage_id, machine_id: r.machine_id, qty: r.qty, input_date: r.input_date || null, output_date: r.output_date || null, user_id: state.user.ma_nv }),
      });
      successCount++;
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (errors.length > 0) alert(`Đã lưu ${successCount}/${payloadRows.length} dòng.\nLỗi:\n` + errors.join("\n"));
  else showToast("Đã lưu phân bổ xuống máy.");

  el("allocation-rows").innerHTML = "";
  state.allocationRowCount = 0;
  addAllocationRowInternal();
  await loadLotAllocations();
};
