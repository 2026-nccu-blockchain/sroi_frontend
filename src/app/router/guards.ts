import type { Router } from "vue-router";

export const registerRouterGuards = (router: Router): void => {
  router.beforeEach((to) => {
    if (to.name === "dashboard") {
      return true;
    }

    return true;
  });
};
