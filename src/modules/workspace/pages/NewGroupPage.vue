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
  <section class="new-group">
    <RouterLink class="back-link" to="/workspace/groups" aria-label="返回我的群組">
      <span aria-hidden="true">←</span> 返回
    </RouterLink>

    <section class="layout">
      <div>
        <p class="new-group__eyebrow">我的群組</p>
        <h1>新增群組</h1>
      </div>

      <GroupForm :submitting="submitting" :server-error="error" cancel-to="/workspace/groups" @submit="handleSubmit" />
    </section>
  </section>
</template>

<style scoped>
.new-group {
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

.new-group__eyebrow {
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
</style>
