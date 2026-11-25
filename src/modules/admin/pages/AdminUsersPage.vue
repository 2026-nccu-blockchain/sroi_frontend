<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import {
  cancelExternalInvitation,
  getAllUsers,
  getExternalInvitations,
  resendExternalInvitation,
  suspendUser,
  updateUserRole
} from "@/modules/admin/api/admin.api";
import InviteExternalDialog from "@/modules/admin/components/InviteExternalDialog.vue";
import RoleManageDialog from "@/modules/admin/components/RoleManageDialog.vue";
import { TAB_LABELS, toAdminErrorMessage } from "@/modules/admin/constants";
import type {
  AdminUser,
  ExternalInvitation,
  ManagedRole,
  RoleAction,
  UserListField,
  UserListTab,
  UserRole,
  UserTab
} from "@/modules/admin/types/admin.types";
import { ROLE_LABELS } from "@/modules/profile/constants";
import ConfirmDialog from "@/modules/workspace/components/ConfirmDialog.vue";
import MemberTable from "@/modules/workspace/components/MemberTable.vue";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog.vue";
import { formatTaipeiDate } from "@/shared/utils/date";

const ROLE_TABS: { key: UserRole; field: UserListField }[] = [
  { key: "admin", field: "admin" },
  { key: "db_editor", field: "db_editor" },
  { key: "normal", field: "normal_user" }
];

// 在學驗證待審的使用者同時也在原本的角色清單裡
const TABS: { key: UserListTab; field: UserListField }[] = [
  ...ROLE_TABS,
  { key: "enrollment", field: "enrollment_pending_user" }
];
// 邀請中（校外人士還沒完成設定密碼）放在一般使用者旁邊
const TAB_KEYS: UserTab[] = ["admin", "db_editor", "normal", "invitations", "enrollment"];

// 需要管理員處理的分頁，有待審項目時標示出來
const REVIEW_TABS: UserTab[] = ["enrollment"];

const MANAGED_ROLES: UserTab[] = ["admin", "db_editor"];

const emptyLists = (): Record<UserListTab, AdminUser[]> => ({
  admin: [],
  db_editor: [],
  normal: [],
  enrollment: []
});

const isUserTab = (value: unknown): value is UserTab => TAB_KEYS.includes(value as UserTab);

const authStore = useAuthStore();
const currentUserId = computed(() => authStore.user?.user_id);

const route = useRoute();
const router = useRouter();

const usersByRole = ref<Record<UserListTab, AdminUser[]>>(emptyLists());
const invitations = ref<ExternalInvitation[]>([]);
const countOf = (key: UserTab): number => (key === "invitations" ? invitations.value.length : usersByRole.value[key].length);
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
    // 校外帳號沒有學號，在學號的位置顯示所屬單位
    lists[key] = response[field].map((user) => ({
      ...user,
      campus_id: user.account_type === "external" ? `校外・${user.organization ?? ""}` : user.campus_id ?? ""
    }));
  }
  usersByRole.value = lists;
};

const loadInvitations = async (): Promise<void> => {
  invitations.value = (await getExternalInvitations()).invitations;
};

onMounted(async () => {
  loading.value = true;
  pageError.value = "";

  try {
    await Promise.all([loadUsers(), loadInvitations()]);
  } catch (err) {
    pageError.value = toAdminErrorMessage(err);
  } finally {
    loading.value = false;
  }
});

// 新增校外使用者（邀請）
const inviting = ref(false);
const inviteMessage = ref<{ text: string; error: boolean } | null>(null);

const handleInvited = async (email: string): Promise<void> => {
  inviting.value = false;
  inviteMessage.value = {
    text: `已寄出邀請信到 ${email}，對方 7 天內點連結設定密碼後帳號才會建立。邀請信可能被歸到垃圾信件匣，建議另外提醒對方。`,
    error: false
  };
  activeTab.value = "invitations";
  await loadInvitations().catch(() => undefined);
};

// 邀請中：重寄（舊連結失效、重新算 7 天）、取消
const invitationBusy = ref<string | null>(null);
const cancelling = ref<ExternalInvitation | null>(null);

const resendInvitation = async (invitation: ExternalInvitation): Promise<void> => {
  invitationBusy.value = invitation.invitation_id;
  inviteMessage.value = null;
  try {
    await resendExternalInvitation(invitation.invitation_id);
    await loadInvitations();
    inviteMessage.value = { text: `已重新寄送邀請信到 ${invitation.email}，舊的連結已失效。`, error: false };
  } catch (err) {
    inviteMessage.value = { text: toAdminErrorMessage(err), error: true };
  } finally {
    invitationBusy.value = null;
  }
};

const confirmCancelInvitation = async (): Promise<void> => {
  const invitation = cancelling.value;
  if (!invitation) return;
  invitationBusy.value = invitation.invitation_id;
  inviteMessage.value = null;
  try {
    await cancelExternalInvitation(invitation.invitation_id);
    await loadInvitations();
    inviteMessage.value = { text: `已取消 ${invitation.email} 的邀請，信中的連結已失效。`, error: false };
  } catch (err) {
    inviteMessage.value = { text: toAdminErrorMessage(err), error: true };
  } finally {
    invitationBusy.value = null;
    cancelling.value = null;
  }
};

// 點姓名進詳細頁
const detailLink = (user: AdminUser) => ({ name: "admin-user-detail", params: { userId: user.user_id } });

// 新增 / 移除角色、停權共用同一個搜尋視窗
type ManageMode = { kind: "role"; role: ManagedRole; action: RoleAction } | { kind: "suspend" };
const manage = ref<ManageMode | null>(null);
const feedback = ref<{ text: string; error: boolean } | null>(null);

const openManage = (action: RoleAction): void => {
  if (!managedRole.value) return;
  manage.value = { kind: "role", role: managedRole.value, action };
  feedback.value = null;
};

// 停權只在一般使用者分頁；管理員、資料庫編輯者要先移除權限
const openSuspend = (): void => {
  manage.value = { kind: "suspend" };
  feedback.value = null;
};

// 確認視窗
const pending = ref<AdminUser | null>(null);
const confirming = ref(false);

const confirmDialog = computed(() => {
  if (!manage.value || !pending.value) return { title: "", message: "", confirmText: "" };

  // 非學生沒有學號
  const who = pending.value.campus_id ? `${pending.value.name}（${pending.value.campus_id}）` : pending.value.name;

  if (manage.value.kind === "suspend") {
    return {
      title: "停權使用者",
      message: `確定要停權 ${who} 嗎？停權後此帳號無法登入、會退出所有群組，且不能再用相同的學號（email）重新註冊。`,
      confirmText: "停權"
    };
  }

  const roleName = ROLE_LABELS[manage.value.role];
  return manage.value.action === "add"
    ? { title: `新增${roleName}`, message: `確定要將 ${who} 設為${roleName}嗎？`, confirmText: "新增" }
    : {
        title: `移除${roleName}`,
        message: `確定要移除 ${who} 的${roleName}權限嗎？移除後會變回一般使用者。`,
        confirmText: "移除"
      };
});

// 新增角色用一般確認窗；移除角色、停權用紅色警示窗
const isDangerAction = computed(
  () => manage.value?.kind === "suspend" || (manage.value?.kind === "role" && manage.value.action === "remove")
);

const handleConfirm = async (): Promise<void> => {
  if (!manage.value || !pending.value) return;

  const mode = manage.value;
  const user = pending.value;
  confirming.value = true;
  feedback.value = null;

  try {
    if (mode.kind === "suspend") {
      await suspendUser(user.user_id);
      await loadUsers();
      feedback.value = { text: `已停權 ${user.name}`, error: false };
    } else {
      const roleName = ROLE_LABELS[mode.role];
      await updateUserRole(mode.role, mode.action, user.user_id);
      await loadUsers();
      feedback.value = {
        text: mode.action === "add" ? `已將 ${user.name} 設為${roleName}` : `已移除 ${user.name} 的${roleName}權限`,
        error: false
      };
    }
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
        <button class="button button--danger" type="button" @click="openManage('remove')">移除</button>
      </div>
      <div v-else-if="activeTab === 'normal' || activeTab === 'invitations'" class="admin-users__actions">
        <button class="button button--primary" type="button" @click="inviting = true; inviteMessage = null">新增使用者</button>
        <button v-if="activeTab === 'normal'" class="button button--danger" type="button" @click="openSuspend">停權</button>
      </div>
    </div>

    <p v-if="loading">載入中...</p>
    <p v-else-if="pageError" class="admin-users__error">{{ pageError }}</p>

    <template v-else>
      <div class="tab-bar" role="tablist">
        <button
          v-for="key in TAB_KEYS"
          :key="key"
          type="button"
          class="tab-bar__item"
          :class="{
            'tab-bar__item--active': activeTab === key,
            'tab-bar__item--alert': REVIEW_TABS.includes(key) && countOf(key) > 0
          }"
          role="tab"
          :aria-selected="activeTab === key"
          @click="activeTab = key"
        >
          {{ TAB_LABELS[key] }}（{{ countOf(key) }}）
        </button>
      </div>

      <p
        v-if="inviteMessage && (activeTab === 'normal' || activeTab === 'invitations')"
        class="admin-users__message"
        :class="{ 'admin-users__message--error': inviteMessage.error }"
        role="status"
      >
        {{ inviteMessage.text }}
      </p>

      <!-- 邀請中：校外人士還沒完成設定密碼 -->
      <div v-if="activeTab === 'invitations'" class="invitations">
        <article v-for="invitation in invitations" :key="invitation.invitation_id" class="invitation">
          <div class="invitation__info">
            <span class="invitation__email">{{ invitation.email }}</span>
            <span class="muted">
              {{ invitation.organization }}・{{ invitation.valid_years }} 年・
              <template v-if="invitation.status === 'link_expired'"><strong class="invitation__expired">連結已過期</strong></template>
              <template v-else>連結 {{ formatTaipeiDate(invitation.expires_at) }} 到期</template>
            </span>
          </div>
          <div class="invitation__actions">
            <button
              class="button"
              type="button"
              :disabled="invitationBusy === invitation.invitation_id"
              @click="resendInvitation(invitation)"
            >
              {{ invitationBusy === invitation.invitation_id ? "處理中..." : "重寄" }}
            </button>
            <button
              class="button button--danger"
              type="button"
              :disabled="invitationBusy === invitation.invitation_id"
              @click="cancelling = invitation"
            >
              取消
            </button>
          </div>
        </article>
        <p v-if="invitations.length === 0" class="muted">目前沒有邀請中的校外使用者。</p>
      </div>

      <!-- 點姓名進詳細頁 -->
      <MemberTable
        v-else
        :key="activeTab"
        :users="usersByRole[activeTab as UserListTab]"
        searchable
        empty-text="沒有符合的使用者"
        :link-to="detailLink"
      >
        <template #action="{ user }">
          <span v-if="user.submitted_at" class="muted">{{ formatTaipeiDate(user.submitted_at) }} 上傳</span>
        </template>
      </MemberTable>
    </template>

    <InviteExternalDialog v-if="inviting" @close="inviting = false" @invited="handleInvited" />
    <DeleteConfirmDialog
      :open="cancelling !== null"
      title="取消邀請"
      :message="`確定要取消 ${cancelling?.email ?? ''} 的邀請嗎？信中的連結會立即失效。`"
      confirm-text="取消邀請"
      :loading="invitationBusy !== null"
      @confirm="confirmCancelInvitation"
      @cancel="cancelling = null"
    />

    <RoleManageDialog
      v-if="manage"
      :mode="manage"
      :role-of="roleOf"
      :current-user-id="currentUserId"
      :feedback="feedback"
      @select="pending = $event"
      @close="manage = null"
    />

    <!-- 放在搜尋視窗後面，才會疊在上層 -->
    <!-- 新增權限用一般確認窗，移除權限、停權用紅色警示窗 -->
    <ConfirmDialog
      :open="pending !== null && !isDangerAction"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :loading="confirming"
      @confirm="handleConfirm"
      @cancel="pending = null"
    />
    <DeleteConfirmDialog
      :open="pending !== null && isDangerAction"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :loading="confirming"
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
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

h1 {
  margin: 0;
  font-size: 24px;
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
  font-size: 14px;
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



.admin-users__message {
  margin: 0;
  padding: 12px 16px;
  border: 1px solid #87aa8c;
  background: #f4faf5;
  color: #286133;
  font-size: 14px;
  line-height: 1.6;
}

.admin-users__message--error {
  border-color: #bd7676;
  background: #fdf4f4;
  color: #8c2020;
}

.invitations {
  border-top: 2px solid #000;
}

.invitation {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  min-height: 64px;
  padding: 10px 0;
  border-bottom: 1px solid #000;
}

.invitation__info {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.invitation__email {
  font-size: 15px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.invitation__expired {
  color: #c00;
}

.invitation__actions {
  display: flex;
  gap: 8px;
}

.muted {
  color: #777;
  font-size: 14px;
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
  font-size: 14px;
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
