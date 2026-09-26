<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import { getAllUsers, updateUserRole } from "@/modules/admin/api/admin.api";
import RoleManageDialog from "@/modules/admin/components/RoleManageDialog.vue";
import { TAB_LABELS, toAdminErrorMessage } from "@/modules/admin/constants";
import type {
  AdminUser,
  ManagedRole,
  RoleAction,
  UserListField,
  UserRole,
  UserTab
} from "@/modules/admin/types/admin.types";
import { ROLE_LABELS } from "@/modules/profile/constants";
import ConfirmDialog from "@/modules/workspace/components/ConfirmDialog.vue";
import MemberTable from "@/modules/workspace/components/MemberTable.vue";

const ROLE_TABS: { key: UserRole; field: UserListField }[] = [
  { key: "admin", field: "admin" },
  { key: "db_editor", field: "db_editor" },
  { key: "verified", field: "verified_user" },
  { key: "in_progress", field: "in_progress_user" },
  { key: "unverified", field: "unverified_user" }
];

// 學號變更申請的使用者同時也在原本的角色清單裡
const TABS: { key: UserTab; field: UserListField }[] = [
  ...ROLE_TABS,
  { key: "change_request", field: "change_request_user" }
];

// 需要管理員處理的分頁，有待審項目時標示出來
const REVIEW_TABS: UserTab[] = ["in_progress", "change_request"];

const MANAGED_ROLES: UserTab[] = ["admin", "db_editor"];

const emptyLists = (): Record<UserTab, AdminUser[]> => ({
  admin: [],
  db_editor: [],
  verified: [],
  in_progress: [],
  unverified: [],
  change_request: []
});

const isUserTab = (value: unknown): value is UserTab => TABS.some((tab) => tab.key === value);

const authStore = useAuthStore();
const currentUserId = computed(() => authStore.user?.user_id);

const route = useRoute();
const router = useRouter();

const usersByRole = ref<Record<UserTab, AdminUser[]>>(emptyLists());
const loading = ref(false);
const pageError = ref("");

// 分頁記在 query，從詳細頁返回時會停在原本的分頁
const activeTab = ref<UserTab>(isUserTab(route.query.tab) ? route.query.tab : "admin");
watch(activeTab, (tab) => router.replace({ query: { ...route.query, tab } }));

const managedRole = computed<ManagedRole | null>(() =>
  MANAGED_ROLES.includes(activeTab.value) ? (activeTab.value as ManagedRole) : null
);

// 搜尋視窗用來判斷每位使用者目前的角色
const roleOf = computed(() => {
  const map = new Map<string, UserRole>();
  for (const { key } of ROLE_TABS) {
    for (const user of usersByRole.value[key]) map.set(user.user_id, key);
  }
  return map;
});

const loadUsers = async (): Promise<void> => {
  const response = await getAllUsers();
  const lists = emptyLists();
  for (const { key, field } of TABS) {
    lists[key] = response[field].map((user) => ({ ...user, campus_id: user.campus_id ?? "" }));
  }
  usersByRole.value = lists;
};

onMounted(async () => {
  loading.value = true;
  pageError.value = "";

  try {
    await loadUsers();
  } catch (err) {
    pageError.value = toAdminErrorMessage(err);
  } finally {
    loading.value = false;
  }
});

// 新增 / 刪除視窗
const manage = ref<{ role: ManagedRole; action: RoleAction } | null>(null);
const feedback = ref<{ text: string; error: boolean } | null>(null);

const openManage = (action: RoleAction): void => {
  if (!managedRole.value) return;
  manage.value = { role: managedRole.value, action };
  feedback.value = null;
};

// 確認視窗
const pending = ref<AdminUser | null>(null);
const confirming = ref(false);

const confirmDialog = computed(() => {
  if (!manage.value || !pending.value) return { title: "", message: "", confirmText: "" };

  const roleName = ROLE_LABELS[manage.value.role];
  const who = `${pending.value.name}（${pending.value.campus_id}）`;

  return manage.value.action === "add"
    ? { title: `新增${roleName}`, message: `確定要將 ${who} 設為${roleName}嗎？`, confirmText: "新增" }
    : {
        title: `刪除${roleName}`,
        message: `確定要移除 ${who} 的${roleName}權限嗎？移除後會變回已驗證使用者。`,
        confirmText: "刪除"
      };
});

const handleConfirm = async (): Promise<void> => {
  if (!manage.value || !pending.value) return;

  const { role, action } = manage.value;
  const user = pending.value;
  const roleName = ROLE_LABELS[role];
  confirming.value = true;
  feedback.value = null;

  try {
    await updateUserRole(role, action, user.user_id);
    await loadUsers();
    feedback.value = {
      text: action === "add" ? `已將 ${user.name} 設為${roleName}` : `已移除 ${user.name} 的${roleName}權限`,
      error: false
    };
  } catch (err) {
    feedback.value = { text: toAdminErrorMessage(err), error: true };
  } finally {
    confirming.value = false;
    pending.value = null;
  }
};
</script>

<template>
  <section class="admin-users">
    <div class="admin-users__header">
      <div>
        <p class="admin-users__eyebrow">管理</p>
        <h1>所有使用者</h1>
      </div>

      <div v-if="managedRole" class="admin-users__actions">
        <button class="button button--primary" type="button" @click="openManage('add')">新增</button>
        <button class="button button--danger" type="button" @click="openManage('remove')">刪除</button>
      </div>
    </div>

    <p v-if="loading">載入中...</p>
    <p v-else-if="pageError" class="admin-users__error">{{ pageError }}</p>

    <template v-else>
      <div class="tab-bar" role="tablist">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          type="button"
          class="tab-bar__item"
          :class="{
            'tab-bar__item--active': activeTab === tab.key,
            'tab-bar__item--alert': REVIEW_TABS.includes(tab.key) && usersByRole[tab.key].length > 0
          }"
          role="tab"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
        >
          {{ TAB_LABELS[tab.key] }}（{{ usersByRole[tab.key].length }}）
        </button>
      </div>

      <MemberTable :key="activeTab" :users="usersByRole[activeTab]" searchable empty-text="沒有符合的使用者">
        <template #action="{ user }">
          <span v-if="user.new_campus_id" class="muted">→ {{ user.new_campus_id }}</span>
          <RouterLink class="detail-link" :to="{ name: 'admin-user-detail', params: { userId: user.user_id } }">
            {{ REVIEW_TABS.includes(activeTab) ? "審核" : "查看" }} →
          </RouterLink>
        </template>
      </MemberTable>
    </template>

    <RoleManageDialog
      v-if="manage"
      :role="manage.role"
      :action="manage.action"
      :role-of="roleOf"
      :current-user-id="currentUserId"
      :feedback="feedback"
      @select="pending = $event"
      @close="manage = null"
    />

    <!-- 放在搜尋視窗後面，才會疊在上層 -->
    <ConfirmDialog
      :open="pending !== null"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :loading="confirming"
      :danger="manage?.action === 'remove'"
      @confirm="handleConfirm"
      @cancel="pending = null"
    />
  </section>
</template>

<style scoped>
.admin-users {
  display: grid;
  gap: 22px;
}

.admin-users__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.admin-users__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.04em;
}

.admin-users__actions {
  display: flex;
  gap: 8px;
}

.admin-users__error {
  margin: 0;
  color: #c00;
}

.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tab-bar__item {
  border: 1px solid #000;
  padding: 8px 16px;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.tab-bar__item--active {
  background: #000;
  color: #fff;
}

.tab-bar__item--alert {
  border-color: #c00;
  color: #c00;
}

.tab-bar__item--alert.tab-bar__item--active {
  background: #c00;
  color: #fff;
}

.detail-link {
  color: #000;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.detail-link:hover {
  text-decoration: underline;
}

.muted {
  color: #777;
  font-size: 12px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 16px;
  border: 1px solid #000;
  background: #fff;
  color: #000;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.button--primary {
  background: #000;
  color: #fff;
}

.button--primary:hover {
  background: #fff;
  color: #000;
}

.button--danger {
  border-color: #c00;
  color: #c00;
}

.button--danger:hover {
  background: #c00;
  color: #fff;
}
</style>
