import { computed, type WritableComputedRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { GROUP_BUCKETS } from "@/modules/workspace/constants";
import type { GroupBucketKey } from "@/modules/workspace/types/workspace.types";

const isBucket = (value: unknown): value is GroupBucketKey =>
  typeof value === "string" && (GROUP_BUCKETS as string[]).includes(value);

// 分頁存在網址的 ?tab=，從詳細頁返回時會回到原本的分頁
export const useGroupTab = (): WritableComputedRef<GroupBucketKey> => {
  const route = useRoute();
  const router = useRouter();

  return computed({
    get: () => (isBucket(route.query.tab) ? route.query.tab : "verified"),
    set: (tab) => router.replace({ query: { ...route.query, tab } })
  });
};
