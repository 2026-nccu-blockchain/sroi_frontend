import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

import AuthLayout from "@/layouts/AuthLayout.vue";
import MainLayout from "@/layouts/MainLayout.vue";
import LoginPage from "@/modules/auth/pages/LoginPage.vue";
import RegisterPage from "@/modules/auth/pages/RegisterPage.vue";
import DashboardPage from "@/modules/dashboard/pages/DashboardPage.vue";
import FormBuilderPage from "@/modules/forms/pages/FormBuilderPage.vue";
import ProxyVariablesPage from "@/modules/proxy-variables/pages/ProxyVariablesPage.vue";
import MyGroupsPage from "@/modules/workspace/pages/MyGroupsPage.vue";
import NewGroupPage from "@/modules/workspace/pages/NewGroupPage.vue";
import GroupDetailPage from "@/modules/workspace/pages/GroupDetailPage.vue";
import GroupSettingsPage from "@/modules/workspace/pages/GroupSettingsPage.vue";
import MyProjectsPage from "@/modules/workspace/pages/MyProjectsPage.vue";
import { registerRouterGuards } from "@/app/router/guards";

const routes: RouteRecordRaw[] = [
  {
    path: "/forms/new",
    name: "form-builder",
    component: FormBuilderPage,
    meta: { requiresAuth: true }
  },
  {
    path: "/auth",
    component: AuthLayout,
    children: [
      {
        path: "login",
        name: "login",
        component: LoginPage
      },
      {
        path: "register",
        name: "register",
        component: RegisterPage
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
      },
      {
        path: "workspace/projects",
        name: "my-projects",
        component: MyProjectsPage,
        meta: { requiresAuth: true }
      },
      {
        path: "workspace/groups",
        name: "my-groups",
        component: MyGroupsPage,
        meta: { requiresAuth: true }
      },
      {
        path: "workspace/groups/new",
        name: "new-group",
        component: NewGroupPage,
        meta: { requiresAuth: true }
      },
      {
        path: "workspace/groups/:groupId",
        name: "group-detail",
        component: GroupDetailPage,
        props: true,
        meta: { requiresAuth: true }
      },
      {
        path: "workspace/groups/:groupId/settings",
        name: "group-settings",
        component: GroupSettingsPage,
        props: true,
        meta: { requiresAuth: true }
      },
      {
        path: "proxy-variables",
        name: "proxy-variables",
        component: ProxyVariablesPage
      }
    ]
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

registerRouterGuards(router);
