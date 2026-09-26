<script setup lang="ts">
import { ref } from "vue";

import { searchUsers } from "@/modules/admin/api/admin.api";
import { ADD_ALLOWED_ROLES, toAdminErrorMessage } from "@/modules/admin/constants";
import type { AdminUser, ManagedRole, RoleAction, UserRole } from "@/modules/admin/types/admin.types";
import { ROLE_LABELS } from "@/modules/profile/constants";
import MemberTable from "@/modules/workspace/components/MemberTable.vue";
import BaseModal from "@/shared/components/BaseModal.vue";

const props = defineProps<{
  role: ManagedRole;
  action: RoleAction;
  roleOf: Map<string, UserRole>;
  currentUserId?: string;
  feedback: { text: string; error: boolean } | null;
}>();

const emit = defineEmits<{ close: []; select: [user: AdminUser] }>();

const roleName = ROLE_LABELS[props.role];
const actionLabel = props.action === "add" ? "新增" : "刪除";

const keyword = ref("");
const results = ref<AdminUser[]>([]);
const searching = ref(false);
const searched = ref(false);
const searchError = ref("");

const handleSearch = async (): Promise<void> => {
  const search = keyword.value.trim();
  if (!search) return;

  searching.value = true;
  searchError.value = "";

  try {
    const { users } = await searchUsers(search);
    results.value = users;
    searched.value = true;
  } catch (err) {
    searchError.value = toAdminErrorMessage(err);
  } finally {
    searching.value = false;
  }
};

// 搜尋結果沒有角色，用所有使用者清單對照
const statusOf = (user: AdminUser): { actionable: boolean; note: string } => {
  const role = props.roleOf.get(user.user_id);
  const roleLabel = role ? ROLE_LABELS[role] : "";

  if (props.action === "add") {
    if (role === props.role) return { actionable: false, note: `已是${roleName}` };
    return { actionable: !!role && ADD_ALLOWED_ROLES[props.role].includes(role), note: roleLabel };
  }

  if (role !== props.role) return { actionable: false, note: `非${roleName}` };
  if (user.user_id === props.currentUserId) return { actionable: false, note: "無法移除自己" };
  return { actionable: true, note: roleLabel };
};
</script>

<template>
  <BaseModal :open="true">
    <div class="manage" role="dialog" aria-modal="true" :aria-label="`${actionLabel}${roleName}`">
      <div class="manage__header">
        <h2>{{ actionLabel }}{{ roleName }}</h2>
        <button class="manage__close" type="button" aria-label="關閉" @click="emit('close')">✕</button>
      </div>

      <form class="search-form" @submit.prevent="handleSearch">
        <input v-model="keyword" type="search" placeholder="輸入姓名或學號" aria-label="搜尋使用者" />
        <button class="button button--primary" type="submit" :disabled="searching || !keyword.trim()">
          {{ searching ? "搜尋中..." : "搜尋" }}
        </button>
      </form>

      <p v-if="searchError" class="manage__message manage__message--error" role="alert">{{ searchError }}</p>
      <p
        v-if="feedback"
        class="manage__message"
        :class="{ 'manage__message--error': feedback.error }"
        role="status"
      >
        {{ feedback.text }}
      </p>

      <div v-if="searched" class="manage__results">
        <MemberTable :users="results" empty-text="找不到符合的使用者">
          <template #action="{ user }">
            <span class="muted">{{ statusOf(user).note }}</span>
            <button
              v-if="statusOf(user).actionable"
              class="button"
              :class="{ 'button--danger': action === 'remove' }"
              type="button"
              @click="emit('select', user)"
            >
              {{ actionLabel }}
            </button>
          </template>
        </MemberTable>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.manage {
  display: grid;
  gap: 18px;
  width: min(560px, calc(100vw - 72px));
}

.manage__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.manage__close {
  border: 0;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
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

.manage__results {
  max-height: 50vh;
  overflow-y: auto;
}

.manage__message {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.manage__message--error {
  color: #c00;
  font-weight: 400;
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
