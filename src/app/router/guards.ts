import type { Router } from "vue-router";

import { useAuthStore } from "@/modules/auth/store/auth.store";

export const registerRouterGuards = (router: Router): void => {
  router.beforeEach((to) => {
    const authStore = useAuthStore();

    if (to.meta.requiresAuth && !authStore.user) {
      return {
        name: "login",
        query: { redirect: to.fullPath }
      };
    }

    if (to.name === "login" && authStore.user) {
      return { name: "dashboard" };
    }

    return true;
  });
};
