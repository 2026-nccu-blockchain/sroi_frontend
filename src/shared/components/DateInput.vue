<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";

type Mode = "date" | "month";

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    type?: Mode;
    min?: string;
    max?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
  }>(),
  { modelValue: "", type: "date" }
);
const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [value: string];
}>();

const textRef = ref<HTMLInputElement>();
const pickerRef = ref<HTMLInputElement>();
const text = ref("");
// Firefox / Safari 桌面版不支援 type="month"，這時隱藏月曆按鈕，只保留鍵盤輸入
const pickerSupported = ref(true);

const pad = (n: number): string => String(n).padStart(2, "0");
const format = (value: string): string => value.replace(/-/g, "/");

// 使用者輸入 -> "YYYY-MM-DD" / "YYYY-MM"；不完整或無效時回傳 ""
const parse = (raw: string): string => {
  const input = raw.trim();
  if (!input) return "";
  const isDate = props.type === "date";
  let parts = input.split(/\D+/).filter(Boolean);

  // 允許連續數字：20261108 / 202611
  if (parts.length === 1 && parts[0].length === (isDate ? 8 : 6)) {
    const p = parts[0];
    parts = isDate ? [p.slice(0, 4), p.slice(4, 6), p.slice(6)] : [p.slice(0, 4), p.slice(4)];
  }
  if (parts.length !== (isDate ? 3 : 2) || parts[0].length !== 4) return "";

  const [year, month, day = 1] = parts.map(Number);
  if (month < 1 || month > 12) return "";
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > lastDay) return "";

  return isDate ? `${year}-${pad(month)}-${pad(day)}` : `${year}-${pad(month)}`;
};

const syncValidity = (): void => {
  const el = textRef.value;
  if (!el) return;
  const value = parse(text.value);
  let message = "";
  if (text.value.trim() && !value) {
    message = props.type === "date" ? "請輸入有效日期，例如 2026/01/31" : "請輸入有效年月，例如 2026/01";
  } else if (value && props.min && value < props.min) {
    message = `不可早於 ${format(props.min)}`;
  } else if (value && props.max && value > props.max) {
    message = `不可晚於 ${format(props.max)}`;
  }
  el.setCustomValidity(message);
};

// 外部值變動時同步文字（打字到一半時兩邊都是 ""，不會被清掉）
watch(
  () => props.modelValue ?? "",
  (value) => {
    if (value !== parse(text.value)) text.value = value ? format(value) : "";
    nextTick(syncValidity);
  },
  { immediate: true }
);
watch(() => [props.min, props.max], () => syncValidity());

onMounted(() => {
  pickerSupported.value = pickerRef.value?.type === props.type;
  syncValidity();
});

const onInput = (event: Event): void => {
  text.value = (event.target as HTMLInputElement).value;
  const value = parse(text.value);
  if (value !== (props.modelValue ?? "")) emit("update:modelValue", value);
  syncValidity();
};

// 離開欄位時把格式整理成 YYYY/MM/DD
const onCommit = (): void => {
  const value = parse(text.value);
  if (value) text.value = format(value);
  emit("change", value);
};

const openPicker = (): void => {
  const el = pickerRef.value;
  if (!el || props.disabled) return;
  el.value = parse(text.value);
  try {
    el.showPicker();
  } catch {
    el.focus();
    el.click();
  }
};

const onPick = (event: Event): void => {
  const value = (event.target as HTMLInputElement).value;
  text.value = value ? format(value) : "";
  emit("update:modelValue", value);
  emit("change", value);
  syncValidity();
  textRef.value?.focus();
};
</script>

<template>
  <span class="date-input">
    <input
      ref="textRef"
      class="date-input__text"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      :value="text"
      :required="required"
      :disabled="disabled"
      :placeholder="placeholder ?? (type === 'date' ? 'YYYY/MM/DD' : 'YYYY/MM')"
      @input="onInput"
      @change="onCommit"
    />
    <button
      v-if="pickerSupported"
      type="button"
      class="date-input__button"
      :disabled="disabled"
      aria-label="開啟月曆"
      @click="openPicker"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="1" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    </button>
    <input
      ref="pickerRef"
      class="date-input__picker"
      :type="type"
      :min="min"
      :max="max"
      tabindex="-1"
      aria-hidden="true"
      @change="onPick"
    />
  </span>
</template>

<style scoped>
.date-input {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
}

.date-input__text {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.date-input__button {
  display: grid;
  flex: none;
  place-items: center;
  padding: 2px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.6;
}

.date-input__button:hover:not(:disabled) {
  opacity: 1;
}

.date-input__button:disabled {
  cursor: not-allowed;
}

/* 隱藏但保持可渲染，showPicker 才能定位在右下角 */
.date-input__picker {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
