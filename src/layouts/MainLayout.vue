<script setup lang="ts">
import { useRouter } from "vue-router";

import { useAuth } from "@/modules/auth/composables/useAuth";

const router = useRouter();
const { user, isAuthenticated, logout } = useAuth();

const handleLogout = async (): Promise<void> => {
  logout();
  await router.push("/");
};
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div>
        <RouterLink class="sidebar__brand" to="/">SROI</RouterLink>

        <nav class="sidebar__nav" aria-label="Main navigation">
          <template v-if="isAuthenticated">
            <p class="sidebar__label">工作區</p>
            <RouterLink class="sidebar__link" to="/">
              <span>我的專案</span>
            </RouterLink>
            <RouterLink class="sidebar__link" to="/">
              <span>我的群組</span>
            </RouterLink>
            <p> </p> <!--排版空白-->
            <p class="sidebar__label">共用資料庫</p>
            <RouterLink class="sidebar__link" to="/">
              <span>專案</span>
            </RouterLink>
            <RouterLink class="sidebar__link" to="/">
              <span>財務代理變數</span>
            </RouterLink>
          </template>
          <template v-else>
            <p class="sidebar__label">共用資料庫</p>
            <RouterLink class="sidebar__link" to="/">
              <span>專案</span>
            </RouterLink>
            <RouterLink class="sidebar__link" to="/">
              <span>財務代理變數</span>
            </RouterLink>
          </template>
        </nav>
      </div>

      <div class="sidebar__account">
        <template v-if="isAuthenticated">
          <p class="sidebar__label">Signed in as</p>
          <span class="sidebar__email">{{ user?.user_id }}</span>
          <button class="sidebar__auth-action" type="button" @click="handleLogout">Log out</button>
        </template>
        <template v-else>
          <p class="sidebar__guest">Sign in to add, edit, or delete projects.</p>
          <div class="sidebar__auth">
            <RouterLink class="sidebar__auth-action" to="/login">登入 →</RouterLink>
            <RouterLink class="sidebar__auth-action" to="/login">註冊 →</RouterLink>
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
.layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
}

.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100vh;
  padding: 30px 24px;
  border-right: 1px solid #000;
  background: #fff;
  color: #000;
}

.sidebar__brand {
  display: inline-block;
  margin-bottom: 64px;
  color: inherit;
  font-size: 25px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-decoration: none;
}

.sidebar__nav,
.sidebar__account {
  display: grid;
  gap: 0;
}

.sidebar__label {
  margin: 0 0 15px;
  color: #777;
  font-size: 12px;
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
  text-decoration: none;
  cursor: pointer;
}

.sidebar__link:last-child {
  border-bottom: 1px solid #000;
}

.sidebar__link.router-link-exact-active span:first-child::before {
  content: "●";
  margin-right: 8px;
  font-size: 7px;
  vertical-align: 2px;
}

.sidebar__auth {
  display: flex;
}

.sidebar__guest,
.sidebar__email {
  margin: 0 0 16px;
  overflow-wrap: anywhere;
  color: #555;
  font-size: 12px;
  line-height: 1.5;
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
  padding: clamp(40px, 7vw, 88px) clamp(20px, 5vw, 72px);
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
    padding: 20px;
    border-right: 0;
    border-bottom: 1px solid #000;
  }

  .sidebar > div:first-child {
    display: contents;
  }

  .sidebar__brand {
    margin: 0;
  }

  .sidebar__nav {
    display: flex;
    justify-content: flex-end;
    gap: 18px;
  }

  .sidebar__label,
  .sidebar__account,
  .sidebar__link span:last-child {
    display: none;
  }

  .sidebar__link {
    width: auto;
    min-height: auto;
    border: 0;
  }

  .sidebar__link:last-child {
    border-bottom: 0;
  }
}
</style>
