import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "@/app/App.vue";
import { router } from "@/app/router";
import { registerStores } from "@/app/store";
import "@/shared/styles/main.scss";

const app = createApp(App);
const pinia = createPinia();

registerStores(pinia);
app.use(pinia);
app.use(router);

app.mount("#app");
