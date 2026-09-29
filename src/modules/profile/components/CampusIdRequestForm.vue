<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from "vue";

import {
  ID_CARD_ACCEPT,
  ID_CARD_FORMAT_LABEL,
  ID_CARD_MAX_SIZE,
  ID_CARD_MAX_SIZE_LABEL,
  isAllowedIdCardFile
} from "@/modules/profile/constants";
import type { CampusIdRequestMode } from "@/modules/profile/types/profile.types";

const props = defineProps<{
  mode: CampusIdRequestMode;
  currentCampusId?: string;
  submitting: boolean;
  serverError: string;
}>();
const emit = defineEmits<{ submit: [payload: { campusId: string; file: File }] }>();

const campusId = ref("");
const file = ref<File | null>(null);
const previewUrl = ref("");
const errors = reactive({ campusId: "", file: "" });

// 瀏覽器能直接預覽的格式；HEIC / HEIF 只顯示檔名
const PREVIEWABLE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const isPdf = computed(() => file.value?.type === "application/pdf");

const setPreview = (next: File | null): void => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = next && PREVIEWABLE_TYPES.includes(next.type) ? URL.createObjectURL(next) : "";
};

onBeforeUnmount(() => setPreview(null));

// 先在前端擋掉後端一定會拒絕的檔案（格式、2MB）
const handleFileChange = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  const selected = input.files?.[0] ?? null;

  let fileError = "";
  if (selected && !isAllowedIdCardFile(selected)) fileError = `僅支援 ${ID_CARD_FORMAT_LABEL}`;
  else if (selected && selected.size > ID_CARD_MAX_SIZE) fileError = `檔案不可超過 ${ID_CARD_MAX_SIZE_LABEL}`;

  if (fileError) input.value = "";
  errors.file = fileError;
  file.value = fileError ? null : selected;
  setPreview(file.value);
};

const handleSubmit = (): void => {
  const value = campusId.value.trim();

  if (!value) errors.campusId = "請輸入學號 / 教職員編號";
  else if (props.mode === "change" && value === props.currentCampusId) errors.campusId = "新學號與目前相同";
  else errors.campusId = "";

  if (!file.value && !errors.file) errors.file = "請上傳證件照片";

  if (errors.campusId || errors.file || !file.value) return;
  emit("submit", { campusId: value, file: file.value });
};
</script>

<template>
  <form class="form" novalidate @submit.prevent="handleSubmit">
    <p v-if="mode === 'change' && currentCampusId" class="form__current">
      目前學號 / 教職員編號：<strong>{{ currentCampusId }}</strong>
    </p>

    <label class="field">
      <span class="field__label">{{ mode === "change" ? "新學號 / 教職員編號" : "學號 / 教職員編號" }} <em>*</em></span>
      <input
        v-model="campusId"
        type="text"
        placeholder="輸入學號或教職員編號"
        :class="{ 'field__input--error': errors.campusId }"
        @input="errors.campusId = ''"
      />
      <span v-if="errors.campusId" class="field__error">{{ errors.campusId }}</span>
    </label>

    <div class="field">
      <span class="field__label">證件照片 <em>*</em></span>
      <label class="upload" :class="{ 'field__input--error': errors.file }">
        <img v-if="previewUrl && !isPdf" :src="previewUrl" alt="證件照片預覽" class="upload__preview" />
        <span v-else-if="file" class="upload__file">
          <!-- 連結放在 label 裡，點它只會開 PDF，不會跳出選檔視窗 -->
          <a v-if="isPdf && previewUrl" :href="previewUrl" target="_blank" rel="noopener" class="upload__file-link">
            {{ file.name }}
          </a>
          <strong v-else>{{ file.name }}</strong>
          <small>{{ isPdf ? "點檔名可在新視窗查看 PDF 內容" : "此格式無法預覽，送出後會自動轉成 JPG" }}</small>
        </span>
        <span v-else class="upload__placeholder">點擊選擇學生證或教職員證照片</span>
        <input type="file" :accept="ID_CARD_ACCEPT" class="upload__input" @change="handleFileChange" />
      </label>
      <span v-if="errors.file" class="field__error">{{ errors.file }}</span>
      <span v-else class="field__hint">支援 {{ ID_CARD_FORMAT_LABEL }}，檔案大小 {{ ID_CARD_MAX_SIZE_LABEL }} 以內</span>
    </div>

    <p v-if="serverError" class="form__server-error" role="alert">{{ serverError }}</p>

    <div class="form__actions">
      <RouterLink class="button" :to="{ name: 'profile' }">取消</RouterLink>
      <button class="button button--primary" type="submit" :disabled="submitting">
        {{ submitting ? "送出中..." : "送出審核" }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.form {
  display: grid;
  gap: 24px;
  padding-top: 24px;
  border-top: 2px solid #000;
}

.form__current {
  margin: 0;
  font-size: 14px;
}

.field {
  display: grid;
  gap: 8px;
}

.field__label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.field__label em {
  color: #c00;
  font-style: normal;
}

.field input[type="text"] {
  width: 100%;
  border: 1px solid #000;
  border-radius: 0;
  padding: 12px 14px;
  background: #fff;
  color: #000;
  font: inherit;
  font-size: 15px;
  outline: none;
}

.field input[type="text"]:focus {
  box-shadow: inset 0 0 0 1px #000;
}

.upload {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 180px;
  padding: 12px;
  border: 1px dashed #000;
  cursor: pointer;
}

.upload:hover {
  background: #f5f5f5;
}

.upload__preview {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.upload__file {
  display: grid;
  gap: 6px;
  text-align: center;
  font-size: 14px;
  word-break: break-all;
}

.upload__file-link {
  color: #000;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.upload__file small {
  color: #777;
  font-size: 12px;
}

.upload__placeholder {
  color: #777;
  font-size: 13px;
}

.upload__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.field .field__input--error {
  border-color: #c00;
}

.field__hint {
  color: #777;
  font-size: 12px;
}

.field__error,
.form__server-error {
  margin: 0;
  color: #c00;
  font-size: 12px;
}

.form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 10px 18px;
  border: 1px solid #000;
  background: #fff;
  color: #000;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.button--primary {
  background: #000;
  color: #fff;
}

.button--primary:hover:not(:disabled) {
  background: #fff;
  color: #000;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 560px) {
  .form__actions {
    flex-direction: column-reverse;
  }
}
</style>
