<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import ProfileInfo from "@/modules/profile/components/ProfileInfo.vue";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

const PROFILE_ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者"
};

const authStore = useAuthStore();
const user = computed(() => authStore.user);
const loading = ref(false);
const error = ref("");

onMounted(async () => {
  loading.value = true;
  error.value = "";

  try {
    // 每次進入都重新抓，審核通過後角色與學號會馬上更新
    await authStore.fetchProfile();
  } catch (err) {
    if (err instanceof ApiError && err.statusCode && PROFILE_ERROR_MESSAGES[err.statusCode]) {
      error.value = PROFILE_ERROR_MESSAGES[err.statusCode];
    } else {
      error.value = toErrorMessage(err);
    }
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="profile-page">
    <p v-if="loading && !user?.name">載入中...</p>
    <p v-else-if="error" class="profile-page__error">{{ error }}</p>
    <ProfileInfo v-else-if="user" :user="user" />
  </section>
</template>

<style scoped>
.profile-page {
  display: grid;
  gap: 22px;
  margin-top: -16px;
}

.profile-page__error {
  margin: 0;
  color: #c00;
}
</style>
