<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import {
  changeMemberRole,
  deleteGroupMember,
  getGroupInfo,
  getGroupRole,
  inviteGroupMember,
  searchGroupUsers
} from "@/modules/workspace/api/workspace.api";
import ConfirmDialog from "@/modules/workspace/components/ConfirmDialog.vue";
import MemberTable from "@/modules/workspace/components/MemberTable.vue";
import type { GroupInfo, GroupMember, GroupRole, GroupUser } from "@/modules/workspace/types/workspace.types";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

const props = defineProps<{ groupId: string }>();

type TabKey = "role" | "add" | "remove";

const TABS: { key: TabKey; label: string }[] = [
  { key: "role", label: "成員權限" },
  { key: "add", label: "新增成員" },
  { key: "remove", label: "刪除成員" }
];

const ROLE_LABELS: Record<GroupRole, string> = {
  leader: "組長",
  member: "組員"
};

const GROUP_SETTINGS_ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者，或該使用者尚未通過驗證",
  "10008": "權限不足，只有組長可以進入群組設定",
  "10013": "找不到群組，或群組尚未通過審核",
  "10014": "該使用者已經是群組成員",
  "10015": "無法更改自己的權限",
  "10016": "群組至少需要一位組長",
  "10017": "權限沒有變更"
};

const toMessage = (err: unknown): string =>
  err instanceof ApiError && err.statusCode && GROUP_SETTINGS_ERROR_MESSAGES[err.statusCode]
    ? GROUP_SETTINGS_ERROR_MESSAGES[err.statusCode]
    : toErrorMessage(err);

const authStore = useAuthStore();
const currentUserId = computed(() => authStore.user?.user_id);

const group = ref<GroupInfo | null>(null);
const loading = ref(false);
const pageError = ref("");
const actionError = ref("");
const activeTab = ref<TabKey>("role");

const members = computed<GroupMember[]>(() => {
  if (!group.value) return [];

  return [
    ...group.value.group_leaders.map((user) => ({ ...user, role: "leader" as const })),
    ...group.value.group_members.map((user) => ({ ...user, role: "member" as const }))
  ];
});

const memberIds = computed(() => new Set(members.value.map((member) => member.user_id)));

const refreshGroup = async (): Promise<void> => {
  group.value = await getGroupInfo(props.groupId);
};

const loadPage = async (groupId: string): Promise<void> => {
  loading.value = true;
  pageError.value = "";
  group.value = null;

  try {
    // 先確認是組長才載入設定頁資料
    const { group_role } = await getGroupRole(groupId);
    if (group_role !== "leader") throw new ApiError("permission denied", "10008");

    const info = await getGroupInfo(groupId);
    if (groupId !== props.groupId) return;

    group.value = info;
  } catch (err) {
    if (groupId !== props.groupId) return;
    pageError.value = toMessage(err);
  } finally {
    if (groupId === props.groupId) loading.value = false;
  }
};

watch(() => props.groupId, loadPage, { immediate: true });

const selectTab = (key: TabKey): void => {
  activeTab.value = key;
  actionError.value = "";
};

// 成員權限
const updatingId = ref<string | null>(null);

const handleRoleChange = async (member: GroupMember, event: Event): Promise<void> => {
  const select = event.target as HTMLSelectElement;
  const role = select.value as GroupRole;
  if (role === member.role) return;

  updatingId.value = member.user_id;
  actionError.value = "";

  try {
    await changeMemberRole(props.groupId, { user_id: member.user_id, is_leader: role === "leader" });
    await refreshGroup();
  } catch (err) {
    select.value = member.role;
    actionError.value = toMessage(err);
  } finally {
    updatingId.value = null;
  }
};

// 新增成員
const keyword = ref("");
const searchResults = ref<GroupUser[]>([]);
const searching = ref(false);
const searched = ref(false);

const handleSearch = async (): Promise<void> => {
  const search = keyword.value.trim();
  if (!search) return;

  searching.value = true;
  actionError.value = "";

  try {
    const { users } = await searchGroupUsers(props.groupId, search);
    searchResults.value = users;
    searched.value = true;
  } catch (err) {
    actionError.value = toMessage(err);
  } finally {
    searching.value = false;
  }
};

// 加入 / 刪除確認視窗
const pending = ref<{ type: "add" | "remove"; user: GroupUser } | null>(null);
const confirming = ref(false);

const confirmDialog = computed(() => {
  if (!pending.value) return { title: "", message: "", confirmText: "" };

  const { type, user } = pending.value;
  const who = `${user.name}（${user.campus_id}）`;

  return type === "add"
    ? { title: "加入成員", message: `確定要將 ${who} 加入群組嗎？`, confirmText: "加入" }
    : { title: "刪除成員", message: `確定要將 ${who} 移出群組嗎？`, confirmText: "刪除" };
});

const handleConfirm = async (): Promise<void> => {
  if (!pending.value) return;

  const { type, user } = pending.value;
  confirming.value = true;
  actionError.value = "";

  try {
    if (type === "add") {
      await inviteGroupMember(props.groupId, { user_id: user.user_id });
    } else {
      await deleteGroupMember(props.groupId, user.user_id);
    }
    await refreshGroup();
  } catch (err) {
    actionError.value = toMessage(err);
  } finally {
    confirming.value = false;
    pending.value = null;
  }
};
</script>

<template>
  <section class="settings-page">
    <RouterLink class="back-link" :to="{ name: 'group-detail', params: { groupId } }" aria-label="返回群組">
      <span aria-hidden="true">←</span> 返回
    </RouterLink>

    <p v-if="loading">載入中...</p>
    <p v-else-if="pageError" class="settings-page__error">{{ pageError }}</p>

    <template v-else-if="group">
      <div>
        <p class="settings-page__eyebrow">{{ group.title }}</p>
        <h1>群組設定</h1>
      </div>

      <div class="tab-bar" role="tablist">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          type="button"
          class="tab-bar__item"
          :class="{ 'tab-bar__item--active': activeTab === tab.key }"
          role="tab"
          :aria-selected="activeTab === tab.key"
          @click="selectTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <p v-if="actionError" class="settings-page__error" role="alert">{{ actionError }}</p>

      <MemberTable v-if="activeTab === 'role'" :users="members" searchable>
        <template #action="{ user }">
          <select
            class="role-select"
            :value="user.role"
            :disabled="user.user_id === currentUserId || updatingId === user.user_id"
            :aria-label="`${user.name} 的權限`"
            @change="handleRoleChange(user, $event)"
          >
            <option value="leader">組長</option>
            <option value="member">組員</option>
          </select>
        </template>
      </MemberTable>

      <div v-else-if="activeTab === 'add'" class="add-panel">
        <form class="search-form" @submit.prevent="handleSearch">
          <input v-model="keyword" type="search" placeholder="輸入姓名或學號" aria-label="搜尋使用者" />
          <button class="button button--primary" type="submit" :disabled="searching || !keyword.trim()">
            {{ searching ? "搜尋中..." : "搜尋" }}
          </button>
        </form>

        <MemberTable v-if="searched" :users="searchResults" empty-text="找不到符合的使用者">
          <template #action="{ user }">
            <span v-if="memberIds.has(user.user_id)" class="muted">已在群組</span>
            <button v-else class="button" type="button" @click="pending = { type: 'add', user }">加入</button>
          </template>
        </MemberTable>
      </div>

      <MemberTable v-else :users="members" searchable>
        <template #action="{ user }">
          <span class="muted">{{ ROLE_LABELS[user.role] }}</span>
          <button
            class="button button--danger"
            type="button"
            :disabled="user.user_id === currentUserId"
            @click="pending = { type: 'remove', user }"
          >
            刪除
          </button>
        </template>
      </MemberTable>
    </template>

    <ConfirmDialog
      :open="pending !== null"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :loading="confirming"
      :danger="pending?.type === 'remove'"
      @confirm="handleConfirm"
      @cancel="pending = null"
    />
  </section>
</template>

<style scoped>
.settings-page {
  display: grid;
  gap: 22px;
  margin-top: -16px;
}

.back-link {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #000;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.back-link span {
  font-size: 22px;
  line-height: 1;
}

.back-link:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.settings-page__eyebrow {
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

.settings-page__error {
  margin: 0;
  color: #c00;
}

.tab-bar {
  display: flex;
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

.add-panel {
  display: grid;
  gap: 22px;
}

.search-form {
  display: flex;
  gap: 12px;
}

.search-form input {
  flex: 1;
  min-width: 0;
  border: 1px solid #000;
  padding: 10px 14px;
  font: inherit;
  font-size: 15px;
  outline: none;
}

.search-form input:focus {
  box-shadow: inset 0 0 0 1px #000;
}

.role-select {
  min-width: 96px;
  border: 1px solid #000;
  padding: 8px 10px;
  background: #fff;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.role-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.button--primary:hover:not(:disabled) {
  background: #fff;
  color: #000;
}

.button--danger {
  border-color: #c00;
  color: #c00;
}

.button--danger:hover:not(:disabled) {
  background: #c00;
  color: #fff;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.muted {
  color: #777;
  font-size: 12px;
}
</style>
