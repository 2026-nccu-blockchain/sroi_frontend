<script setup lang="ts">
import { reactive } from "vue";

import type { GroupPayload } from "@/modules/workspace/types/workspace.types";

defineProps<{ submitting: boolean; serverError: string }>();
const emit = defineEmits<{ submit: [payload: GroupPayload] }>();

type Field = "title" | "desc" | "begin" | "end";

const form = reactive<Record<Field, string>>({ title: "", desc: "", begin: "", end: "" });
const errors = reactive<Record<Field, string>>({ title: "", desc: "", begin: "", end: "" });

const validate = (): boolean => {
  errors.title = form.title.trim() ? "" : "請輸入群組名稱";
  errors.desc = form.desc.trim() ? "" : "請輸入群組描述";
  errors.begin = form.begin ? "" : "請選擇開始日期";

  if (!form.end) errors.end = "請選擇結束日期";
  else if (form.begin && form.end < form.begin) errors.end = "結束日期不可早於開始日期";
  else errors.end = "";

  return Object.values(errors).every((message) => !message);
};

// 點擊輸入框任何位置都跳出月曆
const openPicker = (event: MouseEvent): void => {
  try {
    (event.currentTarget as HTMLInputElement).showPicker();
  } catch {
    // 不支援 showPicker 的瀏覽器仍可點右側月曆圖示
  }
};

const toDateTime = (date: string): string => `${date}T00:00:00`;

const handleSubmit = (): void => {
  if (!validate()) return;
  emit("submit", {
    title: form.title.trim(),
    desc: form.desc.trim(),
    begin: toDateTime(form.begin),
    end: toDateTime(form.end)
  });
};
</script>

<template>
  <section class="group-form">
    <RouterLink class="back-link" to="/workspace/groups" aria-label="返回我的群組">
      <span aria-hidden="true">←</span> 返回
    </RouterLink>

    <section class="layout">
      <div>
        <p class="group-form__eyebrow">我的群組</p>
        <h1>新增群組</h1>
      </div>

      <form class="form" novalidate @submit.prevent="handleSubmit">
        <label class="field">
          <span class="field__label">群組名稱 <em>*</em></span>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="輸入群組名稱"
            :class="{ 'field__input--error': errors.title }"
            @input="errors.title = ''"
          />
          <span v-if="errors.title" class="field__error">{{ errors.title }}</span>
        </label>

        <label class="field">
          <span class="field__label">群組描述 <em>*</em></span>
          <textarea
            v-model="form.desc"
            rows="5"
            required
            placeholder="簡述群組的目的與內容"
            :class="{ 'field__input--error': errors.desc }"
            @input="errors.desc = ''"
          />
          <span v-if="errors.desc" class="field__error">{{ errors.desc }}</span>
        </label>

        <div class="form__row">
          <label class="field">
            <span class="field__label">開始日期 <em>*</em></span>
            <input
              v-model="form.begin"
              type="date"
              required
              :max="form.end || undefined"
              :class="{ 'field__input--error': errors.begin }"
              @click="openPicker"
              @change="errors.begin = ''"
            />
            <span v-if="errors.begin" class="field__error">{{ errors.begin }}</span>
          </label>

          <label class="field">
            <span class="field__label">結束日期 <em>*</em></span>
            <input
              v-model="form.end"
              type="date"
              required
              :min="form.begin || undefined"
              :class="{ 'field__input--error': errors.end }"
              @click="openPicker"
              @change="errors.end = ''"
            />
            <span v-if="errors.end" class="field__error">{{ errors.end }}</span>
          </label>
        </div>

        <p v-if="serverError" class="form__server-error" role="alert">{{ serverError }}</p>

        <div class="form__actions">
          <RouterLink class="button" to="/workspace/groups">取消</RouterLink>
          <button class="button button--primary" type="submit" :disabled="submitting">
            {{ submitting ? "建立中..." : "建立群組" }}
          </button>
        </div>
      </form>
    </section>
  </section>
</template>

<style scoped>
.group-form {
  display: grid;
  gap: 22px;
  max-width: 960px;
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

.group-form__eyebrow {
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

.layout {
  padding: 0 120px;
}

.form {
  display: grid;
  gap: 24px;
  padding-top: 24px;
  border-top: 2px solid #000;
}

.form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
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

.field input,
.field textarea {
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

.field textarea {
  resize: vertical;
}

.field input:focus,
.field textarea:focus {
  box-shadow: inset 0 0 0 1px #000;
}

.field input[type="date"] {
  cursor: pointer;
}

.field .field__input--error {
  border-color: #c00;
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
  .form__row {
    grid-template-columns: 1fr;
  }

  .form__actions {
    flex-direction: column-reverse;
  }
}
</style>
