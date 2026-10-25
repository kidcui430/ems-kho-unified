// ============================================================
// SẢN XUẤT - LEADER: hàng chờ xử lý, chia xuống máy & báo chuyển công đoạn
// (js/sx/sx-leader.js)
// ============================================================
import { state, el, fmt, escapeHtml, showToast, api } from "../state.js";
import { stageName, getProductName, calcDurationText } from "./sx-core.js";

export async function fetchPendingPOs() {
  if (!state.user || state.user.role !== "LEADER") return;
  try {
    const result = await api(
      "/api/sx/leader/pending?line_id=" +
        encodeURIComponent(state.user.line_id || ""),
    );
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
  const uniqueProducts = [
    ...new Set(state.leaderPOsCache.map((po) => po.product_code)),
  ].filter(Boolean);
  productList.innerHTML = uniqueProducts
    .map((code) => {
      const name = getProductName(code);
      return `<option value="${code}">${name ? code + " - " + name : code}</option>`;
    })
    .join("");
  window.updateLeaderLotOptions();
}

window.updateLeaderLotOptions = function () {
  const productInput = el("search-leader-product");
  const lotList = el("leader-lot-list");
  if (!productInput || !lotList) return;

  const selectedProduct = productInput.value.trim().toUpperCase();
  let availableLots = state.leaderPOsCache;
  if (selectedProduct) {
    availableLots = state.leaderPOsCache.filter(
      (po) =>
        (po.product_code || "").toUpperCase().includes(selectedProduct) ||
        (po.ten_sp || getProductName(po.product_code) || "")
          .toUpperCase()
          .includes(selectedProduct),
    );
  }
  const uniqueLots = [
    ...new Set(availableLots.map((po) => po.po_number)),
  ].filter(Boolean);
  lotList.innerHTML = uniqueLots.map((l) => `<option value="${l}">`).join("");

  window.filterLeaderPOs();
};

window.filterLeaderPOs = function () {
  const prodVal = (el("search-leader-product")?.value || "")
    .trim()
    .toUpperCase();
  const lotVal = (el("search-leader-lot")?.value || "").trim().toUpperCase();

  const filtered = state.leaderPOsCache.filter((po) => {
    const spName = (
      po.ten_sp ||
      getProductName(po.product_code) ||
      ""
    ).toUpperCase();
    const matchProd =
      prodVal === "" ||
      (po.product_code || "").toUpperCase().includes(prodVal) ||
      spName.includes(prodVal);
    const matchLot =
      lotVal === "" || (po.po_number || "").toUpperCase().includes(lotVal);
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

  selectEl.innerHTML =
    '<option value="">-- Chọn LOT / Mã SP để phân máy hoặc chuyển công đoạn --</option>';
  wipContainer.innerHTML = "";

  if (data.length > 0) {
    data.forEach((po) => {
      const currentStageName = stageName(String(po.from_stage).toUpperCase());
      const toStageName = stageName(po.to_stage_name) || po.to_stage_name;
      const spName =
        po.ten_sp || getProductName(po.product_code) || "Chưa có tên SP";

      // Tính chi tiết đang chạy trên máy nào vs đang chờ phân máy
      const activeMachines = po.active_machines || [];
      const allocatedQty = activeMachines.reduce(
        (s, m) => s + Number(m.qty || 0),
        0,
      );
      // Line không có máy nào -> cho giao thẳng từ tồn trạm (mặc định coi như có máy nếu API cũ không trả cờ này)
      const lineHasMachines = po.line_has_machines !== false;

      const optionValue = JSON.stringify({
        po_id: po.po_id,
        product_id: po.product_id,
        product_name: spName,
        from_stage: po.from_stage,
        max_qty: po.qty_available,
        allocated_qty: allocatedQty,
        line_has_machines: lineHasMachines,
      });
      const optionText =
        `${po.po_number} | [${po.product_code} - ${spName}] | Tồn: ${po.qty_available} pcs` +
        (lineHasMachines ? ` | Đã phân máy: ${allocatedQty} pcs` : "") +
        ` ➔ ${toStageName}`;
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionText;
      selectEl.appendChild(option);
      const unallocatedQty = Math.max(
        Number(po.qty_available || 0) - allocatedQty,
        0,
      );

      let machineBreakdownHtml = "";
      if (activeMachines.length > 0) {
        machineBreakdownHtml += activeMachines
          .map(
            (m) =>
              `<div style="background:#e0f2fe; color:#0369a1; padding:4px 8px; border-radius:4px; font-size:12px; margin-top:4px;">` +
              `🔧 Máy <b>${escapeHtml(m.machine_code)}</b>: <b>${fmt(m.qty)} pcs</b> ` +
              `<span style="color:#0f766e;">(Đang chạy: ${calcDurationText(m.input_date, null)})</span>` +
              `</div>`,
          )
          .join("");
      }
      if (unallocatedQty > 0) {
        machineBreakdownHtml +=
          `<div style="background:#fef3c7; color:#b45309; padding:4px 8px; border-radius:4px; font-size:12px; margin-top:4px;">` +
          `⏳ Chưa phân bổ máy (Đang chờ tại trạm): <b>${fmt(unallocatedQty)} pcs</b>` +
          `</div>`;
      }

      const card = document.createElement("div");
      card.className = "card";
      card.style.borderLeft = "4px solid var(--lime)";
      card.innerHTML =
        `<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">` +
        `<div>` +
        `<h3 style="color: var(--navy); margin-bottom: 4px;">LOT: ${escapeHtml(po.po_number)}</h3>` +
        `<div style="font-size: 14px; font-weight: bold; color: #0284c7; margin-bottom: 8px;">🏷️ Mã SP: ${escapeHtml(po.product_code)} — ${escapeHtml(spName)}</div>` +
        `</div>` +
        `<button type="button" class="btn btn-primary" style="padding:6px 10px; font-size:12px;" onclick="quickPickLeaderPo('${escapeHtml(po.po_id)}')">Xử lý ➔</button>` +
        `</div>` +
        `<p style="margin-bottom: 5px;">📦 Tổng tồn tại khâu: <strong class="text-primary" style="font-size: 18px;">${fmt(po.qty_available)} pcs</strong></p>` +
        `<p style="font-size: 13px; margin-bottom: 4px;">📍 Khâu hiện tại: <strong style="color: var(--maroon);">${escapeHtml(currentStageName)}</strong> ` +
        (po.stage_in_time
          ? `<small style="color:#64748b;">(Kẹt/Chờ từ: ${calcDurationText(po.stage_in_time, null)})</small>`
          : "") +
        `</p>` +
        `<div style="margin: 6px 0;">${machineBreakdownHtml}</div>` +
        `<p style="font-size: 13px; margin-top: 6px;">➔ Sau khi PASS sẽ chuyển đến: <strong>${escapeHtml(toStageName)}</strong></p>`;
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
      if (targetOpt) {
        selectEl.value = targetOpt.value;
        window.onPoSelectChange();
      }
    }
  } else {
    selectEl.innerHTML = '<option value="">Chưa có dữ liệu</option>';
    wipContainer.innerHTML = `<div class="card" style="text-align: center; color: var(--gray-dark); padding: 30px;">Không có lô hàng nào đang chờ tại Line bạn quản lý.</div>`;
  }
}

// Nút bấm nhanh từ thẻ Số lượng tồn nhảy sang tab Thao tác và chọn sẵn LOT đó
window.quickPickLeaderPo = function (poId) {
  window.switchTab("leader", "tab-action");
  const selectEl = el("po-select");
  if (!selectEl) return;
  const opt = Array.from(selectEl.options).find((o) => {
    if (!o.value) return false;
    try {
      return JSON.parse(o.value).po_id === poId;
    } catch (e) {
      return false;
    }
  });
  if (opt) {
    selectEl.value = opt.value;
    window.onPoSelectChange();
  }
};

function ensureLeaderExtraUI() {
  // 1. Tạo khung hiển thị diễn giải Mã SP -> Tên SP ngay dưới ô chọn PO
  const selectEl = el("po-select");
  if (selectEl && !el("leader-selected-sp-info")) {
    const infoBox = document.createElement("div");
    infoBox.id = "leader-selected-sp-info";
    infoBox.className = "hidden";
    infoBox.style.cssText =
      "margin-top:8px; padding:10px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; font-size:13px; color:#0c4a6e;";
    selectEl.parentElement.appendChild(infoBox);
  }

  // 2. Dòng nhắc "Có thể giao tối đa" ngay dưới ô chọn PO (chỉ SL đang chạy trên máy mới được giao)
  const passInput = el("qty-pass");
  if (passInput && !el("move-allowed-info")) {
    const info = document.createElement("div");
    info.id = "move-allowed-info";
    info.className = "hidden";
    info.style.cssText =
      "margin:-4px 0 10px; padding:8px 10px; border-radius:6px; font-size:13px;";
    passInput.parentElement.parentElement.insertBefore(
      info,
      passInput.parentElement,
    );
  }
}

// SL đang chạy trên máy (chưa DONE) của LOT tại công đoạn đang chọn
function runningAllocatedQty() {
  return (state.currentAllocations || [])
    .filter((a) => a.status !== "DONE" && a.status !== "CANCELLED")
    .reduce((s, a) => s + Number(a.qty || 0), 0);
}

function renderMoveAllowedInfo() {
  const info = el("move-allowed-info");
  const route = currentRouteData();
  if (!info) return;
  if (!route) {
    info.classList.add("hidden");
    return;
  }
  info.classList.remove("hidden");
  if (route.line_has_machines === false) {
    info.style.background = "#f1f5f9";
    info.style.color = "#334155";
    info.innerHTML = `Line không có máy — giao thẳng từ tồn trạm, tối đa <b>${fmt(route.max_qty)} pcs</b>.`;
    return;
  }
  const allowed = runningAllocatedQty();
  if (allowed <= 0) {
    info.style.background = "#fef2f2";
    info.style.color = "#b91c1c";
    info.innerHTML = `⚠️ LOT chưa được phân bổ máy — hãy <b>Chia Xuống Máy</b> trước khi giao PASS/NG.`;
  } else {
    info.style.background = "#ecfdf5";
    info.style.color = "#047857";
    info.innerHTML = `✔ Có thể giao tối đa: <b>${fmt(allowed)} pcs</b> (đang chạy trên máy).`;
  }
}

window.submitMove = async function () {
  const selectEl = el("po-select");
  if (!selectEl) return;
  const selectedValue = selectEl.value;
  if (!selectedValue) return alert("Vui lòng chọn 1 LOT / PO!");

  const routeData = JSON.parse(selectedValue);
  const qtyPass = parseInt(el("qty-pass").value) || 0;
  const qtyNg = parseInt(el("qty-ng").value) || 0;

  if (qtyPass < 0 || qtyNg < 0) return alert("Số lượng không được âm!");
  if (qtyPass + qtyNg <= 0)
    return alert("Vui lòng nhập số lượng PASS hoặc NG!");
  if (qtyPass + qtyNg > routeData.max_qty)
    return alert(
      `Số lượng thao tác (${qtyPass + qtyNg}) vượt quá số lượng tồn (${routeData.max_qty})!`,
    );
  // Bắt buộc phân bổ máy trước khi giao (trừ Line không có máy)
  if (routeData.line_has_machines !== false) {
    const allowed = runningAllocatedQty();
    if (allowed <= 0)
      return alert(
        "LOT này chưa được phân bổ máy. Vui lòng Chia Xuống Máy trước khi giao sang công đoạn tiếp theo!",
      );
    if (qtyPass + qtyNg > allowed)
      return alert(
        `Số lượng thao tác (${qtyPass + qtyNg}) vượt quá số lượng đang chạy trên máy (${allowed})! Vui lòng phân bổ thêm máy.`,
      );
  }

  try {
    await api("/api/sx/move", {
      method: "POST",
      body: JSON.stringify({
        lot_number: routeData.po_id,
        product_id: routeData.product_id,
        from_stage: routeData.from_stage,
        qty_pass: qtyPass,
        qty_ng: qtyNg,
        user_id: state.user.ma_nv,
      }),
    });
    showToast("Đã báo chuyển công đoạn & chốt thời gian chạy máy thành công!");
    el("qty-pass").value = 0;
    el("qty-ng").value = 0;
    await fetchPendingPOs();
    await loadLotAllocations();
  } catch (error) {
    showToast(error.message, true);
  }
};

// ---------------- CHIA LOT & MÃ HÀNG XUỐNG MÁY THUỘC LINE ----------------
window.onPoSelectChange = async function () {
  ensureLeaderExtraUI();
  const selectEl = el("po-select");
  const card = el("allocation-card");
  const infoBox = el("leader-selected-sp-info");
  if (!selectEl || !card) return;

  if (!selectEl.value) {
    card.classList.add("hidden");
    if (infoBox) infoBox.classList.add("hidden");
    renderMoveAllowedInfo();
    return;
  }

  const route = currentRouteData();
  if (infoBox && route) {
    const spName =
      route.product_name ||
      getProductName(route.product_id) ||
      "Chưa rõ tên SP";
    infoBox.classList.remove("hidden");
    infoBox.innerHTML =
      `<div>🏷️ <b>Mã sản phẩm:</b> <span style="color:#dc2626; font-weight:bold;">${escapeHtml(route.product_id)}</span> — <b>${escapeHtml(spName)}</b></div>` +
      `<div style="margin-top:4px;">📍 <b>Khâu hiện tại:</b> ${escapeHtml(stageName(route.from_stage))} | <b>Tồn khả dụng:</b> ${fmt(route.max_qty)} pcs</div>`;
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

function nowDateTimeLocal() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

function addAllocationRowInternal() {
  state.allocationRowCount++;
  const idx = state.allocationRowCount;
  const route = currentRouteData();
  const lineMachines = state.globalMachines.filter(
    (m) => m.line_id === state.user.line_id,
  );
  const lineStages = state.globalStages.filter(
    (s) => s.line_id === state.user.line_id,
  );
  const spLabel = route
    ? `${route.product_id} - ${route.product_name || getProductName(route.product_id)}`
    : "";

  const row = document.createElement("div");
  row.className = "allocation-row";
  row.dataset.rowId = idx;
  row.style.cssText =
    "border:1px solid #cbd5e1; background:#f8fafc; border-radius:8px; padding:10px; margin-bottom:10px;";
  row.innerHTML =
    (spLabel
      ? `<div style="font-size:12px; font-weight:bold; color:var(--navy); margin-bottom:6px;">📦 Phân bổ SP: <span style="color:#0284c7;">${escapeHtml(spLabel)}</span> (LOT: ${escapeHtml(route.po_id)})</div>`
      : "") +
    `<div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;">` +
    `<select class="alloc-machine" style="flex:1; min-width:140px; padding:8px; font-weight:bold;"><option value="">-- Chọn Máy thuộc Line ${escapeHtml(state.user.line_id || "")} --</option>${lineMachines.map((m) => `<option value="${m.id}">${escapeHtml(m.machine_code)}${m.machine_name ? " - " + escapeHtml(m.machine_name) : ""}</option>`).join("")}</select>` +
    `<select class="alloc-stage" style="flex:1; min-width:130px; padding:8px;"><option value="">-- Công đoạn --</option>${lineStages.map((s) => `<option value="${s.stage_id}" ${route && s.stage_id === String(route.from_stage).toUpperCase() ? "selected" : ""}>${escapeHtml(s.stage_name)}</option>`).join("")}</select>` +
    `</div>` +
    `<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">` +
    `<input type="number" class="alloc-qty" placeholder="SL giao máy (pcs)" min="1" style="flex:1; min-width:110px; padding:8px;" oninput="window.updateAllocationTotal()" />` +
    `<label style="flex:1.2; min-width:170px; font-size:11px; color:#475569; margin:0;">Bắt đầu chạy:<input type="datetime-local" class="alloc-input-date" value="${nowDateTimeLocal()}" style="width:100%; padding:6px;" /></label>` +
    `<label style="flex:1.2; min-width:170px; font-size:11px; color:#475569; margin:0;">Dự kiến xong (tùy chọn):<input type="datetime-local" class="alloc-output-date" style="width:100%; padding:6px;" /></label>` +
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
  const runningList = (state.currentAllocations || []).filter(
    (a) => a.status !== "DONE",
  );
  const already = runningList.reduce((s, a) => s + Number(a.qty || 0), 0);
  const max = route ? Number(route.max_qty) : 0;
  el("allocation-total").textContent = fmt(total);
  el("allocation-remaining").textContent = fmt(
    Math.max(max - already - total, 0),
  );
};

async function loadLotAllocations() {
  const route = currentRouteData();
  if (!route) return;
  try {
    const res = await api(
      "/api/leader/machine-allocations?lot_number=" +
        encodeURIComponent(route.po_id) +
        "&stage_id=" +
        encodeURIComponent(String(route.from_stage).toUpperCase()),
    );
    state.currentAllocations = res.data || [];
  } catch (e) {
    state.currentAllocations = [];
  }
  renderLotAllocationsTable();
  renderMoveAllowedInfo();
  window.updateAllocationTotal();
}

function renderLotAllocationsTable() {
  const tbody = el("allocation-list-tbody");
  if (!tbody) return;
  if (state.currentAllocations.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center">Chưa có máy nào được phân bổ cho LOT này</td></tr>';
    return;
  }
  const route = currentRouteData();
  const spCode = route ? route.product_id : "";
  const spName = route ? route.product_name || getProductName(spCode) : "";

  tbody.innerHTML = state.currentAllocations
    .map((a) => {
      const isDone = a.status === "DONE";
      const durText = calcDurationText(
        a.input_date,
        isDone ? a.output_date : null,
      );
      const statusBadge = isDone
        ? `<span style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">✔ Đã xong (${durText})</span>`
        : `<span style="background:#fef3c7; color:#b45309; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">⚙️ Đang chạy (${durText})</span>`;

      return `<tr>
        <td>
          <b style="color:var(--navy);">${escapeHtml(a.machine_code || "-")}</b>
          <br><small style="color:#0284c7;">${escapeHtml(a.ma_sp || spCode)} ${escapeHtml(a.ten_sp || spName ? "- " + (a.ten_sp || spName) : "")}</small>
        </td>
        <td>${escapeHtml(stageName(a.stage_id))}<br>${statusBadge}</td>
        <td><b>${fmt(a.qty)} pcs</b></td>
        <td>${escapeHtml((a.input_date || "-").replace("T", " "))}</td>
        <td>${escapeHtml((a.output_date || (isDone ? "-" : "Đang gia công")).replace("T", " "))}</td>
      </tr>`;
    })
    .join("");
}

window.submitMachineAllocations = async function () {
  const route = currentRouteData();
  if (!route) return showToast("Vui lòng chọn 1 PO trước.", true);

  const rows = Array.from(
    document.querySelectorAll("#allocation-rows .allocation-row"),
  );
  const payloadRows = [];
  for (const row of rows) {
    const machineId = row.querySelector(".alloc-machine").value;
    const stageId = row.querySelector(".alloc-stage").value;
    const qty = Number(row.querySelector(".alloc-qty").value) || 0;
    const inputDate = row
      .querySelector(".alloc-input-date")
      .value.replace("T", " ");
    const outputDate = row
      .querySelector(".alloc-output-date")
      .value.replace("T", " ");
    if (!machineId || !stageId || qty <= 0) continue;
    payloadRows.push({
      machine_id: machineId,
      stage_id: stageId,
      qty,
      input_date: inputDate,
      output_date: outputDate,
    });
  }

  if (payloadRows.length === 0)
    return showToast("Vui lòng chọn Máy và nhập Số lượng phân bổ > 0.", true);

  let successCount = 0;
  const errors = [];
  for (const r of payloadRows) {
    try {
      await api("/api/machine-allocations", {
        method: "POST",
        body: JSON.stringify({
          lot_number: route.po_id,
          ma_sp: route.product_id,
          stage_id: r.stage_id,
          machine_id: r.machine_id,
          qty: r.qty,
          input_date: r.input_date || null,
          output_date: r.output_date || null,
          user_id: state.user.ma_nv,
        }),
      });
      successCount++;
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (errors.length > 0)
    alert(
      `Đã lưu ${successCount}/${payloadRows.length} dòng.\nLỗi:\n` +
        errors.join("\n"),
    );
  else showToast("Đã phân bổ sản phẩm xuống máy thành công!");

  el("allocation-rows").innerHTML = "";
  state.allocationRowCount = 0;
  addAllocationRowInternal();
  await fetchPendingPOs();
  await loadLotAllocations();
};
