import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "@/app/App.vue";
import { router } from "@/app/router";
import { registerStores } from "@/app/store";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { setUnauthorizedHandler } from "@/shared/api/http";
import "@/shared/styles/main.scss";

const app = createApp(App);
const pinia = createPinia();

registerStores(pinia);
app.use(pinia);
app.use(router);

const authStore = useAuthStore();
setUnauthorizedHandler(() => {
  authStore.logout();
  router.push({ name: "login", query: { redirect: router.currentRoute.value.fullPath } });
});

// 等第一次導覽（含守衛裡的 fetchProfile）完成再掛載，側邊欄一開始就拿得到角色
router.isReady().then(() => app.mount("#app"));
