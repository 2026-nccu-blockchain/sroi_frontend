<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";

import { getIdCardImage } from "@/modules/admin/api/admin.api";
import { toAdminErrorMessage } from "@/modules/admin/constants";

const props = defineProps<{ filename: string; alt: string }>();

// 圖片需要帶 token，先抓成 blob 再轉成 object URL
const url = ref("");
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

    try {
      const blob = await getIdCardImage(filename);
      // 等待期間檔名可能已經換了
      if (filename === props.filename) url.value = URL.createObjectURL(blob);
    } catch (err) {
      error.value = toAdminErrorMessage(err);
    }
  },
  { immediate: true }
);

onBeforeUnmount(revoke);
</script>

<template>
  <a v-if="url" :href="url" target="_blank" rel="noopener" title="在新分頁開啟原圖">
    <img class="id-card" :src="url" :alt="alt" />
  </a>
  <p v-else-if="error" class="id-card__message id-card__message--error">圖片載入失敗：{{ error }}</p>
  <p v-else class="id-card__message">圖片載入中...</p>
</template>

<style scoped>
.id-card {
  display: block;
  max-width: 100%;
  max-height: 420px;
  border: 1px solid #000;
  object-fit: contain;
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
