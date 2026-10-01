<script setup lang="ts">
import { computed, ref } from "vue";

import type { WorkspaceProject } from "@/modules/workspace/types/workspace.types";

const props = defineProps<{
  projects: WorkspaceProject[];
  loading?: boolean;
  error?: string;
}>();

defineEmits<{
  delete: [project: WorkspaceProject];
}>();

const search = ref("");
const filteredProjects = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return props.projects;
  return props.projects.filter(
    (project) =>
      project.name.toLowerCase().includes(keyword) ||
      project.organization.toLowerCase().includes(keyword)
  );
});

const statusLabel = (project: WorkspaceProject): string => {
  const status = project.linked_form?.status ?? project.status;
  return status === "published" ? "已發布" : status === "closed" ? "已關閉" : "草稿";
};
const formStatusLabel = (project: WorkspaceProject): string =>
  project.linked_form?.status === "published" ? "已發布" : "編輯中";
</script>

<template>
  <section class="projects">
    <div class="projects__intro">
      <div>
        <p class="projects__eyebrow">工作區</p>
        <h1>我的專案</h1>
      </div>
      <RouterLink class="button button--primary" to="/workspace/projects/new">
        <span>＋</span> 新增專案
      </RouterLink>
    </div>

    <div class="search-bar">
      <input v-model="search" type="search" placeholder="搜尋專案名稱或單位..." aria-label="搜尋我的專案" />
    </div>

    <p v-if="error" class="state-message state-message--error">{{ error }}</p>
    <p v-if="loading" class="state-message">專案載入中…</p>

    <div v-else class="project-list">
      <div class="project-list__header" aria-hidden="true">
        <span>專案名稱</span>
        <span>所屬單位</span>
        <span>年度</span>
        <span>利害關係人</span>
        <span>連結表單</span>
        <span>操作</span>
      </div>

      <article v-for="project in filteredProjects" :key="project.project_id" class="project-row">
        <div>
          <RouterLink class="project-row__title" :to="`/workspace/projects/${project.project_id}/edit`">
            {{ project.name }}
          </RouterLink>
          <small class="project-row__status">{{ statusLabel(project) }}</small>
        </div>
        <span data-label="所屬單位">{{ project.organization }}</span>
        <span data-label="年度">{{ project.year }}</span>
        <span data-label="利害關係人">{{ project.stakeholders.length }} 位</span>
        <span v-if="project.linked_form" data-label="連結表單" class="linked-form">
          {{ project.linked_form.title || "未命名表單" }}
          <small :class="['form-badge', { 'form-badge--published': project.linked_form.status === 'published' }]">
            {{ formStatusLabel(project) }}
          </small>
        </span>
        <span v-else data-label="連結表單">尚未連結</span>
        <div class="project-row__actions">
          <RouterLink :to="`/workspace/projects/${project.project_id}/edit`">編輯</RouterLink>
          <button type="button" @click="$emit('delete', project)">刪除</button>
        </div>
      </article>

      <p v-if="filteredProjects.length === 0" class="project-list__empty">找不到符合的專案。</p>
    </div>
  </section>
</template>

<style scoped>
.projects {
  display: grid;
  gap: 22px;
  margin-top: -16px;
}

.projects__intro {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}

.projects__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.04em;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  padding: 10px 18px;
  border: 1px solid #000;
  color: #000;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.button--primary {
  background: #000;
  color: #fff;
}

.button--primary:hover {
  background: #fff;
  color: #000;
}

.search-bar {
  border-bottom: 1px solid #000;
  padding-bottom: 10px;
}

.search-bar input {
  width: 100%;
  border: 0;
  padding: 8px 0;
  font: inherit;
  font-size: 15px;
  outline: none;
}

.project-list {
  border-top: 2px solid #000;
}

.project-list__header,
.project-row {
  display: grid;
  grid-template-columns: minmax(190px, 1.6fr) minmax(140px, 1fr) 60px 90px minmax(140px, 1fr) 110px;
  gap: 20px;
  align-items: center;
}

.project-list__header {
  min-height: 45px;
  border-bottom: 1px solid #000;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.project-list__header span:last-child {
  text-align: right;
}

.project-row {
  min-height: 82px;
  border-bottom: 1px solid #000;
  font-size: 13px;
}

.project-row__title {
  display: block;
  color: #000;
  font-size: 17px;
  font-weight: 650;
  text-decoration: none;
}

.project-row__status {
  display: block;
  margin-top: 5px;
  color: #666;
  font-size: 11px;
  text-transform: uppercase;
}

.linked-form { display: flex; align-items: center; gap: 7px; }
.form-badge { display: inline-flex; padding: 4px 8px; border-radius: 999px; background: #f0e8f4; color: #765292; font-size: 10px; font-weight: 700; white-space: nowrap; }
.form-badge--published { background: #e5f3e8; color: #2f7140; }

.project-row__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.project-row__actions button,
.project-row__actions a {
  border: 0;
  border-bottom: 1px solid #000;
  padding: 2px 0;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 12px;
  text-decoration: none;
  cursor: pointer;
}

.state-message { margin: 0; padding: 14px 0; color: #555; }
.state-message--error { color: #a12626; }

.project-list__empty {
  margin: 0;
  padding: 40px 0;
  border-bottom: 1px solid #000;
  color: #555;
}

@media (max-width: 840px) {
  .project-list__header {
    display: none;
  }

  .project-row {
    grid-template-columns: 1fr auto;
    gap: 12px 20px;
    padding: 22px 0;
  }

  .project-row__title {
    grid-column: 1 / -1;
  }

  .project-row > span::before {
    content: attr(data-label) " — ";
    color: #777;
  }
}

@media (max-width: 560px) {
  .projects__intro {
    align-items: stretch;
    flex-direction: column;
  }

  .button {
    width: 100%;
  }
}
</style>
