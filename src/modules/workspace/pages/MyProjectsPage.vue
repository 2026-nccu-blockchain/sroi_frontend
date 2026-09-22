<script setup lang="ts">
import { ref } from "vue";

import ProjectList from "@/modules/workspace/components/ProjectList.vue";
import type { WorkspaceProject } from "@/modules/workspace/types/workspace.types";

const projects = ref<WorkspaceProject[]>([
  { id: 1, name: "社區關懷計畫", organization: "北區辦公室", year: 2025, status: "已發布" },
  { id: 2, name: "青年就業推動計畫", organization: "社會影響實驗室", year: 2025, status: "草稿" }
]);
</script>

<template>
  <ProjectList :projects="projects" />
</template>
