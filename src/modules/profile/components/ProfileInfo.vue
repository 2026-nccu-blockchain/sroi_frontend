<script setup lang="ts">
import { computed } from "vue";

import type { AuthUser } from "@/modules/auth/types/auth.types";
import { ROLE_LABELS, UNVERIFIED_ROLES } from "@/modules/profile/constants";

const props = defineProps<{ user: AuthUser }>();

const showCampusId = computed(() => !UNVERIFIED_ROLES.includes(props.user.role ?? ""));

const roleLabel = computed(() => ROLE_LABELS[props.user.role ?? ""] ?? props.user.role ?? "—");
</script>

<template>
  <div class="profile">
    <div>
      <p class="profile__eyebrow">帳號</p>
      <h1>個人資料</h1>
    </div>

    <dl class="profile__list">
      <div class="profile__row">
        <dt>姓名</dt>
        <dd>{{ user.name }}</dd>
      </div>
      <div class="profile__row">
        <dt>Email</dt>
        <dd>{{ user.email }}</dd>
      </div>
      <div v-if="showCampusId" class="profile__row">
        <dt>學號 / 教職員編號</dt>
        <dd>{{ user.campus_id }}</dd>
      </div>
      <div class="profile__row">
        <dt>角色</dt>
        <dd>
          <span class="profile__role" :class="`profile__role--${user.role}`">{{ roleLabel }}</span>
        </dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.profile {
  display: grid;
  gap: 24px;
  max-width: 640px;
}

.profile__eyebrow {
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

.profile__list {
  margin: 0;
  border-top: 2px solid #000;
}

.profile__row {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  min-height: 64px;
  border-bottom: 1px solid #000;
}

.profile__row dt {
  color: #777;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.profile__row dd {
  margin: 0;
  font-size: 15px;
  overflow-wrap: anywhere;
}

.profile__role {
  display: inline-block;
  padding: 4px 10px;
  border: 1px solid #000;
  font-size: 12px;
  font-weight: 700;
}

.profile__role--admin,
.profile__role--db_editor,
.profile__role--verified {
  background: #000;
  color: #fff;
}

.profile__role--unverified {
  border-color: #c00;
  color: #c00;
}

@media (max-width: 560px) {
  .profile__row {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 12px 0;
  }
}
</style>
