<script setup lang="ts">
import { computed, ref } from "vue";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import { changeCampusId, requestVerification, uploadImage } from "@/modules/profile/api/profile.api";
import CampusIdRequestForm from "@/modules/profile/components/CampusIdRequestForm.vue";
import type { CampusIdRequestMode } from "@/modules/profile/types/profile.types";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

const props = defineProps<{ mode: CampusIdRequestMode }>();

const ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者",
  "10008": "權限不足",
  "10011": "帳號已驗證，或已送出驗證申請",
  "10012": "此學號已被其他帳號使用",
  "10018": "上傳的檔案不是圖片（僅支援 JPG、PNG、WebP）",
  "10019": "圖片超過 5MB",
  "10020": "證件照片無效，請重新上傳"
};

const COPY: Record<CampusIdRequestMode, { title: string; description: string; done: string }> = {
  verify: {
    title: "驗證帳號",
    description: "請輸入學號 / 教職員編號並上傳學生證或教職員證照片，送出後由管理員審核。",
    done: "已送出驗證申請，審核期間帳號狀態會顯示為「驗證中」。"
  },
  change: {
    title: "變更學號",
    description: "請輸入新的學號 / 教職員編號並上傳證件照片，審核通過前仍使用目前的學號。",
    done: "已送出變更申請，待管理員審核。"
  }
};

const authStore = useAuthStore();
const copy = computed(() => COPY[props.mode]);
const submitting = ref(false);
const error = ref("");
const done = ref(false);

const handleSubmit = async ({ campusId, file }: { campusId: string; file: File }): Promise<void> => {
  submitting.value = true;
  error.value = "";

  try {
    // 先上傳照片拿到 id_card_link，再送申請
    const { id_card_link } = await uploadImage(file);
    const payload = { campus_id: campusId, id_card_link };

    if (props.mode === "verify") {
      await requestVerification(payload);
      // 角色會變成 in_progress，更新後個人頁面才會正確
      await authStore.fetchProfile();
    } else {
      await changeCampusId(payload);
    }
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
      <h1>{{ copy.title }}</h1>
      <p class="campus-request__description">{{ copy.description }}</p>
    </div>

    <div v-if="done" class="campus-request__done" role="status">
      <p>{{ copy.done }}</p>
      <RouterLink class="button" :to="{ name: 'profile' }">返回個人資料</RouterLink>
    </div>

    <CampusIdRequestForm
      v-else
      :mode="mode"
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
