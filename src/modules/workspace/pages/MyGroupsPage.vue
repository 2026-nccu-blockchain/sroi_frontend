<script setup lang="ts">
import { onMounted, ref } from "vue";

import { deleteGroup, getGroups } from "@/modules/workspace/api/workspace.api";
import ConfirmDialog from "@/modules/workspace/components/ConfirmDialog.vue";
import GroupList from "@/modules/workspace/components/GroupList.vue";
import { useGroupTab } from "@/modules/workspace/composables/useGroupTab";
import type { Group, GroupBucketKey, GroupBuckets } from "@/modules/workspace/types/workspace.types";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

const tab = useGroupTab();
const groups = ref<GroupBuckets>({ verified: [], inProgress: [], unverified: [] });
const loading = ref(false);
const error = ref("");
const GROUP_ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者",
  "10008": "權限不足",
  "10013": "找不到群組，可能已被刪除"
};

// 只有不同意的群組可以直接在列表刪除，已同意的要到群組設定刪
const DELETABLE_BUCKETS: GroupBucketKey[] = ["unverified"];

const toMessage = (err: unknown): string =>
  err instanceof ApiError && err.statusCode && GROUP_ERROR_MESSAGES[err.statusCode]
    ? GROUP_ERROR_MESSAGES[err.statusCode]
    : toErrorMessage(err);

onMounted(async () => {
  loading.value = true;
  error.value = "";

  try {
    const res = await getGroups();
    groups.value = {
      verified: res.verified_groups,
      inProgress: res.in_progress_groups,
      unverified: res.unverified_groups
    };
  } catch (err) {
    error.value = toMessage(err);
  } finally {
    loading.value = false;
  }
});

const linkTo = (group: Group) => ({ name: "group-detail", params: { groupId: group.group_id } });

// 刪除群組
const pendingDelete = ref<Group | null>(null);
const deleting = ref(false);
const deleteError = ref("");

const handleDelete = async (): Promise<void> => {
  if (!pendingDelete.value) return;

  const target = pendingDelete.value;
  deleting.value = true;
  deleteError.value = "";

  try {
    await deleteGroup(target.group_id);
    groups.value.unverified = groups.value.unverified.filter((group) => group.group_id !== target.group_id);
  } catch (err) {
    deleteError.value = toMessage(err);
  } finally {
    deleting.value = false;
    pendingDelete.value = null;
  }
};
</script>

<template>
  <p v-if="loading">載入中...</p>
  <p v-else-if="error">{{ error }}</p>
  <template v-else>
    <p v-if="deleteError" class="delete-error" role="alert">{{ deleteError }}</p>
    <GroupList
      v-model:tab="tab"
      :groups="groups"
      title="我的群組"
      :link-to="linkTo"
      :deletable-buckets="DELETABLE_BUCKETS"
      can-create
      @delete="pendingDelete = $event"
    />
  </template>

  <ConfirmDialog
    :open="pendingDelete !== null"
    title="刪除群組"
    :message="`確定要刪除「${pendingDelete?.title}」嗎？此動作無法復原。`"
    confirm-text="刪除"
    :loading="deleting"
    danger
    @confirm="handleDelete"
    @cancel="pendingDelete = null"
  />
</template>

<style scoped>
.delete-error {
  margin: 0 0 24px;
  color: #c00;
}
</style>
