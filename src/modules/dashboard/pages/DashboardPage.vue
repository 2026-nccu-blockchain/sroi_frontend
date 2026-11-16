<script setup lang="ts">
import { onMounted, ref } from "vue";

import { getPublishedProjects } from "@/modules/workspace/api/workspace.api";
import ProjectPhaseBadge from "@/modules/workspace/components/ProjectPhaseBadge.vue";
import type { WorkspaceProject } from "@/modules/workspace/types/workspace.types";
import { formatProjectPeriod } from "@/shared/utils/date";

// 共用資料庫只列出已發布至資料庫的專案（所有人的），不走「我的專案」的快取
const projects = ref<WorkspaceProject[]>([]);
const loading = ref(true);
const error = ref("");

const formatDate = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString("zh-TW") : "—");

onMounted(async () => {
  try {
    projects.value = await getPublishedProjects();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "無法載入已發布的專案";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="projects">
    <div class="projects__intro">
      <div>
        <p class="projects__eyebrow">共用資料庫</p>
        <h1>已發布專案</h1>
      </div>
    </div>

    <p v-if="error" class="projects__notice projects__notice--error">{{ error }}</p>
    <p v-if="loading" class="projects__notice">專案載入中…</p>

    <div v-else class="project-list">
      <div class="project-list__header" aria-hidden="true">
        <span>專案名稱</span><span>作者</span><span>所屬單位</span><span>專案期間</span><span>狀態</span>
      </div>

      <article v-for="project in projects" :key="project.project_id" class="project-row">
        <div class="project-name-cell">
          <!-- 按標題進入專案頁；已發布的專案任何人都能打開，內容與一般專案頁相同，但只能檢視 -->
          <RouterLink
            class="project-row__title"
            :to="{ name: 'project-edit', params: { projectId: project.project_id }, query: { from: 'database' } }"
          >{{ project.name }}</RouterLink>
          <div v-if="project.outcomes.length" class="outcome-tags">
            <span v-for="outcome in project.outcomes" :key="outcome.outcome_id">#{{ outcome.name }}</span>
          </div>
        </div>
        <span data-label="作者">{{ project.creator_name || "—" }}</span>
        <span data-label="所屬單位">{{ project.organization || "—" }}</span>
        <span data-label="專案期間">{{ formatProjectPeriod(project.begin, project.end) }}</span>
        <span data-label="狀態" class="project-row__status">
          <ProjectPhaseBadge phase="published" />
          <small>{{ formatDate(project.published_at) }}</small>
        </span>
      </article>

      <p v-if="!loading && projects.length === 0" class="project-list__empty">目前還沒有已發布至資料庫的專案。</p>
    </div>
  </section>
</template>

<style scoped>
.projects { display: grid; gap: 22px; }
.projects__intro { display: flex; align-items: end; justify-content: space-between; gap: 24px; }
.projects__eyebrow { margin: 0 0 8px; font-size: 14px; font-weight: 700; letter-spacing: .15em; }
h1 { margin: 0; font-size: 24px; font-weight: 500; line-height: 1; letter-spacing: -.04em; }
.projects__notice { margin: -12px 0 0; padding: 13px 0; border-top: 1px solid #aaa; border-bottom: 1px solid #aaa; color: #555; font-size: 14px; }
.projects__notice--error { color: #8c2020; }
.project-list { border-top: 2px solid #000; }
.project-list__header, .project-row { display: grid; grid-template-columns: minmax(220px, 2fr) minmax(90px, .6fr) minmax(150px, 1fr) 70px 90px; gap: 20px; align-items: center; }
.project-list__header { min-height: 45px; border-bottom: 1px solid #000; font-size: 14px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.project-row { min-height: 82px; border-bottom: 1px solid #000; font-size: 14px; }
.project-row__title { width: fit-content; color: #000; font-size: 17px; font-weight: 650; text-decoration: none; }
.project-row__title:hover, .project-row__title:focus-visible { text-decoration: underline; text-underline-offset: 4px; }
.project-name-cell { display: grid; gap: 7px; }
.outcome-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.outcome-tags span { padding: 3px 7px; border-radius: 999px; background: #f0e8f4; color: #765292; font-size: 14px; font-weight: 700; }
.project-row__status { display: grid; justify-items: start; gap: 4px; font-size: 14px; }
.project-row__status small { color: #777; font-size: 13px; }
.project-list__empty { margin: 0; padding: 40px 0; border-bottom: 1px solid #000; color: #555; }
@media (max-width: 840px) {
  .project-list__header { display: none; }
  .project-row { grid-template-columns: 1fr; gap: 10px; padding: 22px 0; }
  .project-row > span::before { content: attr(data-label) " — "; color: #777; }
}
@media (max-width: 600px) { .projects__intro { align-items: stretch; flex-direction: column; } }
</style>
