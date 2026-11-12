<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { useAuth } from "@/modules/auth/composables/useAuth";
import { ADMIN_ROLES, WORKSPACE_ROLES } from "@/modules/auth/constants";
import { ROLE_LABELS } from "@/modules/profile/constants";
import { confirmLeaveCurrentPage } from "@/shared/composables/useUnsavedChanges";

const router = useRouter();
const { user, logout } = useAuth();

const canUseWorkspace = computed(() => WORKSPACE_ROLES.includes(user.value?.role ?? ""));
const isAdmin = computed(() => ADMIN_ROLES.includes(user.value?.role ?? ""));
const roleLabel = computed(() => ROLE_LABELS[user.value?.role ?? ""] ?? user.value?.role);

// 側邊欄收合狀態記在瀏覽器，重新整理後維持；讀寫失敗（無痕、封鎖儲存）就用預設展開
const SIDEBAR_COLLAPSED_KEY = "sroi_sidebar_collapsed";
const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};
const sidebarCollapsed = ref(readCollapsed());
watch(sidebarCollapsed, (collapsed) => {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // 存不了就只在這次瀏覽有效
  }
});
const toggleSidebar = (): void => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const handleLogout = async (): Promise<void> => {
  // 先確認可以離開目前頁面，未儲存提醒按取消就不登出
  if (!(await confirmLeaveCurrentPage())) return;
  logout();
  await router.push({ name: "login" });
};
</script>

<template>
  <div class="layout" :class="{ 'layout--collapsed': sidebarCollapsed }">
    <aside class="sidebar">
      <button
        class="sidebar__toggle"
        type="button"
        aria-controls="main-sidebar-panel"
        :aria-expanded="!sidebarCollapsed"
        :aria-label="sidebarCollapsed ? '展開選單' : '收起選單'"
        :title="sidebarCollapsed ? '展開選單' : '收起選單'"
        @click="toggleSidebar"
      >
        <span aria-hidden="true">{{ sidebarCollapsed ? "»" : "«" }}</span>
      </button>

      <!-- 內容固定寬度，收合時只是被裁切隱藏，文字與間隔不會跟著寬度變動 -->
      <div id="main-sidebar-panel" class="sidebar__panel">
        <div>
          <RouterLink class="sidebar__brand" to="/">SROI</RouterLink>

          <nav class="sidebar__nav" aria-label="主選單">
            <div v-if="canUseWorkspace" class="sidebar__group">
              <p class="sidebar__label">工作區</p>
              <RouterLink class="sidebar__link" to="/workspace/projects">
                <span>我的專案</span>
              </RouterLink>
              <RouterLink class="sidebar__link" to="/workspace/groups" active-class="sidebar__link--active">
                <span>我的群組</span>
              </RouterLink>
            </div>

            <div class="sidebar__group">
              <p class="sidebar__label">共用資料庫</p>
              <RouterLink class="sidebar__link" to="/">
                <span>專案</span>
              </RouterLink>
              <RouterLink class="sidebar__link" to="/proxy-variables">
                <span>財務代理變數</span>
              </RouterLink>
            </div>

            <div v-if="isAdmin" class="sidebar__group">
              <p class="sidebar__label">管理</p>
              <RouterLink class="sidebar__link" to="/admin/users" active-class="sidebar__link--active">
                <span>所有使用者</span>
              </RouterLink>
              <RouterLink class="sidebar__link" to="/admin/groups" active-class="sidebar__link--active">
                <span>所有群組</span>
              </RouterLink>
            </div>
          </nav>
        </div>

        <div class="sidebar__account">
          <p class="sidebar__label">角色權限：{{ roleLabel }}</p>
          <RouterLink class="sidebar__user" to="/profile">{{ user?.campus_id }} {{ user?.name }}</RouterLink>
          <button class="sidebar__auth-action" type="button" @click="handleLogout">登出</button>
        </div>
      </div>
    </aside>

    <main class="layout__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  transition: grid-template-columns 0.2s ease;
}

/* 收合後側邊欄只留展開按鈕，工作區跟著變寬 */
.layout--collapsed {
  grid-template-columns: 56px minmax(0, 1fr);
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  border-right: 1px solid #000;
  background: #fff;
  color: #000;
}

.sidebar__toggle {
  position: absolute;
  top: 31px;
  right: 14px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #000;
  padding: 0;
  background: #fff;
  color: #000;
  font: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.sidebar__toggle:hover {
  background: #000;
  color: #fff;
}

/* 固定 240px 寬，收合時被 .sidebar 裁切並隱藏，不會重新排版 */
.sidebar__panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 240px;
  height: 100%;
  padding: 30px 24px;
  overflow-y: auto;
  transition: opacity 0.15s ease, visibility 0.15s ease;
}

.layout--collapsed .sidebar__panel {
  opacity: 0;
  visibility: hidden;
}

.sidebar__brand {
  display: inline-block;
  margin-bottom: 35px;
  color: inherit;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-decoration: none;
}

.sidebar__nav {
  display: grid;
  gap: 28px;
}

.sidebar__group,
.sidebar__account {
  display: grid;
  gap: 0;
}

.sidebar__label {
  margin: 0 0 15px;
  white-space: nowrap;
  color: #777;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.sidebar__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  border: 0;
  border-top: 1px solid #000;
  padding: 0;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
}

.sidebar__link:last-child {
  border-bottom: 1px solid #000;
}

.sidebar__user {
  margin: 0 0 16px;
  overflow-wrap: anywhere;
  color: #000000;
  font-size: 16px;
  line-height: 1.5;
  letter-spacing: 0.08em;
}

.sidebar__user {
  text-decoration: none;
}

.sidebar__user:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.sidebar__auth-action {
  justify-self: start;
  margin: 0 40px 0 0;
  border: 0;
  border-bottom: 1px solid #000;
  padding: 3px 0;
  background: transparent;
  color: #000;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

.layout__content {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  /* 上方固定 30px，跟側邊欄的 SROI 對齊；下方留白不變（GroupDetail 成員欄高度有用到） */
  padding: 30px clamp(20px, 5vw, 72px) clamp(40px, 7vw, 88px);
}

@media (max-width: 720px) {
  .layout {
    display: block;
  }

  .sidebar {
    position: static;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 24px;
    height: auto;
    overflow: visible;
    padding: 20px;
    border-right: 0;
    border-bottom: 1px solid #000;
  }

  /* 手機版是頂部橫列，不提供收合 */
  .sidebar__toggle {
    display: none;
  }

  .sidebar__panel,
  .layout--collapsed .sidebar__panel {
    display: contents;
    opacity: 1;
    visibility: visible;
  }

  .sidebar__panel > div:first-child,
  .sidebar__group {
    display: contents;
  }

  .sidebar__brand {
    margin: 0;
  }

  /*
   * 連結太多放不下時可以左右滑動；用第一個連結的 margin-left: auto 靠右，
   * 不用 justify-content: flex-end，否則溢出時最左邊的連結會被切掉、滑不到
   */
  .sidebar__nav {
    display: flex;
    gap: 18px;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .sidebar__nav::-webkit-scrollbar {
    display: none;
  }

  .sidebar__nav > :first-child .sidebar__link:first-of-type {
    margin-left: auto;
  }

  .sidebar__label,
  .sidebar__account {
    display: none;
  }

  .sidebar__link {
    flex: none;
    width: auto;
    min-height: 32px;
    border: 0;
  }

  .sidebar__link:last-child {
    border-bottom: 0;
  }
}
</style>