<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";

import { getAllProjects } from "@/modules/admin/api/admin.api";
import {
  ADMIN_PROJECT_SCOPE_LABELS,
  ADMIN_PROJECT_SCOPES,
  isAdminProjectScope,
  toAdminErrorMessage
} from "@/modules/admin/constants";
import type { AdminProjectPage, AdminProjectScope } from "@/modules/admin/types/admin.types";
import ProjectList from "@/modules/workspace/components/ProjectList.vue";
import { isProjectPhaseTab } from "@/modules/workspace/composables/useProjectPhaseTab";
import type { ProjectPhaseTab } from "@/modules/workspace/types/workspace.types";

const PAGE_SIZE = 20;
const SEARCH_DELAY = 300;

const route = useRoute();
const router = useRouter();

// 所有條件都放在網址：重新整理、從專案頁返回都會回到同一個畫面
const scope = computed<AdminProjectScope>(() => (isAdminProjectScope(route.query.scope) ? route.query.scope : "all"));
const phase = computed<ProjectPhaseTab>(() => (isProjectPhaseTab(route.query.phase) ? route.query.phase : "all"));
const q = computed(() => (typeof route.query.q === "string" ? route.query.q : ""));
const page = computed(() => {
  const value = Number(route.query.page);
  return Number.isInteger(value) && value > 1 ? value : 1;
});

interface QueryPatch {
  scope?: AdminProjectScope;
  phase?: ProjectPhaseTab;
  q?: string;
  page?: number;
}

// 更新網址參數，預設值就拿掉；除了翻頁以外，條件一變就回到第 1 頁
const updateQuery = (patch: QueryPatch): void => {
  const next: LocationQueryRaw = { ...route.query, ...patch };
  if (!("page" in patch)) delete next.page;
  for (const key of ["scope", "phase", "q", "page"] as const) {
    const value = next[key];
    if (value === "all" || value === "" || value === 1) delete next[key];
  }
  void router.replace({ query: next });
};

const phaseModel = computed({
  get: () => phase.value,
  set: (value: ProjectPhaseTab) => updateQuery({ phase: value })
});

// 輸入框即時更新，網址（也就是查詢）等使用者停手再更新
const searchInput = ref(q.value);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(searchInput, (value) => {
  clearTimeout(searchTimer);
  if (value.trim() === q.value) return;
  searchTimer = setTimeout(() => updateQuery({ q: value.trim() }), SEARCH_DELAY);
});
// 從外部改到網址（例如瀏覽器上一頁）時同步回輸入框
watch(q, (value) => {
  if (value !== searchInput.value.trim()) searchInput.value = value;
});
onBeforeUnmount(() => clearTimeout(searchTimer));

const result = ref<AdminProjectPage | null>(null);
const loading = ref(false);
const error = ref("");
let requestSeq = 0;

const load = async (): Promise<void> => {
  // 連續切換分頁或打字時，只採用最後一次請求的結果
  const seq = ++requestSeq;
  loading.value = true;
  error.value = "";
  try {
    const data = await getAllProjects({
      scope: scope.value,
      phase: phase.value,
      q: q.value,
      page: page.value,
      page_size: PAGE_SIZE
    });
    if (seq !== requestSeq) return;
    // 超出範圍的頁碼（例如資料被刪掉）就跳回最後一頁，網址一變會再查一次
    const lastPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    if (page.value > lastPage) {
      updateQuery({ page: lastPage });
      return;
    }
    result.value = data;
  } catch (err) {
    if (seq === requestSeq) error.value = toAdminErrorMessage(err);
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
};

watch([scope, phase, q, page], () => void load(), { immediate: true });

const totalPages = computed(() => Math.max(1, Math.ceil((result.value?.total ?? 0) / PAGE_SIZE)));

// 進入專案時帶著目前條件，返回時才回得來（phase 由 ProjectList 自己帶）
const linkQuery = computed(() => ({
  from: "admin",
  ...(scope.value === "all" ? {} : { scope: scope.value }),
  ...(q.value ? { q: q.value } : {}),
  ...(page.value > 1 ? { page: String(page.value) } : {})
}));
</script>

<template>
  <ProjectList
    v-model:tab="phaseModel"
    v-model:search="searchInput"
    :class="{ 'is-refreshing': loading && result }"
    :projects="result?.items ?? []"
    :counts="result?.phase_counts"
    :loading="loading && !result"
    :error="error"
    eyebrow="管理"
    title="所有專案"
    show-owner
    :link-query="linkQuery"
    :can-delete="() => false"
    empty-text="目前沒有專案。"
  >
    <template #before-tabs>
      <div class="scope-tabs" role="tablist" aria-label="專案類型">
        <button
          v-for="key in ADMIN_PROJECT_SCOPES"
          :key="key"
          type="button"
          class="scope-tabs__item"
          :class="{ 'scope-tabs__item--active': scope === key }"
          role="tab"
          :aria-selected="scope === key"
          @click="updateQuery({ scope: key })"
        >
          {{ ADMIN_PROJECT_SCOPE_LABELS[key] }}
          <span class="scope-tabs__count">{{ result?.scope_counts[key] ?? "–" }}</span>
        </button>
      </div>
    </template>

    <template #after-list>
      <nav v-if="totalPages > 1" class="pager" aria-label="分頁">
        <button type="button" :disabled="page <= 1" @click="updateQuery({ page: page - 1 })">上一頁</button>
        <span>第 {{ page }} / {{ totalPages }} 頁・共 {{ result?.total ?? 0 }} 筆</span>
        <button type="button" :disabled="page >= totalPages" @click="updateQuery({ page: page + 1 })">下一頁</button>
      </nav>
    </template>
  </ProjectList>
</template>

<style scoped>
/* 第一層用底線分頁，和下面狀態的方框分頁區分 */
/*
 * 底線用 inset box-shadow 畫在容器內，選中分頁的粗底線直接蓋在上面；
 * 不用負 margin 往外凸，否則 overflow-x: auto 會連帶讓垂直方向出現卷軸
 */
.scope-tabs {
  display: flex;
  gap: 28px;
  box-shadow: inset 0 -1px 0 #000;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.scope-tabs::-webkit-scrollbar {
  display: none;
}

.scope-tabs__item {
  border: 0;
  border-bottom: 3px solid transparent;
  padding: 10px 0;
  background: transparent;
  color: #777;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.scope-tabs__item--active {
  border-bottom-color: #000;
  color: #000;
}

.scope-tabs__count {
  margin-left: 6px;
  font-size: 13px;
  opacity: 0.7;
}

/* 換頁、搜尋時保留舊資料淡化顯示，不閃成「載入中」 */
.is-refreshing :deep(.project-list) {
  opacity: 0.5;
  transition: opacity 0.15s;
}

.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 14px;
}

.pager button {
  border: 1px solid #000;
  padding: 6px 14px;
  background: #fff;
  color: #000;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.pager button:disabled {
  border-color: #ccc;
  color: #aaa;
  cursor: default;
}
</style>
