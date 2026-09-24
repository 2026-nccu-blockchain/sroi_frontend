import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

import AuthLayout from "@/layouts/AuthLayout.vue";
import MainLayout from "@/layouts/MainLayout.vue";
import LoginPage from "@/modules/auth/pages/LoginPage.vue";
import RegisterPage from "@/modules/auth/pages/RegisterPage.vue";
import DashboardPage from "@/modules/dashboard/pages/DashboardPage.vue";
import FormLayout from "@/layouts/FormLayout.vue";
import FormDashboardPage from "@/modules/formdashboard/pages/FormDashboardPage.vue";
import FormBuilderPage from "@/modules/forms/pages/FormBuilderPage.vue";
import FormResponsesPage from "@/modules/forms/pages/FormResponsesPage.vue";
import PublicFormPage from "@/modules/forms/pages/PublicFormPage.vue";
import ProfilePage from "@/modules/profile/pages/ProfilePage.vue";
import ProfileEditPage from "@/modules/profile/pages/ProfileEditPage.vue";
import CampusIdRequestPage from "@/modules/profile/pages/CampusIdRequestPage.vue";
import ProxyVariablesPage from "@/modules/proxy-variables/pages/ProxyVariablesPage.vue";
import MyGroupsPage from "@/modules/workspace/pages/MyGroupsPage.vue";
import NewGroupPage from "@/modules/workspace/pages/NewGroupPage.vue";
import GroupDetailPage from "@/modules/workspace/pages/GroupDetailPage.vue";
import GroupSettingsPage from "@/modules/workspace/pages/GroupSettingsPage.vue";
import MyProjectsPage from "@/modules/workspace/pages/MyProjectsPage.vue";
import { registerRouterGuards } from "@/app/router/guards";
import AdminUserDetailPage from "@/modules/admin/pages/AdminUserDetailPage.vue";
import AdminUsersPage from "@/modules/admin/pages/AdminUsersPage.vue";
import { ADMIN_ROLES, WORKSPACE_ROLES } from "@/modules/auth/constants";
import { VERIFY_ROLES } from "@/modules/profile/constants";

const routes: RouteRecordRaw[] = [
  {
    path: "/forms",
    component: FormLayout,
    children: [
      {
        path: "",
        name: "form-dashboard",
        component: FormDashboardPage
      },
      {
        path: "new",
        name: "form-builder-new",
        component: FormBuilderPage,
        meta: { requiresAuth: true }
      },
      {
        path: ":formId/edit",
        name: "form-builder-edit",
        component: FormBuilderPage,
        meta: { requiresAuth: true }
      },
      {
        path: ":formId/responses",
        name: "form-responses",
        component: FormResponsesPage,
        meta: { requiresAuth: true }
      },
      {
        path: ":publicToken",
        name: "public-form",
        component: PublicFormPage
      },
      {
        path: ":formId/responses",
        name: "form-responses",
        component: FormResponsesPage,
        meta: { requiresAuth: true }
      },
      {
        path: ":publicToken",
        name: "public-form",
        component: PublicFormPage
      },
    ]
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
        meta: { requiresAuth: true, roles: WORKSPACE_ROLES }
      },
      {
        path: "workspace/groups",
        name: "my-groups",
        component: MyGroupsPage,
        meta: { requiresAuth: true, roles: WORKSPACE_ROLES }
      },
      {
        path: "workspace/groups/new",
        name: "new-group",
        component: NewGroupPage,
        meta: { requiresAuth: true, roles: WORKSPACE_ROLES }
      },
      {
        path: "workspace/groups/:groupId",
        name: "group-detail",
        component: GroupDetailPage,
        props: true,
        meta: { requiresAuth: true, roles: WORKSPACE_ROLES }
      },
      {
        path: "workspace/groups/:groupId/settings",
        name: "group-settings",
        component: GroupSettingsPage,
        props: true,
        meta: { requiresAuth: true, roles: WORKSPACE_ROLES }
      },
      {
        path: "profile",
        name: "profile",
        component: ProfilePage,
        meta: { requiresAuth: true }
      },
      {
        path: "profile/edit",
        name: "profile-edit",
        component: ProfileEditPage,
        meta: { requiresAuth: true }
      },
      {
        path: "profile/verify",
        name: "profile-verify",
        component: CampusIdRequestPage,
        props: { mode: "verify" },
        meta: { requiresAuth: true, roles: VERIFY_ROLES }
      },
      {
        path: "profile/campus-id",
        name: "profile-campus-id",
        component: CampusIdRequestPage,
        props: { mode: "change" },
        meta: { requiresAuth: true, roles: WORKSPACE_ROLES }
      },
      {
        path: "admin/users",
        name: "admin-users",
        component: AdminUsersPage,
        meta: { requiresAuth: true, roles: ADMIN_ROLES }
      },
      {
        path: "admin/users/:userId",
        name: "admin-user-detail",
        component: AdminUserDetailPage,
        meta: { requiresAuth: true, roles: ADMIN_ROLES }
      },
      {
        path: "proxy-variables",
        name: "proxy-variables",
        component: ProxyVariablesPage
      }
    ]
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

registerRouterGuards(router);
