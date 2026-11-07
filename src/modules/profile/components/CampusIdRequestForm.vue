<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  currentCampusId?: string;
  submitting: boolean;
  serverError: string;
}>();
const emit = defineEmits<{ submit: [campusId: string] }>();

const campusId = ref("");
const error = ref("");

const handleSubmit = (): void => {
  const value = campusId.value.trim();

  if (!value) error.value = "請輸入學號 / 教職員編號";
  else if (value === props.currentCampusId) error.value = "新學號與目前相同";
  else error.value = "";

  if (error.value) return;
  emit("submit", value);
};
</script>

<template>
  <form class="form" novalidate @submit.prevent="handleSubmit">
    <p v-if="currentCampusId" class="form__current">
      目前學號 / 教職員編號：<strong>{{ currentCampusId }}</strong>
    </p>

    <label class="field">
      <span class="field__label">{{ currentCampusId ? "新學號 / 教職員編號" : "學號 / 教職員編號" }} <em>*</em></span>
      <input
        v-model="campusId"
        type="text"
        placeholder="輸入學號或教職員編號"
        :class="{ 'field__input--error': error }"
        @input="error = ''"
      />
      <span v-if="error" class="field__error">{{ error }}</span>
    </label>

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
  .form__actions {
    flex-direction: column-reverse;
  }
}
</style>
