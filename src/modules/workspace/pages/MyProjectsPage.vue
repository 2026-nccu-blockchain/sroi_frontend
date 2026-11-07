<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";

import ProjectList from "@/modules/workspace/components/ProjectList.vue";
import { toProjectErrorMessage } from "@/modules/workspace/constants";
import { useProjectStore } from "@/modules/workspace/store/project.store";
import type { WorkspaceProject } from "@/modules/workspace/types/workspace.types";

const projectStore = useProjectStore();
const { projectsWithForms, loading, error } = storeToRefs(projectStore);
// 群組專案只在各群組頁顯示，這裡只列個人專案
const projects = computed(() => projectsWithForms.value.filter((project) => !project.group_id));

const loadProjects = async (): Promise<void> => {
  await projectStore.ensureLoaded().catch(() => undefined);
};

const removeProject = async (project: WorkspaceProject): Promise<void> => {
  if (!window.confirm(`確定要刪除「${project.name}」嗎？`)) return;
  try {
    await projectStore.remove(project.project_id);
  } catch (caught) {
    error.value = toProjectErrorMessage(caught, "刪除專案失敗");
  }
};

onMounted(() => {
  void loadProjects();
});
</script>

<template>
  <ProjectList
    :projects="projects"
    :loading="loading"
    :error="error"
    @delete="removeProject"
  />
</template>
