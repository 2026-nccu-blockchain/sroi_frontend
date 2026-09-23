<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import { newGroup } from "@/modules/workspace/api/workspace.api";
import GroupForm from "@/modules/workspace/components/GroupForm.vue";
import type { GroupPayload } from "@/modules/workspace/types/workspace.types";
import { toErrorMessage } from "@/shared/api/error-handler";

const router = useRouter();
const submitting = ref(false);
const error = ref("");

const handleSubmit = async (payload: GroupPayload): Promise<void> => {
  submitting.value = true;
  error.value = "";

  try {
    await newGroup(payload);
    await router.push("/workspace/groups");
  } catch (err) {
    error.value = toErrorMessage(err);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <GroupForm :submitting="submitting" :server-error="error" @submit="handleSubmit" />
</template>
