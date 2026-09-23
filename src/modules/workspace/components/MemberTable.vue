<script setup lang="ts" generic="T extends GroupUser">
import { computed, ref } from "vue";

import type { GroupUser } from "@/modules/workspace/types/workspace.types";

const props = withDefaults(
  defineProps<{
    users: T[];
    searchable?: boolean;
    emptyText?: string;
  }>(),
  { searchable: false, emptyText: "沒有符合的成員" }
);

defineSlots<{ action(props: { user: T }): unknown }>();

const search = ref("");

const filteredUsers = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return props.users;

  return props.users.filter(
    (user) => user.name.toLowerCase().includes(keyword) || user.campus_id.toLowerCase().includes(keyword)
  );
});
</script>

<template>
  <div class="member-table">
    <div v-if="searchable" class="search-bar">
      <input v-model="search" type="search" placeholder="搜尋姓名或學號..." aria-label="搜尋群組成員" />
    </div>

    <ul class="member-table__list">
      <li v-for="user in filteredUsers" :key="user.user_id" class="member-row">
        <div class="member-row__info">
          <span class="member-row__name">{{ user.name }}</span>
          <span class="member-row__id">{{ user.campus_id }}</span>
        </div>
        <div class="member-row__action">
          <slot name="action" :user="user" />
        </div>
      </li>
    </ul>

    <p v-if="filteredUsers.length === 0" class="member-table__empty">{{ emptyText }}</p>
  </div>
</template>

<style scoped>
.member-table {
  display: grid;
  gap: 16px;
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

.member-table__list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 2px solid #000;
}

.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 64px;
  border-bottom: 1px solid #000;
}

.member-row__info {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.member-row__name {
  font-size: 15px;
  font-weight: 700;
}

.member-row__id {
  color: #777;
  font-size: 12px;
}

.member-row__action {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.member-table__empty {
  margin: 0;
  color: #777;
  font-size: 13px;
}
</style>
