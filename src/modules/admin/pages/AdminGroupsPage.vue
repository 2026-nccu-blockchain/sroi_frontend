<script setup lang="ts">
import { onMounted, ref } from "vue";

import { getAllGroups } from "@/modules/admin/api/admin.api";
import { toAdminErrorMessage } from "@/modules/admin/constants";
import GroupList from "@/modules/workspace/components/GroupList.vue";
import { useGroupTab } from "@/modules/workspace/composables/useGroupTab";
import type { Group, GroupBuckets } from "@/modules/workspace/types/workspace.types";

const tab = useGroupTab();
const groups = ref<GroupBuckets>({ verified: [], inProgress: [], unverified: [] });
const loading = ref(false);
const error = ref("");

onMounted(async () => {
  loading.value = true;
  error.value = "";

  try {
    const res = await getAllGroups();
    groups.value = {
      verified: res.agree_groups,
      inProgress: res.in_progress_groups,
      unverified: res.disagree_groups
    };
  } catch (err) {
    error.value = toAdminErrorMessage(err);
  } finally {
    loading.value = false;
  }
});

const linkTo = (group: Group) => ({ name: "admin-group-detail", params: { groupId: group.group_id } });
</script>

<template>
  <p v-if="loading">載入中...</p>
  <p v-else-if="error">{{ error }}</p>
  <GroupList v-else v-model:tab="tab" :groups="groups" eyebrow="管理" title="所有群組" :link-to="linkTo" />
</template>
