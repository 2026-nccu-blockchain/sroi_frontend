import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

import AuthLayout from "@/layouts/AuthLayout.vue";
import MainLayout from "@/layouts/MainLayout.vue";
import LoginPage from "@/modules/auth/pages/LoginPage.vue";
import DashboardPage from "@/modules/dashboard/pages/DashboardPage.vue";
import FormBuilderPage from "@/modules/forms/pages/FormBuilderPage.vue";
import FormResponsesPage from "@/modules/forms/pages/FormResponsesPage.vue";
import PublicFormPage from "@/modules/forms/pages/PublicFormPage.vue";
import { registerRouterGuards } from "@/app/router/guards";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: { name: "dashboard" }
  },
  {
    path: "/forms/new",
    name: "form-builder-new",
    component: FormBuilderPage,
    meta: { requiresAuth: true }
  },
  {
    path: "/forms/:formId/edit",
    name: "form-builder-edit",
    component: FormBuilderPage,
    meta: { requiresAuth: true }
  },
  {
    path: "/forms/:formId/responses",
    name: "form-responses",
    component: FormResponsesPage,
    meta: { requiresAuth: true }
  },
  {
    path: "/forms/:publicToken",
    name: "public-form",
    component: PublicFormPage
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
    path: "/forms",
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
