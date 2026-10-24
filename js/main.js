// ============================================================
// ROUTER CHUNG: ĐĂNG NHẬP, PHÂN QUYỀN, CHUYỂN GIỮA KHO NVL & SẢN XUẤT
// (js/main.js)
// ============================================================
import { state, el, showToast, api } from "./state.js";
import { bindKhoEvents, enterKhoApp } from "./kho/kho-main.js";
import { bindSxEvents, enterSxAdminApp, enterSxLeaderApp } from "./sx/sx-main.js";

let tempUserForPassChange = null;
let khoBound = false;
let sxBound = false;

function hideAllScreens() {
  el("login-screen").classList.add("hidden");
  el("system-switcher").classList.add("hidden");
  el("kho-app").classList.add("hidden");
  el("sx-app").classList.add("hidden");
  el("admin-screen").classList.add("hidden");
  el("leader-screen").classList.add("hidden");
}

function setRoleStyle(system) {
  el("roleStyleLink").href = system === "KHO" ? "style-kho.css" : "style-sx.css";
}

async function enterKhoShell() {
  setRoleStyle("KHO");
  el("kho-app").classList.remove("hidden");
  if (!khoBound) {
    bindKhoEvents();
    khoBound = true;
  }
  await enterKhoApp();
}

async function enterSxShell() {
  setRoleStyle("SX");
  el("sx-app").classList.remove("hidden");
  if (!sxBound) {
    bindSxEvents();
    sxBound = true;
  }
  if (state.user.role === "LEADER") {
    el("leader-screen").classList.remove("hidden");
    await enterSxLeaderApp();
  } else {
    el("admin-screen").classList.remove("hidden");
    await enterSxAdminApp();
  }
}

window.switchSystem = async function (system) {
  hideAllScreens();
  el("system-switcher").classList.remove("hidden");
  el("switchToKhoBtn").classList.toggle("active", system === "KHO");
  el("switchToSxBtn").classList.toggle("active", system === "SX");

  if (system === "KHO") await enterKhoShell();
  else await enterSxShell();
};

async function navigateToRoleScreen() {
  hideAllScreens();

  if (state.user.he_thong === "ALL") {
    el("system-switcher").classList.remove("hidden");
    await window.switchSystem("KHO");
    return;
  }
  if (state.user.he_thong === "SX") {
    await enterSxShell();
    return;
  }
  await enterKhoShell();
}

window.logout = function () {
  state.user = null;
  localStorage.removeItem("ems_kho_user");
  hideAllScreens();
  el("login-form").reset();
  el("login-screen").classList.remove("hidden");
};

window.submitNewPassword = async function () {
  const newPass = el("new-password").value;
  if (newPass.length < 4) return alert("Mật khẩu phải từ 4 ký tự trở lên!");
  try {
    await api("/api/change-password", {
      method: "POST",
      body: JSON.stringify({ ma_nv: tempUserForPassChange.ma_nv, new_password: newPass }),
    });
    el("change-pass-modal").classList.add("hidden");
    state.user = tempUserForPassChange;
    localStorage.setItem("ems_kho_user", JSON.stringify(state.user));
    await navigateToRoleScreen();
  } catch (e) {
    alert("Lỗi máy chủ khi đổi mật khẩu: " + e.message);
  }
};

async function handleLogin(e) {
  e.preventDefault();
  const maNv = el("username").value.toUpperCase().trim();
  const password = el("password").value;
  const errorMsg = el("login-error");
  errorMsg.classList.add("hidden");

  try {
    const data = await api("/api/login", { method: "POST", body: JSON.stringify({ ma_nv: maNv, password }) });

    if (data.must_change_password) {
      tempUserForPassChange = data;
      el("change-pass-modal").classList.remove("hidden");
      return;
    }

    state.user = data;
    localStorage.setItem("ems_kho_user", JSON.stringify(state.user));
    await navigateToRoleScreen();
  } catch (error) {
    errorMsg.textContent = error.message || "Sai tài khoản hoặc mật khẩu!";
    errorMsg.classList.remove("hidden");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  el("login-form").addEventListener("submit", handleLogin);

  const saved = localStorage.getItem("ems_kho_user");
  if (saved) {
    try {
      state.user = JSON.parse(saved);
      await navigateToRoleScreen();
    } catch (e) {
      localStorage.removeItem("ems_kho_user");
    }
  }
});
