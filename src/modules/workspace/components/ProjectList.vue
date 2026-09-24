<script setup lang="ts">
import { computed, ref } from "vue";

import type { WorkspaceProject } from "@/modules/workspace/types/workspace.types";

const props = defineProps<{ projects: WorkspaceProject[] }>();

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
</script>

<template>
  <section class="projects">
    <div class="projects__intro">
      <div>
        <p class="projects__eyebrow">工作區</p>
        <h1>我的專案</h1>
      </div>
      <RouterLink class="button button--primary" to="/forms/new">
        <span>＋</span> 新增專案
      </RouterLink>
    </div>

    <div class="search-bar">
      <input v-model="search" type="search" placeholder="搜尋專案名稱或單位..." aria-label="搜尋我的專案" />
    </div>

    <div class="project-list">
      <div class="project-list__header" aria-hidden="true">
        <span>專案名稱</span>
        <span>所屬單位</span>
        <span>年度</span>
        <span>狀態</span>
        <span>操作</span>
      </div>

      <article v-for="project in filteredProjects" :key="project.id" class="project-row">
        <span class="project-row__title">{{ project.name }}</span>
        <span data-label="所屬單位">{{ project.organization }}</span>
        <span data-label="年度">{{ project.year }}</span>
        <span data-label="狀態" class="project-row__status">{{ project.status }}</span>
        <div class="project-row__actions">
          <button type="button">編輯</button>
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

.project-row__title {
  font-size: 17px;
  font-weight: 650;
}

.project-row__status {
  font-size: 11px;
  text-transform: uppercase;
}

.project-row__actions {
  display: flex;
  justify-content: flex-end;
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
