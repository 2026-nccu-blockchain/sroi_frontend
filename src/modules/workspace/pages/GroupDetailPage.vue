<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { getGroupInfo, getGroupRole } from "@/modules/workspace/api/workspace.api";
import GroupDetail from "@/modules/workspace/components/GroupDetail.vue";
import ProjectList from "@/modules/workspace/components/ProjectList.vue";
import { useProjectPhaseTab } from "@/modules/workspace/composables/useProjectPhaseTab";
import { GROUP_BUCKET_LABELS, STATUS_TO_BUCKET, toProjectErrorMessage } from "@/modules/workspace/constants";
import { useProjectStore } from "@/modules/workspace/store/project.store";
import type { GroupInfo, GroupRole, WorkspaceProject } from "@/modules/workspace/types/workspace.types";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";
import { useDeleteConfirm } from "@/shared/composables/useDeleteConfirm";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog.vue";

const props = defineProps<{ groupId: string }>();

const GROUP_INFO_ERROR_MESSAGES: Record<string, string> = {
  "10013": "找不到群組",
  "10008": "你不是此群組的成員"
};

const group = ref<GroupInfo | null>(null);
const role = ref<GroupRole | null>(null);
const loading = ref(false);
const error = ref("");

const bucket = computed(() => (group.value ? STATUS_TO_BUCKET[group.value.status] : "verified"));

const projectStore = useProjectStore();
const groupProjects = computed(() =>
  projectStore.projectsWithForms.filter((project) => project.group_id === props.groupId)
);
const phaseTab = useProjectPhaseTab();
// 組長、編輯者可以新增；刪除專案後端只允許組長
const canCreateProject = computed(() => role.value === "leader" || role.value === "editor");
const canDeleteProject = (): boolean => role.value === "leader";

const { deleteDialog, askDelete, answerDelete } = useDeleteConfirm();

const removeProject = async (project: WorkspaceProject): Promise<void> => {
  const confirmed = await askDelete({
    title: "刪除專案",
    message: `確定要刪除「${project.name}」嗎？刪除後專案內的所有資料都無法再查看，且無法復原。`
  });
  if (!confirmed) return;
  try {
    await projectStore.remove(project.project_id);
  } catch (caught) {
    projectStore.error = toProjectErrorMessage(caught, "刪除專案失敗");
  }
};

const loadGroup = async (groupId: string): Promise<void> => {
  loading.value = true;
  error.value = "";
  group.value = null;
  role.value = null;

  try {
    const info = await getGroupInfo(groupId);
    // 申請中、不同意的群組還沒有成員，不用查角色
    const roleRes = info.status === "verified" ? await getGroupRole(groupId) : null;

    // 快速切換群組時，丟棄舊請求的結果
    if (groupId !== props.groupId) return;

    role.value = roleRes?.group_role ?? null;
    group.value = info;
    if (info.status === "verified") void projectStore.ensureLoaded().catch(() => undefined);
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
      <RouterLink class="back-link" :to="{ name: 'my-groups', query: { tab: bucket } }" aria-label="返回我的群組">
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
    <GroupDetail v-else-if="group" :group="group" :eyebrow="`我的群組 · ${GROUP_BUCKET_LABELS[bucket]}`">
      <ProjectList
        v-if="group.status === 'verified'"
        v-model:tab="phaseTab"
        :projects="groupProjects"
        :loading="projectStore.loading"
        :error="projectStore.error"
        title="群組專案"
        :eyebrow="null"
        heading-tag="h2"
        :create-to="canCreateProject ? { name: 'project-new', query: { group: groupId } } : undefined"
        create-label="新增群組專案"
        :can-delete="canDeleteProject"
        empty-text="這個群組還沒有專案。"
        @delete="removeProject"
      />
    </GroupDetail>
    <DeleteConfirmDialog v-bind="deleteDialog" @confirm="answerDelete(true)" @cancel="answerDelete(false)" />
  </section>
</template>

<style scoped>
.group-page {
  display: grid;
  gap: 22px;
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
  font-size: 18px;
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
  font-size: 14px;
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
