<script setup lang="ts">
import { ref, watch } from "vue";

import BaseModal from "@/shared/components/BaseModal.vue";
import { formatFileSize } from "@/shared/utils/format";

const props = defineProps<{
  open: boolean;
  // 上傳給誰：由頁面上的下拉選單決定
  stakeholderName: string;
  uploading: boolean;
}>();

const emit = defineEmits<{
  upload: [file: File];
  close: [];
}>();

const file = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// 每次打開都重新開始
watch(() => props.open, (open) => {
  if (!open) return;
  file.value = null;
  if (fileInput.value) fileInput.value.value = "";
});

const pickFile = (event: Event): void => {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null;
};

const submit = (): void => {
  if (file.value) emit("upload", file.value);
};
</script>

<template>
  <BaseModal :open="open">
    <form class="upload-dialog" role="dialog" aria-modal="true" aria-label="上傳訪綱" @submit.prevent="submit">
      <header class="upload-dialog__header">
        <h2>上傳訪綱</h2>
        <button class="close-button" type="button" aria-label="關閉" :disabled="uploading" @click="emit('close')">✕</button>
      </header>

      <p class="upload-dialog__target">上傳給<strong>{{ stakeholderName }}</strong></p>

      <label class="file-picker" :class="{ 'file-picker--busy': uploading }">
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          :disabled="uploading"
          @change="pickFile"
        />
        <strong>{{ file ? file.name : "＋ 選擇檔案" }}</strong>
        <span>{{ file ? formatFileSize(file.size) : "支援 PDF、DOC、DOCX，單一檔案上限 10 MB" }}</span>
      </label>

      <p class="upload-dialog__hint">上傳後按「儲存專案」才會正式存入。</p>

      <footer class="upload-dialog__footer">
        <button class="button" type="button" :disabled="uploading" @click="emit('close')">取消</button>
        <button class="button button--primary" type="submit" :disabled="uploading || !file">
          {{ uploading ? "上傳中…" : "上傳" }}
        </button>
      </footer>
    </form>
  </BaseModal>
</template>

<style scoped>
.upload-dialog { display: grid; gap: 18px; width: min(520px, calc(100vw - 72px)); color: #161616; }
.upload-dialog__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.upload-dialog__header h2 { margin: 0; font-size: 20px; }
.close-button { border: 0; padding: 4px 8px; background: transparent; font-size: 18px; cursor: pointer; }
.upload-dialog__target { margin: 0; font-size: 14px; }
.upload-dialog__target strong { margin-left: 8px; font-size: 16px; }
.file-picker { position: relative; display: grid; justify-items: center; gap: 7px; padding: 28px 16px; border: 1px dashed #a994b4; background: #faf7fc; color: #765292; text-align: center; cursor: pointer; }
.file-picker input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.file-picker strong { max-width: 100%; overflow-wrap: anywhere; font-size: 14px; }
.file-picker span { color: #817786; font-size: 14px; }
.file-picker--busy { cursor: wait; opacity: .6; }
.upload-dialog__hint { margin: 0; color: #777; font-size: 14px; }
.upload-dialog__footer { display: flex; justify-content: flex-end; gap: 10px; }
.button { min-height: 40px; border: 1px solid #000; padding: 8px 18px; background: #fff; color: #000; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.button--primary { background: #000; color: #fff; }
.button:disabled { cursor: not-allowed; opacity: .5; }
</style>
