<script setup lang="ts">
import { computed, ref } from "vue";

import type { WorkspaceGroup } from "@/modules/workspace/types/workspace.types";

const props = defineProps<{ groups: WorkspaceGroup[] }>();

const search = ref("");
const filteredGroups = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return props.groups;
  return props.groups.filter((group) => group.name.toLowerCase().includes(keyword));
});
</script>

<template>
  <section class="groups">
    <div class="groups__intro">
      <div>
        <p class="groups__eyebrow">工作區</p>
        <h1>我的群組</h1>
      </div>
    </div>

    <div class="search-bar">
      <input v-model="search" type="search" placeholder="搜尋群組名稱..." aria-label="搜尋我的群組" />
    </div>

    <div class="group-list">
      <div class="group-list__header" aria-hidden="true">
        <span>群組名稱</span>
        <span>成員人數</span>
        <span>我的角色</span>
        <span>操作</span>
      </div>

      <article v-for="group in filteredGroups" :key="group.id" class="group-row">
        <span class="group-row__title">{{ group.name }}</span>
        <span data-label="成員人數">{{ group.memberCount }}</span>
        <span data-label="我的角色">{{ group.role }}</span>
        <div class="group-row__actions">
          <button type="button">管理</button>
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
  grid-template-columns: minmax(240px, 2fr) 140px 140px 130px;
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
  font-size: 17px;
  font-weight: 650;
}

.group-row__actions {
  display: flex;
  justify-content: flex-end;
}

.group-row__actions button {
  border: 0;
  border-bottom: 1px solid #000;
  padding: 2px 0;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.group-list__empty {
  margin: 0;
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
