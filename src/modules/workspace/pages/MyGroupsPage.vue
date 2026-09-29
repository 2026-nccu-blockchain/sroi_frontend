<script setup lang="ts">
import { onMounted, ref } from "vue";

import { getGroups } from "@/modules/workspace/api/workspace.api";
import GroupList from "@/modules/workspace/components/GroupList.vue";
import { useGroupTab } from "@/modules/workspace/composables/useGroupTab";
import type { Group, GroupBuckets } from "@/modules/workspace/types/workspace.types";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

const tab = useGroupTab();
const groups = ref<GroupBuckets>({ verified: [], inProgress: [], unverified: [] });
const loading = ref(false);
const error = ref("");
const GROUP_ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者",
  "10008": "權限不足",
};

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
    if (err instanceof ApiError && err.statusCode && GROUP_ERROR_MESSAGES[err.statusCode]) {
      error.value = GROUP_ERROR_MESSAGES[err.statusCode];
    } else {
      error.value = toErrorMessage(err);
    }
  } finally {
    loading.value = false;
  }
});

const linkTo = (group: Group) => ({ name: "group-detail", params: { groupId: group.group_id } });
</script>

<template>
  <p v-if="loading">載入中...</p>
  <p v-else-if="error">{{ error }}</p>
  <GroupList v-else v-model:tab="tab" :groups="groups" title="我的群組" :link-to="linkTo" can-create />
</template>
