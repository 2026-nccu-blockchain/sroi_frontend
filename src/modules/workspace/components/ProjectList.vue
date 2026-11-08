<script setup lang="ts">
import { computed, ref } from "vue";
import type { RouteLocationRaw } from "vue-router";

import ProjectPhaseBadge from "@/modules/workspace/components/ProjectPhaseBadge.vue";
import { getProjectPhase, PROJECT_PHASE_TAB_LABELS, PROJECT_PHASE_TABS } from "@/modules/workspace/constants";
import type { ProjectPhaseTab, WorkspaceProject } from "@/modules/workspace/types/workspace.types";
import { formatProjectPeriod } from "@/shared/utils/date";

// 我的專案、群組專案共用；權限由父層判斷後傳進來
const props = withDefaults(
  defineProps<{
    projects: WorkspaceProject[];
    loading?: boolean;
    error?: string;
    title?: string;
    // 給 null 就不顯示
    eyebrow?: string | null;
    // 群組頁裡已經有群組名稱當 h1，列表標題改用 h2
    headingTag?: "h1" | "h2";
    // 不給就不顯示新增按鈕
    createTo?: RouteLocationRaw;
    createLabel?: string;
    canDelete?: (project: WorkspaceProject) => boolean;
    // 完全沒有專案時的提示
    emptyText?: string;
  }>(),
  {
    title: "我的專案",
    eyebrow: "工作區",
    headingTag: "h1",
    createLabel: "新增專案",
    canDelete: () => true,
    emptyText: "找不到符合的專案。"
  }
);

defineEmits<{
  delete: [project: WorkspaceProject];
}>();

// 父層可以用 v-model:tab 綁到網址，不綁就只存在元件內
const activeTab = defineModel<ProjectPhaseTab>("tab", { default: "all" });
const search = ref("");

// 每個專案的狀態只算一次，列表、分頁數量、篩選共用
const rows = computed(() => {
  const now = new Date();
  return props.projects.map((project) => ({ project, phase: getProjectPhase(project, now) }));
});

const tabCounts = computed(() => {
  const counts: Record<ProjectPhaseTab, number> = {
    all: rows.value.length,
    not_started: 0,
    in_progress: 0,
    pending_close: 0,
    closed: 0
  };
  for (const { phase } of rows.value) counts[phase] += 1;
  return counts;
});

const filteredRows = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  return rows.value.filter(
    ({ project, phase }) =>
      (activeTab.value === "all" || phase === activeTab.value) &&
      (!keyword ||
        project.name.toLowerCase().includes(keyword) ||
        project.organization.toLowerCase().includes(keyword))
  );
});

// 進入專案時帶著目前分頁，返回時才回得來
const projectLink = (project: WorkspaceProject): RouteLocationRaw => ({
  name: "project-edit",
  params: { projectId: project.project_id },
  query: activeTab.value === "all" ? {} : { phase: activeTab.value }
});

const statusLabel = (project: WorkspaceProject): string => {
  const status = project.forms.some((form) => form.status === "published") ? "published" : project.status;
  return status === "published" ? "已發布" : "草稿";
};
</script>

<template>
  <section class="projects">
    <div class="projects__intro">
      <div>
        <p v-if="eyebrow" class="projects__eyebrow">{{ eyebrow }}</p>
        <component :is="headingTag" class="projects__title">{{ title }}</component>
      </div>
      <RouterLink v-if="createTo" class="button button--primary" :to="createTo">
        <span>＋</span> {{ createLabel }}
      </RouterLink>
    </div>

    <div class="tab-bar" role="tablist">
      <button
        v-for="key in PROJECT_PHASE_TABS"
        :key="key"
        type="button"
        class="tab-bar__item"
        :class="{ 'tab-bar__item--active': activeTab === key }"
        role="tab"
        :aria-selected="activeTab === key"
        @click="activeTab = key"
      >
        {{ PROJECT_PHASE_TAB_LABELS[key] }}
        <span class="tab-bar__count">{{ tabCounts[key] }}</span>
      </button>
    </div>

    <div class="search-bar">
      <input v-model="search" type="search" placeholder="搜尋專案名稱或單位..." :aria-label="`搜尋${title}`" />
    </div>

    <p v-if="error" class="state-message state-message--error">{{ error }}</p>
    <p v-if="loading" class="state-message">專案載入中…</p>

    <div v-else class="project-list">
      <div class="project-list__header" aria-hidden="true">
        <span>專案名稱</span>
        <span>所屬單位</span>
        <span>專案期間</span>
        <span>專案狀態</span>
        <span>操作</span>
      </div>

      <article v-for="{ project, phase } in filteredRows" :key="project.project_id" class="project-row">
        <div class="project-name-cell">
          <RouterLink class="project-row__title" :to="projectLink(project)">
            {{ project.name }}
          </RouterLink>
          <small class="project-row__status">{{ statusLabel(project) }}</small>
        </div>
        <span data-label="所屬單位">{{ project.organization }}</span>
        <span data-label="專案期間">{{ formatProjectPeriod(project.begin, project.end) }}</span>
        <span data-label="專案狀態">
          <ProjectPhaseBadge :phase="phase" />
        </span>
        <div class="project-row__actions">
          <button v-if="canDelete(project)" class="delete-button" type="button" @click="$emit('delete', project)">刪除</button>
        </div>
      </article>

      <p v-if="filteredRows.length === 0" class="project-list__empty">
        {{ projects.length === 0 ? emptyText : "找不到符合的專案。" }}
      </p>
    </div>
  </section>
</template>

<style scoped>
/* 依元件本身寬度切換版面，放在群組頁較窄的主欄裡也不會擠壞 */
.projects {
  display: grid;
  gap: 22px;
  container-type: inline-size;
}

.projects__intro {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}

.projects__eyebrow {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

.projects__title {
  margin: 0;
  font-size: 24px;
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
  font-size: 14px;
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

.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tab-bar__item {
  border: 1px solid #000;
  padding: 8px 16px;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.tab-bar__item--active {
  background: #000;
  color: #fff;
}

.tab-bar__count {
  margin-left: 6px;
  font-size: 14px;
  opacity: 0.7;
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
  grid-template-columns: minmax(190px, 1.6fr) minmax(140px, 1fr) 150px 100px 110px;
  gap: 20px;
  align-items: center;
}

.project-list__header {
  min-height: 45px;
  border-bottom: 1px solid #000;
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 14px;
  text-transform: uppercase;
}

.project-name-cell { display: grid; gap: 5px; }

.project-row__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.delete-button {
  border: 1px solid #c00;
  padding: 6px 14px;
  background: #fff;
  color: #c00;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.delete-button:hover {
  background: #c00;
  color: #fff;
}

.state-message { margin: 0; padding: 14px 0; color: #555; }
.state-message--error { color: #a12626; }

.project-list__empty {
  margin: 0;
  padding: 40px 0;
  border-bottom: 1px solid #000;
  color: #555;
}

@container (max-width: 800px) {
  .project-list__header {
    display: none;
  }

  .project-row {
    grid-template-columns: 1fr auto;
    gap: 12px 20px;
    padding: 22px 0;
  }

  .project-name-cell {
    grid-column: 1 / -1;
  }

  .project-row > span::before {
    content: attr(data-label) " — ";
    color: #777;
  }
}

@container (max-width: 520px) {
  .projects__intro {
    align-items: stretch;
    flex-direction: column;
  }

  .button {
    width: 100%;
  }
}
</style>
