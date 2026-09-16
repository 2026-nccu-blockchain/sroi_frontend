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

app.mount("#app"); 