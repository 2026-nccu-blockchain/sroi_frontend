<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";

import { useAuth } from "@/modules/auth/composables/useAuth";
import { ADMIN_ROLES, WORKSPACE_ROLES } from "@/modules/auth/constants";
import { ROLE_LABELS } from "@/modules/profile/constants";

const router = useRouter();
const { user, isAuthenticated, logout } = useAuth();
const userInitial = computed(() => user.value?.email?.charAt(0).toUpperCase() ?? "U");

// 未驗證、驗證中的帳號導覽列跟訪客一樣
const canUseWorkspace = computed(() => WORKSPACE_ROLES.includes(user.value?.role ?? ""));
const isAdmin = computed(() => ADMIN_ROLES.includes(user.value?.role ?? ""));
const roleLabel = computed(() => ROLE_LABELS[user.value?.role ?? ""] ?? user.value?.role);

const handleLogout = async (): Promise<void> => {
  logout();
  await router.push("/");
};
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div>
        <RouterLink class="sidebar__brand" to="/">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>SROI <small>Workspace</small></span>
        </RouterLink>

        <nav class="sidebar__nav" aria-label="主要導覽">
          <p class="sidebar__label">首頁</p>
          <RouterLink class="sidebar__link" to="/">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 11 8-7 8 7v9H4z" /><path d="M9 20v-6h6v6" /></svg>
            <span>總覽</span>
          </RouterLink>

          <p class="sidebar__label sidebar__label--section">表單</p>
          <RouterLink class="sidebar__link" to="/forms">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>
            <span>我的表單</span>
          </RouterLink>

          <RouterLink v-if="isAuthenticated" class="sidebar__link" to="/forms/new">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            <span>新增表單</span>
          </RouterLink>

          <template v-if="canUseWorkspace">
            <p class="sidebar__label sidebar__label--section">工作區</p>
            <RouterLink class="sidebar__link" to="/workspace/projects">
              <span>我的專案</span>
            </RouterLink>
            <RouterLink class="sidebar__link" to="/workspace/groups" active-class="sidebar__link--active">
              <span>我的群組</span>
            </RouterLink>
          </template>

          <p class="sidebar__label sidebar__label--section">共用資料庫</p>
          <RouterLink class="sidebar__link" to="/proxy-variables">
            <span>財務代理變數</span>
          </RouterLink>

          <template v-if="isAdmin">
            <p class="sidebar__label sidebar__label--section">管理</p>
            <RouterLink class="sidebar__link" to="/admin/users" active-class="sidebar__link--active">
              <span>所有使用者</span>
            </RouterLink>
            <RouterLink class="sidebar__link" to="/admin/groups" active-class="sidebar__link--active">
              <span>所有群組</span>
            </RouterLink>
          </template>
        </nav>
      </div>

      <div class="sidebar__account">
        <template v-if="isAuthenticated">
          <div class="account-avatar">{{ userInitial }}</div>
          <div class="account-copy">
            <strong>{{ roleLabel || "目前帳號" }}</strong>
            <RouterLink to="/profile">{{ user?.email }}</RouterLink>
          </div>
          <button type="button" title="登出" aria-label="登出" @click="handleLogout">↪</button>
        </template>
        <template v-else>
          <p class="sidebar__guest">訪客模式</p>
          <div class="sidebar__auth">
            <RouterLink class="sidebar__auth-action" to="/auth/login">登入 →</RouterLink>
            <RouterLink class="sidebar__auth-action" to="/auth/register">註冊 →</RouterLink>
          </div>
        </template>
      </div>
    </aside>

    <main class="layout__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout { min-height: 100vh; display: grid; grid-template-columns: 236px minmax(0, 1fr); background: #f7f5fa; }
.sidebar { position: sticky; top: 0; z-index: 10; display: flex; height: 100vh; flex-direction: column; justify-content: space-between; padding: 26px 18px 20px; border-right: 1px solid #e7e0ea; background: rgba(255,255,255,.96); color: #3a333f; }
.sidebar__brand { display: flex; align-items: center; gap: 11px; margin: 0 8px 54px; color: inherit; font-size: 16px; font-weight: 800; letter-spacing: .06em; text-decoration: none; }
.sidebar__brand small { display: block; margin-top: 1px; color: #9b919f; font-size: 8px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.brand-mark { display: grid; width: 35px; height: 35px; grid-template-columns: repeat(3, 4px); align-content: end; justify-content: center; gap: 3px; padding-bottom: 8px; border-radius: 10px; background: linear-gradient(145deg, #825da0, #5f3c79); box-shadow: 0 5px 12px rgba(90, 55, 113, .2); }
.brand-mark i { border-radius: 2px; background: #fff; }
.brand-mark i:nth-child(1) { height: 8px; }.brand-mark i:nth-child(2) { height: 13px; }.brand-mark i:nth-child(3) { height: 19px; }
.sidebar__nav { display: grid; gap: 6px; }
.sidebar__label { margin: 0 12px 7px; color: #a198a5; font-size: 9px; font-weight: 750; letter-spacing: .14em; text-transform: uppercase; }
.sidebar__label--section { margin-top: 18px; }
.sidebar__link { display: flex; min-height: 44px; align-items: center; gap: 12px; padding: 0 13px; border-radius: 9px; color: #716976; font-size: 12px; font-weight: 650; text-decoration: none; transition: background 140ms ease, color 140ms ease; }
.sidebar__link svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.sidebar__link:hover { background: #f6f1f8; color: #765292; }
.sidebar__link.router-link-exact-active { background: #eee5f3; color: #684884; }
.sidebar__account { display: flex; align-items: center; gap: 10px; padding: 13px 10px; border: 1px solid #ebe5ee; border-radius: 11px; background: #faf8fb; }
.account-avatar { display: grid; flex: 0 0 34px; width: 34px; height: 34px; place-items: center; border-radius: 50%; background: #dfcee8; color: #67477e; font-size: 12px; font-weight: 800; }
.account-copy { display: grid; min-width: 0; flex: 1; gap: 2px; }
.account-copy strong { color: #5c5460; font-size: 9px; }
.account-copy a { overflow: hidden; color: #8c838f; font-size: 9px; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
.sidebar__account button { border: 0; background: transparent; color: #8d8291; font-size: 16px; }
.sidebar__account > p { margin: 0; color: #817887; font-size: 10px; line-height: 1.5; }
.sidebar__account > a { flex: none; color: #765292; font-size: 10px; font-weight: 700; text-decoration: none; }
.sidebar__guest { margin: 0; }
.sidebar__auth { display: flex; gap: 10px; }
.sidebar__auth-action { color: #765292; font-size: 10px; font-weight: 700; text-decoration: none; }
.layout__content { width: 100%; max-width: 1440px; margin: 0 auto; padding: clamp(28px, 4vw, 54px) clamp(22px, 4.5vw, 66px) 70px; }
@media (max-width: 760px) {
  .layout { display: block; }
  .sidebar { position: sticky; display: flex; height: 64px; flex-direction: row; align-items: center; padding: 0 16px; border-right: 0; border-bottom: 1px solid #e7e0ea; }
  .sidebar > div:first-child { display: flex; align-items: center; width: 100%; justify-content: space-between; }
  .sidebar__brand { margin: 0; }
  .sidebar__brand small, .sidebar__label, .sidebar__account { display: none; }
  .sidebar__nav { display: flex; }
  .sidebar__link { min-height: 38px; padding: 0 10px; }
  .sidebar__link svg { display: none; }
  .layout__content { padding: 22px 14px 50px; }
}
</style>
