<script setup lang="ts">
import { computed } from "vue";

import { GROUP_ROLE_LABELS } from "@/modules/workspace/constants";
import type { GroupInfo, GroupRole } from "@/modules/workspace/types/workspace.types";
import { formatTaipeiDate } from "@/shared/utils/date";

const props = withDefaults(defineProps<{ group: GroupInfo; eyebrow?: string }>(), { eyebrow: "我的群組" });

const membersWithRole = (role: GroupRole) =>
  props.group.group_members.filter((user) => (user.group_role ?? "viewer") === role);

const sections = computed(() => [
  { title: GROUP_ROLE_LABELS.leader, users: props.group.group_leaders },
  { title: GROUP_ROLE_LABELS.editor, users: membersWithRole("editor") },
  { title: GROUP_ROLE_LABELS.viewer, users: membersWithRole("viewer") }
]);
</script>

<template>
  <div class="group-detail">
    <div class="group-detail__main">
      <div>
        <p class="group-detail__eyebrow">{{ eyebrow }}</p>
        <h1>{{ group.title }}</h1>
      </div>

      <dl class="group-detail__meta">
        <dt>期間</dt>
        <dd>{{ formatTaipeiDate(group.begin) }} — {{ formatTaipeiDate(group.end) }}</dd>
      </dl>

      <section v-if="group.status === 'unverified' && group.reason" class="group-detail__section group-detail__reason">
        <h2>不同意原因</h2>
        <p class="group-detail__desc">{{ group.reason }}</p>
      </section>

      <section class="group-detail__section">
        <h2>群組描述</h2>
        <p class="group-detail__desc">{{ group.desc }}</p>
      </section>

      <slot />
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
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 40px;
  align-items: start;
  /* 讓組員欄吃掉 MainLayout 右側內距，貼近畫面右邊；數值要跟 MainLayout 的 padding 一致 */
  margin-right: calc(-1 * clamp(20px, 5vw, 72px));
}

.group-detail__main {
  display: grid;
  gap: 24px;
}

.group-detail__eyebrow {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.04em;
}

h2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  font-size: 14px;
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
  font-size: 14px;
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

.group-detail__reason {
  padding: 16px 20px;
  border: 1px solid #c00;
  color: #c00;
}

/*
 * 成員欄固定在視窗內並獨立捲動，成員很多時不用捲整個頁面
 * contain: size 讓成員欄不撐高頁面，高度跟著左側內容（stretch）
 * 高度上限扣掉上方 24px 與 MainLayout 內容區的下方留白，捲到頁面底部時頂端才不會被切掉
 */
.people {
  position: sticky;
  top: 24px;
  align-self: stretch;
  contain: size;
  display: grid;
  align-content: start;
  gap: 32px;
  min-height: min(480px, calc(100vh - 24px - clamp(40px, 7vw, 88px)));
  max-height: calc(100vh - 24px - clamp(40px, 7vw, 88px));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-left: 24px;
  padding-right: 20px;
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
  font-size: 14px;
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
  font-size: 14px;
}

.people__empty {
  margin: 0;
  padding: 12px 0;
  border-top: 2px solid #000;
  color: #777;
  font-size: 14px;
}

@media (max-width: 960px) {
  .group-detail {
    grid-template-columns: 1fr;
    margin-right: 0;
  }

  .people {
    position: static;
    contain: none;
    min-height: 0;
    max-height: none;
    overflow: visible;
    padding: 24px 0 0;
    border-left: 0;
    border-top: 1px solid #000;
  }
}
</style>
