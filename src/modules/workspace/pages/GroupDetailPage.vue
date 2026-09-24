<script setup lang="ts">
import { ref, watch } from "vue";

import { getGroupInfo, getGroupRole } from "@/modules/workspace/api/workspace.api";
import GroupDetail from "@/modules/workspace/components/GroupDetail.vue";
import type { GroupInfo, GroupRole } from "@/modules/workspace/types/workspace.types";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

const props = defineProps<{ groupId: string }>();

const GROUP_INFO_ERROR_MESSAGES: Record<string, string> = {
  "10013": "找不到群組，或群組尚未通過審核",
  "10001": "你不是此群組的成員"
};

const group = ref<GroupInfo | null>(null);
const role = ref<GroupRole | null>(null);
const loading = ref(false);
const error = ref("");

const loadGroup = async (groupId: string): Promise<void> => {
  loading.value = true;
  error.value = "";
  group.value = null;
  role.value = null;

  try {
    // 先確認使用者在此群組的權限，沒有權限就不載入群組資料
    const { group_role } = await getGroupRole(groupId);
    const info = await getGroupInfo(groupId);

    // 快速切換群組時，丟棄舊請求的結果
    if (groupId !== props.groupId) return;

    role.value = group_role;
    group.value = info;
  } catch (err) {
    if (groupId !== props.groupId) return;

    if (err instanceof ApiError && err.statusCode && GROUP_INFO_ERROR_MESSAGES[err.statusCode]) {
      error.value = GROUP_INFO_ERROR_MESSAGES[err.statusCode];
    } else {
      error.value = toErrorMessage(err);
    }
  } finally {
    if (groupId === props.groupId) loading.value = false;
  }
};

watch(() => props.groupId, loadGroup, { immediate: true });
</script>

<template>
  <section class="group-page">
    <div class="group-page__bar">
      <RouterLink class="back-link" to="/workspace/groups" aria-label="返回我的群組">
        <span aria-hidden="true">←</span> 返回
      </RouterLink>

      <RouterLink
        v-if="role === 'leader'"
        class="settings-link"
        :to="{ name: 'group-settings', params: { groupId } }"
      >
        <span aria-hidden="true">⚙</span> 設定
      </RouterLink>
    </div>

    <p v-if="loading">載入中...</p>
    <p v-else-if="error" class="group-page__error">{{ error }}</p>
    <GroupDetail v-else-if="group" :group="group" />
  </section>
</template>

<style scoped>
.group-page {
  display: grid;
  gap: 22px;
  margin-top: -16px;
}

.group-page__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.back-link {
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

.settings-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 14px;
  border: 1px solid #000;
  background: #000;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.settings-link:hover {
  background: #fff;
  color: #000;
}

.group-page__error {
  margin: 0;
  color: #c00;
}
</style>
