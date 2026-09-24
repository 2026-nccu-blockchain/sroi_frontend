import type { Router } from "vue-router";

import { useAuthStore } from "@/modules/auth/store/auth.store";

export const registerRouterGuards = (router: Router): void => {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore();

    if (to.meta.requiresAuth && !authStore.user) {
      return {
        name: "login",
        query: { redirect: to.fullPath }
      };
    }

    if (authStore.user && !authStore.user.role) {
      await authStore.fetchProfile().catch(() => {
        // profile 抓失敗就讓畫面照常渲染，只是資料不完整
      });
    }

    if (to.name === "login" && authStore.user) {
      return { name: "dashboard" };
    }

    // 角色不符（包含未驗證、驗證中）就導回首頁
    if (to.meta.roles && !to.meta.roles.includes(authStore.user?.role ?? "")) {
      return { name: "dashboard" };
    }

    return true;
  });
};
