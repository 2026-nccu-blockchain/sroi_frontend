<script setup lang="ts">
import { computed } from "vue";

import type { GroupInfo } from "@/modules/workspace/types/workspace.types";

const props = defineProps<{ group: GroupInfo }>();

const sections = computed(() => [
  { title: "組長", users: props.group.group_leaders },
  { title: "組員", users: props.group.group_members }
]);

const formatDate = (iso: string): string => new Date(iso).toLocaleDateString("zh-TW");
</script>

<template>
  <div class="group-detail">
    <div class="group-detail__main">
      <div>
        <p class="group-detail__eyebrow">我的群組</p>
        <h1>{{ group.title }}</h1>
      </div>

      <dl class="group-detail__meta">
        <dt>期間</dt>
        <dd>{{ formatDate(group.begin) }} — {{ formatDate(group.end) }}</dd>
      </dl>

      <section class="group-detail__section">
        <h2>群組描述</h2>
        <p class="group-detail__desc">{{ group.desc }}</p>
      </section>
    </div>

    <aside class="people" aria-label="群組成員">
      <section v-for="section in sections" :key="section.title" class="people__section">
        <h2>
          {{ section.title }}
          <span class="people__count">{{ section.users.length }}</span>
        </h2>

        <ul v-if="section.users.length" class="people__list">
          <li v-for="user in section.users" :key="user.user_id" class="people__item">
            <span class="people__name">{{ user.name }}</span>
            <span class="people__id">{{ user.campus_id }}</span>
          </li>
        </ul>
        <p v-else class="people__empty">尚無{{ section.title }}</p>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.group-detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 48px;
  align-items: start;
}

.group-detail__main {
  display: grid;
  gap: 24px;
}

.group-detail__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.04em;
}

h2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.group-detail__meta {
  display: flex;
  gap: 16px;
  margin: 0;
  padding: 14px 0;
  border-top: 2px solid #000;
  border-bottom: 1px solid #000;
  font-size: 13px;
}

.group-detail__meta dt {
  color: #777;
  font-weight: 700;
}

.group-detail__meta dd {
  margin: 0;
}

.group-detail__section {
  display: grid;
  gap: 12px;
}

.group-detail__desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.people {
  display: grid;
  gap: 32px;
  padding-left: 32px;
  border-left: 1px solid #000;
}

.people__section {
  display: grid;
  gap: 12px;
}

.people__count {
  min-width: 24px;
  padding: 2px 6px;
  background: #000;
  color: #fff;
  font-size: 11px;
  text-align: center;
}

.people__list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 2px solid #000;
}

.people__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #000;
}

.people__name {
  font-size: 14px;
  font-weight: 700;
}

.people__id {
  color: #777;
  font-size: 12px;
}

.people__empty {
  margin: 0;
  padding: 12px 0;
  border-top: 2px solid #000;
  color: #777;
  font-size: 13px;
}

@media (max-width: 960px) {
  .group-detail {
    grid-template-columns: 1fr;
  }

  .people {
    padding: 24px 0 0;
    border-left: 0;
    border-top: 1px solid #000;
  }
}
</style>
