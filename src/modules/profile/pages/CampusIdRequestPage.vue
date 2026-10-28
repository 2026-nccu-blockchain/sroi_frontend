<script setup lang="ts">
import { computed, ref } from "vue";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import { changeCampusId } from "@/modules/profile/api/profile.api";
import CampusIdRequestForm from "@/modules/profile/components/CampusIdRequestForm.vue";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

const ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者",
  "10012": "此學號已被其他帳號使用"
};

const authStore = useAuthStore();
// 還沒有學號的帳號是第一次申請
const title = computed(() => (authStore.user?.campus_id ? "變更學號" : "申請學號"));
const submitting = ref(false);
const error = ref("");
const done = ref(false);

const handleSubmit = async (campusId: string): Promise<void> => {
  submitting.value = true;
  error.value = "";

  try {
    await changeCampusId({ campus_id: campusId });
    done.value = true;
  } catch (err) {
    if (err instanceof ApiError && err.statusCode && ERROR_MESSAGES[err.statusCode]) {
      error.value = ERROR_MESSAGES[err.statusCode];
    } else {
      error.value = toErrorMessage(err);
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section class="campus-request">
    <RouterLink class="back-link" :to="{ name: 'profile' }" aria-label="返回個人資料">
      <span aria-hidden="true">←</span> 返回
    </RouterLink>

    <div>
      <p class="campus-request__eyebrow">個人資料</p>
      <h1>{{ title }}</h1>
      <p class="campus-request__description">請輸入學號 / 教職員編號，送出後由管理員審核，審核通過前仍使用目前的資料。</p>
    </div>

    <div v-if="done" class="campus-request__done" role="status">
      <p>已送出申請，待管理員審核。</p>
      <RouterLink class="button" :to="{ name: 'profile' }">返回個人資料</RouterLink>
    </div>

    <CampusIdRequestForm
      v-else
      :current-campus-id="authStore.user?.campus_id"
      :submitting="submitting"
      :server-error="error"
      @submit="handleSubmit"
    />
  </section>
</template>

<style scoped>
.campus-request {
  display: grid;
  gap: 22px;
  max-width: 640px;
  margin-top: -16px;
}

.back-link {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #000;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.back-link span {
  font-size: 22px;
  line-height: 1;
}

.back-link:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.campus-request__eyebrow {
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

.campus-request__description {
  margin: 12px 0 0;
  color: #555;
  font-size: 14px;
  line-height: 1.6;
}

.campus-request__done {
  display: grid;
  gap: 16px;
  justify-items: start;
  padding-top: 24px;
  border-top: 2px solid #000;
}

.campus-request__done p {
  margin: 0;
  font-size: 15px;
}

.button {
  display: inline-flex;
  align-items: center;
  min-height: 46px;
  padding: 10px 18px;
  border: 1px solid #000;
  background: #000;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
</style>
