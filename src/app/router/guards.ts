import type { Router } from "vue-router";

import { useAuthStore } from "@/modules/auth/store/auth.store";

const PROFILE_REFRESH_MS = 5 * 60 * 1000;
const ENROLLMENT_ROUTE = "enrollment-verify";

export const registerRouterGuards = (router: Router): void => {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore();

    if (!to.meta.public && !authStore.user) {
      return {
        name: "login",
        query: { redirect: to.fullPath }
      };
    }

    // 在學驗證狀態會隨時間改變（例如 9/1 起需要驗證），profile 超過 5 分鐘就重抓
    const profileStale = Date.now() - authStore.profileFetchedAt > PROFILE_REFRESH_MS;
    if (authStore.user && (!authStore.user.role || profileStale)) {
      await authStore.fetchProfile().catch(() => {
        // profile 抓失敗就讓畫面照常渲染，只是資料不完整
      });
    }

    // 需要在學驗證的學生只能使用驗證頁
    if (authStore.user && authStore.needsEnrollmentVerification && to.name !== ENROLLMENT_ROUTE) {
      return { name: ENROLLMENT_ROUTE };
    }
    // 不是學生就沒有驗證頁
    if (to.name === ENROLLMENT_ROUTE && authStore.user?.enrollment && !authStore.user.enrollment.is_student) {
      return { name: "dashboard" };
    }

    if ((to.name === "login" || to.name === "register") && authStore.user) {
      return { name: "dashboard" };
    }

    // 角色不符就導回首頁
    if (to.meta.roles && !to.meta.roles.includes(authStore.user?.role ?? "")) {
      return { name: "dashboard" };
    }

    return true;
  });
};
