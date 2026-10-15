<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { getGroupInfo, getGroupRole } from "@/modules/workspace/api/workspace.api";
import GroupDetail from "@/modules/workspace/components/GroupDetail.vue";
import { GROUP_BUCKET_LABELS, STATUS_TO_BUCKET } from "@/modules/workspace/constants";
import { useProjectStore } from "@/modules/workspace/store/project.store";
import type { GroupInfo, GroupRole } from "@/modules/workspace/types/workspace.types";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";
import { formatProjectPeriod } from "@/shared/utils/date";

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
const groupProjects = computed(() => projectStore.projects.filter((project) => project.group_id === props.groupId));
const canCreateProject = computed(() => role.value === "leader" || role.value === "editor");

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
      <section v-if="group.status === 'verified'" class="group-projects">
        <h2>
          群組專案
          <RouterLink
            v-if="canCreateProject"
            class="group-projects__new"
            :to="{ name: 'project-new', query: { group: groupId } }"
          >
            <span aria-hidden="true">＋</span> 新增群組專案
          </RouterLink>
        </h2>
        <ul v-if="groupProjects.length" class="group-projects__list">
          <li v-for="project in groupProjects" :key="project.project_id">
            <RouterLink :to="{ name: 'project-edit', params: { projectId: project.project_id } }">
              {{ project.name }}
            </RouterLink>
            <span>{{ formatProjectPeriod(project.begin, project.end) }}</span>
          </li>
        </ul>
        <p v-else-if="projectStore.loading" class="group-projects__empty">專案載入中…</p>
        <p v-else class="group-projects__empty">這個群組還沒有專案。</p>
      </section>
    </GroupDetail>
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

.group-projects {
  display: grid;
  gap: 12px;
}

.group-projects h2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.group-projects__new {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 14px;
  border: 1px solid #000;
  background: #000;
  color: #fff;
  font-size: 13px;
  letter-spacing: 0;
  text-decoration: none;
}

.group-projects__new:hover {
  background: #fff;
  color: #000;
}

.group-projects__list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 2px solid #000;
}

.group-projects__list li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #000;
}

.group-projects__list a {
  color: #000;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.group-projects__list span,
.group-projects__empty {
  margin: 0;
  color: #777;
  font-size: 13px;
}

.group-page__error {
  margin: 0;
  color: #c00;
}
</style>
