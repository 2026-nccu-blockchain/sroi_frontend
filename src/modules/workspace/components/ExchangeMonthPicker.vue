<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  month: string | null;
  disabled?: boolean;
}>();
const emit = defineEmits<{ select: [month: string | null] }>();

const parts = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Taipei", year: "numeric", month: "numeric", day: "numeric"
}).formatToParts();
const datePart = (name: "year" | "month" | "day") => Number(parts.find((part) => part.type === name)?.value);
const todayYear = datePart("year");
const todayMonth = datePart("month");
const lastDay = new Date(Date.UTC(todayYear, todayMonth, 0)).getUTCDate();
const previousMonthOffset = datePart("day") < lastDay ? 1 : 0;
const availableYear = todayMonth === previousMonthOffset ? todayYear - 1 : todayYear;
const availableMonth = todayMonth - previousMonthOffset || 12;
const selectedYear = computed(() => props.month ? Number(props.month.slice(0, 4)) : availableYear);
const displayedYear = ref(selectedYear.value);
const years = computed(() => {
  const earliest = Math.min(1948, selectedYear.value);
  return Array.from({ length: availableYear - earliest + 1 }, (_, i) => availableYear - i);
});

const dropdown = ref<HTMLDetailsElement>();
const trigger = ref<HTMLElement>();
const forMonth = (month: number) => `${displayedYear.value}-${String(month).padStart(2, "0")}`;
const displayMonth = computed(() => props.month?.replace("-", "/"));
const pickerLabel = computed(() => displayMonth.value
  ? `選擇匯率年月（目前為 ${displayMonth.value}）`
  : "選擇匯率年月");

function close(focusTrigger = false) {
  if (!dropdown.value?.open) return;
  dropdown.value.open = false;
  if (focusTrigger) trigger.value?.focus();
}

function syncYear() {
  if (dropdown.value?.open) displayedYear.value = selectedYear.value;
}

function onFocusOut(event: FocusEvent) {
  if (!dropdown.value?.contains(event.relatedTarget as Node | null)) close();
}

function selectMonth(month: string | null) {
  close(true);
  emit("select", month);
}
</script>

<template>
  <span v-if="disabled" class="month-readonly">匯率年月 · {{ displayMonth || "尚未選擇" }}</span>
  <details v-else ref="dropdown" class="month-picker" @toggle="syncYear" @focusout="onFocusOut" @keydown.esc.stop="close(true)">
    <summary ref="trigger" :aria-label="pickerLabel" :title="pickerLabel">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="1" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    </summary>
    <div class="month-picker__panel">
      <label class="month-picker__year">
        年份
        <select v-model.number="displayedYear">
          <option v-for="year in years" :key="year" :value="year">{{ year }} 年</option>
        </select>
      </label>
      <div class="month-picker__grid" role="group" aria-label="選擇月份">
        <button v-for="month in 12" :key="month" type="button"
          :disabled="displayedYear === availableYear && month > availableMonth"
          :aria-pressed="props.month === forMonth(month)"
          @click="selectMonth(forMonth(month))">{{ month }} 月</button>
      </div>
      <button v-if="props.month" type="button" class="month-picker__clear" @click="selectMonth(null)">清除年月</button>
    </div>
  </details>
</template>

<style scoped>
.month-picker { position: relative; width: fit-content; max-width: 100%; color: #111; font-size: 14px; }
.month-picker summary { display: grid; place-items: center; width: 40px; height: 40px; box-sizing: border-box; border: 1px solid #aaa; border-radius: 6px; background: #fff; cursor: pointer; list-style: none; }
.month-picker summary::-webkit-details-marker { display: none; }
.month-picker summary:hover, .month-picker[open] summary { border-color: #111; background: #f5f5f5; }
.month-picker__panel { position: absolute; z-index: 3; top: calc(100% + 6px); left: 0; width: min(244px, 72vw); box-sizing: border-box; display: grid; gap: 12px; padding: 12px; border: 1px solid #bbb; border-radius: 8px; background: #fff; box-shadow: 0 8px 25px #0002; }
.month-picker__year { display: flex; align-items: center; gap: 8px; }
.month-picker__year select { flex: 1; min-width: 0; padding: 5px; border: 1px solid #bbb; border-radius: 4px; background: #fff; color: inherit; font: inherit; }
.month-picker__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
.month-picker__grid button, .month-picker__clear { padding: 6px; border: 1px solid #ddd; border-radius: 4px; background: #fff; color: inherit; font: inherit; cursor: pointer; }
.month-picker__grid button:not(:disabled):hover { border-color: #555; }
.month-picker__grid button[aria-pressed="true"] { border-color: #111; color: #fff; background: #111; }
.month-picker__grid button:disabled { opacity: .4; cursor: not-allowed; }
.month-picker__clear { justify-self: start; }
.month-readonly { color: #555; font-size: 14px; }
</style>
