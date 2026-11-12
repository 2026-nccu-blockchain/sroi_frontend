import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

import AuthLayout from "@/layouts/AuthLayout.vue";
import MainLayout from "@/layouts/MainLayout.vue";
import LoginPage from "@/modules/auth/pages/LoginPage.vue";
import RegisterPage from "@/modules/auth/pages/RegisterPage.vue";
import DashboardPage from "@/modules/dashboard/pages/DashboardPage.vue";
import FormLayout from "@/layouts/FormLayout.vue";
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
import ProjectEditPage from "@/modules/workspace/pages/ProjectEditPage.vue";
import ProjectSroiPage from "@/modules/workspace/pages/ProjectSroiPage.vue";
import { registerRouterGuards } from "@/app/router/guards";
import AdminGroupDetailPage from "@/modules/admin/pages/AdminGroupDetailPage.vue";
import AdminGroupsPage from "@/modules/admin/pages/AdminGroupsPage.vue";
import AdminUserDetailPage from "@/modules/admin/pages/AdminUserDetailPage.vue";
import AdminUsersPage from "@/modules/admin/pages/AdminUsersPage.vue";
import { ADMIN_ROLES, WORKSPACE_ROLES } from "@/modules/auth/constants";

const routes: RouteRecordRaw[] = [
  {
    path: "/workspace/projects/:projectId/form",
    component: FormLayout,
    meta: { roles: WORKSPACE_ROLES },
    children: [
      {
        path: "new",
        name: "form-builder-new",
        component: FormBuilderPage
      },
      {
        path: ":formId/edit",
        name: "form-builder-edit",
        component: FormBuilderPage
      },
      {
        path: ":formId/responses",
        name: "form-responses",
        component: FormResponsesPage
      }
    ]
  },
  {
    path: "/forms",
    redirect: { name: "my-projects" }
  },
  {
    path: "/forms/new",
    redirect: { name: "my-projects" }
  },
  {
    path: "/forms/:publicToken",
    name: "public-form",
    component: PublicFormPage,
    meta: { public: true }
  },
  {
    path: "/auth",
    component: AuthLayout,
    children: [
      {
        path: "login",
        name: "login",
        component: LoginPage,
        meta: { public: true }
      },
      {
        path: "register",
        name: "register",
        component: RegisterPage,
        meta: { public: true }
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
        meta: { roles: WORKSPACE_ROLES }
      },
      {
        path: "workspace/projects/new",
        name: "project-new",
        component: ProjectEditPage,
        meta: { roles: WORKSPACE_ROLES }
      },
      {
        path: "workspace/projects/:projectId/edit",
        name: "project-edit",
        component: ProjectEditPage,
        meta: { roles: WORKSPACE_ROLES }
      },
      {
        path: "workspace/projects/:projectId/stakeholders/:stakeholderId/sroi",
        name: "stakeholder-sroi",
        component: ProjectSroiPage,
        meta: { roles: WORKSPACE_ROLES }
      },
      {
        path: "workspace/groups",
        name: "my-groups",
        component: MyGroupsPage,
        meta: { roles: WORKSPACE_ROLES }
      },
      {
        path: "workspace/groups/new",
        name: "new-group",
        component: NewGroupPage,
        meta: { roles: WORKSPACE_ROLES }
      },
      {
        path: "workspace/groups/:groupId",
        name: "group-detail",
        component: GroupDetailPage,
        props: true,
        meta: { roles: WORKSPACE_ROLES }
      },
      {
        path: "workspace/groups/:groupId/settings",
        name: "group-settings",
        component: GroupSettingsPage,
        props: true,
        meta: { roles: WORKSPACE_ROLES }
      },
      {
        path: "profile",
        name: "profile",
        component: ProfilePage
      },
      {
        path: "profile/edit",
        name: "profile-edit",
        component: ProfileEditPage
      },
      {
        path: "profile/campus-id",
        name: "profile-campus-id",
        component: CampusIdRequestPage,
        meta: { roles: WORKSPACE_ROLES }
      },
      {
        path: "admin/users",
        name: "admin-users",
        component: AdminUsersPage,
        meta: { roles: ADMIN_ROLES }
      },
      {
        path: "admin/users/:userId",
        name: "admin-user-detail",
        component: AdminUserDetailPage,
        meta: { roles: ADMIN_ROLES }
      },
      {
        path: "admin/groups",
        name: "admin-groups",
        component: AdminGroupsPage,
        meta: { roles: ADMIN_ROLES }
      },
      {
        path: "admin/groups/:groupId",
        name: "admin-group-detail",
        component: AdminGroupDetailPage,
        props: true,
        meta: { roles: ADMIN_ROLES }
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
