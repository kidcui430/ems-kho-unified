// ============================================================
// SẢN XUẤT - KHỞI CHẠY MODULE SX (js/sx/sx-main.js)
// Không xử lý đăng nhập/điều hướng vai trò ở đây - phần đó nằm ở
// js/main.js (router chung cho cả Kho NVL lẫn Sản Xuất).
// ============================================================
import { state, el } from "../state.js";
import { loadStagesLinesMachines, fetchHistoryLog } from "./sx-core.js";
import {
  fetchProductsList, bindMasterDataForm, bindPoCreateForm, renderLineMachineTable, bindLineMachineForms,
  bindNgForm, setSxDefaultDates,
} from "./sx-admin.js";
import { fetchPendingPOs } from "./sx-leader.js";

let sxEventsBound = false;

export function bindSxEvents() {
  if (sxEventsBound) return;
  sxEventsBound = true;

  bindMasterDataForm(async () => {
    await loadStagesLinesMachines();
  });
  bindPoCreateForm();
  bindLineMachineForms(fetchProductsList);
  bindNgForm(async () => {
    await fetchPendingPOs();
  });
}

export async function enterSxAdminApp() {
  el("admin-name").textContent = state.user.ten_nv;
  setSxDefaultDates();

  await loadStagesLinesMachines();
  await fetchProductsList();
  await renderLineMachineTable();

  window.switchTab("admin", "tab-matrix");
  window.fetchMatrixReport();
}

export async function enterSxLeaderApp() {
  el("leader-name").textContent = state.user.ten_nv;

  await loadStagesLinesMachines();
  const myStages = state.globalStages.filter((s) => s.line_id === state.user.line_id);
  el("leader-line").textContent = myStages.length > 0 ? myStages.map((s) => s.stage_name).join(", ") : state.user.line_id || "-";

  setSxDefaultDates();
  window.switchTab("leader", "tab-wip");
  await fetchPendingPOs();
}
