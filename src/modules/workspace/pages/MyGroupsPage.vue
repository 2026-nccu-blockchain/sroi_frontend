<script setup lang="ts">
import { ref } from "vue";

import GroupList from "@/modules/workspace/components/GroupList.vue";
import type { WorkspaceGroup } from "@/modules/workspace/types/workspace.types";

const groups = ref<WorkspaceGroup[]>([
  { id: 1, name: "北區志工小組", memberCount: 8, role: "擁有者" },
  { id: 2, name: "SROI 評估小組", memberCount: 5, role: "成員" }
]);
</script>

<template>
  <GroupList :groups="groups" />
</template>
