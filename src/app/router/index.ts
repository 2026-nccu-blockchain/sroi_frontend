import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

import AuthLayout from "@/layouts/AuthLayout.vue";
import MainLayout from "@/layouts/MainLayout.vue";
import LoginPage from "@/modules/auth/pages/LoginPage.vue";
import DashboardPage from "@/modules/dashboard/pages/DashboardPage.vue";
import FormBuilderPage from "@/modules/forms/pages/FormBuilderPage.vue";
import { registerRouterGuards } from "@/app/router/guards";

const routes: RouteRecordRaw[] = [
  {
    path: "/forms/new",
    name: "form-builder",
    component: FormBuilderPage
  },
  {
    path: "/login",
    component: AuthLayout,
    children: [
      {
        path: "",
        name: "login",
        component: LoginPage
      }
    ]
  },
  {
    path: "/",
    component: MainLayout,
    children: [
      {
        path: "",
        name: "dashboard",
        component: DashboardPage
      }
    ]
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

registerRouterGuards(router);
