<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";

import { getIdCardImage } from "@/modules/admin/api/admin.api";
import { toAdminErrorMessage } from "@/modules/admin/constants";

const props = defineProps<{ filename: string; alt: string }>();

// 檔案需要帶 token，先抓成 blob 再轉成 object URL
const url = ref("");
const isPdf = ref(false);
const error = ref("");

const revoke = (): void => {
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = "";
};

watch(
  () => props.filename,
  async (filename) => {
    revoke();
    error.value = "";
    isPdf.value = false;

    try {
      const blob = await getIdCardImage(filename);
      // 等待期間檔名可能已經換了
      if (filename !== props.filename) return;
      // 依照後端回傳的 Content-Type 判斷；HEIC / HEIF 後端已經轉成 JPG
      isPdf.value = blob.type === "application/pdf";
      url.value = URL.createObjectURL(blob);
    } catch (err) {
      error.value = toAdminErrorMessage(err);
    }
  },
  { immediate: true }
);

onBeforeUnmount(revoke);
</script>

<template>
  <a v-if="url && isPdf" class="id-card__file" :href="url" target="_blank" rel="noopener" title="在新視窗開啟 PDF">
    <span class="id-card__badge">PDF</span>
    {{ filename }}
  </a>
  <a v-else-if="url" :href="url" target="_blank" rel="noopener" title="在新分頁開啟原圖">
    <img class="id-card" :src="url" :alt="alt" />
  </a>
  <p v-else-if="error" class="id-card__message id-card__message--error">檔案載入失敗：{{ error }}</p>
  <p v-else class="id-card__message">檔案載入中...</p>
</template>

<style scoped>
.id-card {
  display: block;
  max-width: 100%;
  max-height: 420px;
  border: 1px solid #000;
  object-fit: contain;
}

.id-card__file {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  justify-self: start;
  padding: 12px 16px;
  border: 1px solid #000;
  color: #000;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  word-break: break-all;
}

.id-card__file:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.id-card__badge {
  padding: 2px 6px;
  background: #c00;
  color: #fff;
  font-size: 11px;
  letter-spacing: 0.08em;
}

.id-card__message {
  margin: 0;
  color: #777;
  font-size: 13px;
}

.id-card__message--error {
  color: #c00;
}
</style>
