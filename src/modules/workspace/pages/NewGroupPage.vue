<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import { newGroup } from "@/modules/workspace/api/workspace.api";
import GroupForm from "@/modules/workspace/components/GroupForm.vue";
import type { GroupPayload } from "@/modules/workspace/types/workspace.types";
import { toErrorMessage } from "@/shared/api/error-handler";
import { ApiError } from "@/shared/api/error-handler";

const router = useRouter();
const submitting = ref(false);
const error = ref("");
const NEW_GROUP_ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者",
  "10008": "權限不足"
};

const handleSubmit = async (payload: GroupPayload): Promise<void> => {
  submitting.value = true;
  error.value = "";

  try {
    await newGroup(payload);
    await router.push("/workspace/groups");
  } catch (err) {
    if (err instanceof ApiError && err.statusCode && NEW_GROUP_ERROR_MESSAGES[err.statusCode]) {
      error.value = NEW_GROUP_ERROR_MESSAGES[err.statusCode];
    } else {
      error.value = toErrorMessage(err);
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <GroupForm :submitting="submitting" :server-error="error" @submit="handleSubmit" />
</template>
