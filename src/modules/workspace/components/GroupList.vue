<script setup lang="ts">
import { computed, ref } from "vue";

import type { Group, GroupBuckets, GroupStatus } from "@/modules/workspace/types/workspace.types";

const props = defineProps<{ groups: GroupBuckets }>();

const TABS: { key: GroupStatus; label: string }[] = [
  { key: "已驗證", label: "已驗證" },
  { key: "審核中", label: "審核中" },
  { key: "未驗證", label: "未驗證" }
];

const activeTab = ref<GroupStatus>("已驗證");
const search = ref("");
const selectedGroup = ref<string | null>(null);

const activeGroups = computed<Group[]>(() => {
  if (activeTab.value === "已驗證") return props.groups.verified;
  if (activeTab.value === "審核中") return props.groups.inProgress;
  return props.groups.unverified;
});

const filteredGroups = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return activeGroups.value;
  return activeGroups.value.filter(
    (group) =>
      group.title.toLowerCase().includes(keyword) ||
      group.desc.toLowerCase().includes(keyword)
  );
});

const formatDate = (iso: string): string => new Date(iso).toLocaleDateString("zh-TW");
</script>

<template>
  <section class="groups">
    <div class="groups__intro">
      <div>
        <p class="groups__eyebrow">工作區</p>
        <h1>我的群組</h1>
      </div>
    </div>

    <div class="tab-bar" role="tablist">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        type="button"
        class="tab-bar__item"
        :class="{ 'tab-bar__item--active': activeTab === tab.key }"
        role="tab"
        :aria-selected="activeTab === tab.key"
        @click="activeTab = tab.key; selectedGroup = null"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="search-bar">
      <input v-model="search" type="search" placeholder="搜尋群組名稱或說明..." aria-label="搜尋我的群組" />
    </div>

    <div class="group-list">
      <div class="group-list__header" aria-hidden="true">
        <span>群組名稱</span>
        <span>期間</span>
      </div>

      <article
        v-for="group in filteredGroups"
        :key="group.group_id"
        class="group-row"
        :class="{ 'group-row--open': selectedGroup === group.group_id }"
      >
        <button
          class="group-row__title"
          type="button"
          :aria-expanded="selectedGroup === group.group_id"
          @click="selectedGroup = selectedGroup === group.group_id ? null : group.group_id"
        >
          {{ group.title }}
        </button>
        <span data-label="期間">{{ formatDate(group.begin) }} — {{ formatDate(group.end) }}</span>

        <div v-if="selectedGroup === group.group_id" class="group-row__detail">
          <p>{{ group.desc || "尚無說明。" }}</p>
        </div>
      </article>

      <p v-if="filteredGroups.length === 0" class="group-list__empty">找不到符合的群組。</p>
    </div>
  </section>
</template>

<style scoped>
.groups {
  display: grid;
  gap: 22px;
  margin-top: -16px;
}

.groups__eyebrow {
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

.tab-bar {
  display: flex;
  gap: 8px;
}

.tab-bar__item {
  border: 1px solid #000;
  padding: 8px 16px;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.tab-bar__item--active {
  background: #000;
  color: #fff;
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

.group-list {
  border-top: 2px solid #000;
}

.group-list__header,
.group-row {
  display: grid;
  grid-template-columns: minmax(240px, 2fr) minmax(160px, 1fr);
  gap: 20px;
  align-items: center;
}

.group-list__header {
  min-height: 45px;
  border-bottom: 1px solid #000;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.group-list__header span:last-child {
  text-align: right;
}

.group-row {
  min-height: 82px;
  border-bottom: 1px solid #000;
  font-size: 13px;
}

.group-row__title {
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

.group-row__title:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.group-row > span:last-child {
  text-align: right;
}

.group-row__detail {
  grid-column: 1 / -1;
  padding: 4px 0 24px;
  color: #555;
  font-size: 12px;
}

.group-row__detail p,
.group-list__empty {
  margin: 0;
}

.group-list__empty {
  padding: 40px 0;
  border-bottom: 1px solid #000;
  color: #555;
}

@media (max-width: 840px) {
  .group-list__header {
    display: none;
  }

  .group-row {
    grid-template-columns: 1fr auto;
    gap: 12px 20px;
    padding: 22px 0;
  }

  .group-row__title {
    grid-column: 1 / -1;
  }

  .group-row > span::before {
    content: attr(data-label) " — ";
    color: #777;
  }
}
</style>
