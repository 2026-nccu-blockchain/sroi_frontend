<<<<<<< HEAD
=======
<script setup lang="ts">
import { onMounted, ref } from "vue";

import { useAuth } from "@/modules/auth/composables/useAuth";

interface Project {
  id: number;
  name: string;
  organization: string;
  year: number;
  status: "草稿" | "已發布";
}

const { isAuthenticated, fetchProfile } = useAuth();
const projects = ref<Project[]>([
  { id: 1, name: "社區關懷計畫", organization: "北區辦公室", year: 2025, status: "已發布" },
  { id: 2, name: "青年就業推動計畫", organization: "社會影響實驗室", year: 2025, status: "草稿" },
  { id: 3, name: "高齡數位共融計畫", organization: "城市基金會", year: 2024, status: "已發布" }
]);
const selectedProject = ref<number | null>(null);

onMounted(() => {
  if (isAuthenticated.value) {
    fetchProfile().catch(() => {
      // 401 已經由 http.ts 的 unauthorizedHandler 處理登出+導頁；
      // 其他失敗就讓畫面保持只顯示 id，不影響頁面其他功能。
    });
  }
});

const deleteProject = (project: Project): void => {
  if (!window.confirm(`確定要刪除「${project.name}」嗎？此操作無法復原。`)) return;
  projects.value = projects.value.filter(({ id }) => id !== project.id);
};
</script>

<template>
  <section class="projects">
    <div class="projects__intro">
      <div>
        <p class="projects__eyebrow">專案總覽</p>
        <h1>專案列表</h1>
      </div>
    </div>

    <p v-if="!isAuthenticated" class="projects__notice">
      專案公開瀏覽，登入後可新增、編輯或刪除。
    </p>

    <div class="project-list">
      <div class="project-list__header" aria-hidden="true">
        <span>專案名稱</span>
        <span>所屬單位</span>
        <span>年度</span>
        <span>狀態</span>
      </div>

      <article
        v-for="project in projects"
        :key="project.id"
        class="project-row"
        :class="{ 'project-row--open': selectedProject === project.id }"
      >
        <button
          class="project-row__title"
          type="button"
          :aria-expanded="selectedProject === project.id"
          @click="selectedProject = selectedProject === project.id ? null : project.id"
        >
          {{ project.name }}
        </button>
        <span data-label="所屬單位">{{ project.organization }}</span>
        <span data-label="年度">{{ project.year }}</span>
        <span data-label="狀態" class=project-row__status>{{ project.status }}</span>
        <div v-if="selectedProject === project.id" class="project-row__detail">
          <span>專案編號 — {{ String(project.id).padStart(4, "0") }}</span>
          <p>SROI 專案概覽，詳細專案資訊將顯示於此。</p>
        </div>
      </article>

      <p v-if="projects.length === 0" class="project-list__empty">目前沒有專案。</p>
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

.projects__notice {
  margin: -12px 0 0;
  padding: 13px 0;
  border-top: 1px solid #aaa;
  border-bottom: 1px solid #aaa;
  color: #555;
  font-size: 13px;
}

.project-list {
  border-top: 2px solid #000;
}

.project-list__header,
.project-row {
  display: grid;
  grid-template-columns: minmax(240px, 2fr) minmax(180px, 1fr) 80px 100px 130px;
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

.project-list__header > :last-child:nth-child(4),
.project-row > :last-child:nth-child(4) {
  grid-column: 4 / 6;
}

.project-row__title {
  border: 0;
  padding: 0;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 17px;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
}

.project-row__title:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.project-row__status {
  font-size: 11px;
  text-transform: uppercase;
  text-align: right;
}

.project-row__actions {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
}

.project-row__actions button {
  border: 0;
  border-bottom: 1px solid #000;
  padding: 2px 0;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.project-row__detail {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(240px, 2fr) 1fr;
  gap: 20px;
  padding: 4px 0 24px;
  color: #555;
  font-size: 12px;
}

.project-row__detail p,
.project-list__empty {
  margin: 0;
}

.project-list__empty {
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

  .project-row__actions {
    grid-column: 2;
    grid-row: 2 / span 2;
  }

  .project-row__detail {
    grid-template-columns: 1fr;
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
>>>>>>> origin/reconstruct
