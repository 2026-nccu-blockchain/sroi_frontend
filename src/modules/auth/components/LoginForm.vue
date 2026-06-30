<script setup lang="ts">
import { reactive } from "vue";

import type { LoginPayload } from "@/modules/auth/types/auth.types";

const emit = defineEmits<{
  submit: [payload: LoginPayload];
}>();

const form = reactive<LoginPayload>({
  email: "",
  password: ""
});

const onSubmit = (): void => {
  emit("submit", { ...form });
};
</script>

<template>
  <form class="login-form" @submit.prevent="onSubmit">
    <h2>Login</h2>
    <input v-model="form.email" type="email" placeholder="Email" required />
    <input v-model="form.password" type="password" placeholder="Password" required />
    <button type="submit">Sign In</button>
  </form>
</template>

<style scoped>
.login-form {
  display: grid;
  gap: 12px;
  width: 300px;
  padding: 20px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(17, 24, 39, 0.08);
}

input,
button {
  padding: 10px;
}
</style>
