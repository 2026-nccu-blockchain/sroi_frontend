<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { useAuth } from "@/modules/auth/composables/useAuth";
import { deleteForm, getForms } from "@/modules/forms/api/forms.api";
import type { FormResponse, FormStatus } from "@/modules/forms/types/form.types";

type StatusFilter = "all" | FormStatus;

const router = useRouter();
const { isAuthenticated, user } = useAuth();
const forms = ref<FormResponse[]>([]);
const loading = ref(false);
const error = ref("");
const deletingId = ref("");
const search = ref("");
const statusFilter = ref<StatusFilter>("all");

const statusLabel: Record<FormStatus, string> = {
  draft: "草稿",
  published: "已發布",
  closed: "已關閉"
};

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

const loadForms = async (): Promise<void> => {
  if (!isAuthenticated.value) return;
  loading.value = true;
  error.value = "";
  try {
    forms.value = await getForms();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "無法載入表單";
  } finally {
    loading.value = false;
  }
};

const deleteProject = (project: Project): void => {
  if (!window.confirm(`確定要刪除「${project.name}」嗎？此操作無法復原。`)) return;
  projects.value = projects.value.filter(({ id }) => id !== project.id);
};

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

<template>
  <section class="dashboard">
    <header class="welcome-card">
      <div class="welcome-card__copy">
        <p class="eyebrow">SROI FORM WORKSPACE</p>
        <h1>我的表單</h1>
        <p v-if="isAuthenticated">整理關鍵精神、設計題目，並在同一個地方查看每份表單的回覆。</p>
        <p v-else>登入後即可建立、發布並管理你的 SROI 評估表單。</p>
        <button v-if="isAuthenticated" class="primary-button" type="button" @click="createNewForm">
          <span>＋</span> 建立新表單
        </button>
        <span data-label="所屬單位">{{ project.organization }}</span>
        <span data-label="年度">{{ project.year }}</span>
        <span data-label="狀態" class=project-row__status>{{ project.status }}</span>
        <div v-if="selectedProject === project.id" class="project-row__detail">
          <span>專案編號 — {{ String(project.id).padStart(4, "0") }}</span>
          <p>SROI 專案概覽，詳細專案資訊將顯示於此。</p>
        </div>

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
