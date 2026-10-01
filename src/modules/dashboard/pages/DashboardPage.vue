<script setup lang="ts">
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";

import { useAuth } from "@/modules/auth/composables/useAuth";
import { useProjectStore } from "@/modules/workspace/store/project.store";
import type { WorkspaceProject } from "@/modules/workspace/types/workspace.types";

const { isAuthenticated } = useAuth();
const projectStore = useProjectStore();
const { projects, loading, error } = storeToRefs(projectStore);
const selectedProject = ref<string | null>(null);

const statusLabel = (status: WorkspaceProject["status"]): string =>
  status === "published" ? "已發布" : "草稿";

onMounted(async () => {
  if (!isAuthenticated.value) return;
  await projectStore.ensureLoaded().catch(() => undefined);
});
</script>

<template>
  <section class="projects">
    <div class="projects__intro">
      <div>
        <p class="projects__eyebrow">專案總覽</p>
        <h1>專案列表</h1>
      </div>
      <div class="intro-actions">
        <RouterLink v-if="isAuthenticated" class="outline-button" to="/workspace/projects/new">＋ 新增專案</RouterLink>
        <RouterLink class="solid-button" to="/forms">進入表單工作區 →</RouterLink>
      </div>
    </div>

    <p v-if="!isAuthenticated" class="projects__notice">登入後可新增、編輯專案與設定利害關係人。</p>
    <p v-if="error" class="projects__notice projects__notice--error">{{ error }}</p>
    <p v-if="loading" class="projects__notice">專案載入中…</p>

    <div v-else class="project-list">
      <div class="project-list__header" aria-hidden="true">
        <span>專案名稱</span><span>所屬單位</span><span>年度</span><span>狀態</span><span>操作</span>
      </div>

      <article
        v-for="project in projects"
        :key="project.project_id"
        class="project-row"
        :class="{ 'project-row--open': selectedProject === project.project_id }"
      >
        <button
          class="project-row__title"
          type="button"
          :aria-expanded="selectedProject === project.project_id"
          @click="selectedProject = selectedProject === project.project_id ? null : project.project_id"
        >
          {{ project.name }}
        </button>
        <span data-label="所屬單位">{{ project.organization || "—" }}</span>
        <span data-label="年度">{{ project.year }}</span>
        <span data-label="狀態" class="project-row__status">{{ statusLabel(project.status) }}</span>
        <div class="project-row__actions">
          <RouterLink :to="`/workspace/projects/${project.project_id}/edit`">編輯</RouterLink>
        </div>
        <div v-if="selectedProject === project.project_id" class="project-row__detail">
          <span>{{ project.stakeholders.length }} 位利害關係人</span>
          <p>{{ project.description || "尚未填寫專案說明。" }}</p>
          <span>表單：{{ project.linked_form?.title || "尚未連結" }}</span>
        </div>
      </article>

      <p v-if="isAuthenticated && projects.length === 0" class="project-list__empty">目前沒有專案，可以先新增一個專案。</p>
    </div>
  </section>
</template>

<style scoped>
.projects { display: grid; gap: 22px; margin-top: -16px; }
.projects__intro { display: flex; align-items: end; justify-content: space-between; gap: 24px; }
.projects__eyebrow { margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: .15em; }
h1 { margin: 0; font-size: 26px; font-weight: 500; line-height: 1; letter-spacing: -.04em; }
.intro-actions { display: flex; gap: 10px; }
.outline-button, .solid-button { border: 1px solid #111; border-radius: 8px; padding: 10px 14px; color: #111; font-size: 13px; font-weight: 700; text-decoration: none; }
.solid-button { background: #111; color: #fff; }
.projects__notice { margin: -12px 0 0; padding: 13px 0; border-top: 1px solid #aaa; border-bottom: 1px solid #aaa; color: #555; font-size: 13px; }
.projects__notice--error { color: #8c2020; }
.project-list { border-top: 2px solid #000; }
.project-list__header, .project-row { display: grid; grid-template-columns: minmax(220px, 2fr) minmax(150px, 1fr) 70px 90px 90px; gap: 20px; align-items: center; }
.project-list__header { min-height: 45px; border-bottom: 1px solid #000; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.project-list__header span:last-child { text-align: right; }
.project-row { min-height: 82px; border-bottom: 1px solid #000; font-size: 13px; }
.project-row__title { border: 0; padding: 0; background: transparent; color: #000; font: inherit; font-size: 17px; font-weight: 650; text-align: left; cursor: pointer; }
.project-row__title:hover { text-decoration: underline; text-underline-offset: 4px; }
.project-row__status { font-size: 11px; text-transform: uppercase; }
.project-row__actions { display: flex; justify-content: flex-end; }
.project-row__actions a { border-bottom: 1px solid #000; color: #000; font-size: 12px; text-decoration: none; }
.project-row__detail { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(160px, .6fr) 2fr minmax(180px, 1fr); gap: 20px; padding: 4px 0 24px; color: #555; font-size: 12px; }
.project-row__detail p, .project-list__empty { margin: 0; }
.project-list__empty { padding: 40px 0; border-bottom: 1px solid #000; color: #555; }
@media (max-width: 840px) {
  .project-list__header { display: none; }
  .project-row { grid-template-columns: 1fr auto; gap: 12px 20px; padding: 22px 0; }
  .project-row__title { grid-column: 1 / -1; }
  .project-row > span::before { content: attr(data-label) " — "; color: #777; }
  .project-row__actions { grid-column: 2; grid-row: 2 / span 2; }
  .project-row__detail { grid-template-columns: 1fr; }
}
@media (max-width: 600px) { .projects__intro, .intro-actions { align-items: stretch; flex-direction: column; } }
</style>
