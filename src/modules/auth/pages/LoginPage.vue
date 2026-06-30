<script setup lang="ts">
import { useRouter } from "vue-router";

import LoginForm from "@/modules/auth/components/LoginForm.vue";
import { useAuth } from "@/modules/auth/composables/useAuth";
import type { LoginPayload } from "@/modules/auth/types/auth.types";

const router = useRouter();
const { login } = useAuth();

const handleSubmit = async (payload: LoginPayload): Promise<void> => {
  await login(payload);
  await router.push("/");
};
</script>

<template>
  <LoginForm @submit="handleSubmit" />
</template>
