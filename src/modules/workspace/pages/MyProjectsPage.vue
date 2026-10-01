<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";

import ProjectList from "@/modules/workspace/components/ProjectList.vue";
import { useProjectStore } from "@/modules/workspace/store/project.store";
import type { WorkspaceProject } from "@/modules/workspace/types/workspace.types";

const projectStore = useProjectStore();
const { projectsWithForms: projects, loading, error } = storeToRefs(projectStore);

const loadProjects = async (): Promise<void> => {
  await projectStore.ensureLoaded().catch(() => undefined);
};

const removeProject = async (project: WorkspaceProject): Promise<void> => {
  if (!window.confirm(`確定要刪除「${project.name}」嗎？`)) return;
  try {
    await projectStore.remove(project.project_id);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "刪除專案失敗";
  }
};

onMounted(() => void loadProjects());
</script>

<template>
  <ProjectList :projects="projects" :loading="loading" :error="error" @delete="removeProject" />
</template>
