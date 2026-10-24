import { ref } from "vue";

import { getGroupRole, getGroups } from "@/modules/workspace/api/workspace.api";
import type { Group, GroupRole } from "@/modules/workspace/types/workspace.types";

// 群組專案只會掛在已通過審核的群組底下
export const useVerifiedGroups = () => {
  const groups = ref<Group[]>([]);

  const load = async (): Promise<Group[]> => {
    groups.value = (await getGroups()).verified_groups;
    return groups.value;
  };

  const titleOf = (groupId: string | null): string =>
    groups.value.find((group) => group.group_id === groupId)?.title ?? "群組";

  // 可以建立專案的群組：自己是組長或編輯者
  const loadCreatable = async (): Promise<Group[]> => {
    const all = await load();
    const roles = await Promise.all(
      all.map((group) =>
        getGroupRole(group.group_id)
          .then((res): GroupRole | null => res.group_role ?? null)
          .catch(() => null)
      )
    );
    return all.filter((_, index) => roles[index] === "leader" || roles[index] === "editor");
  };

  return { groups, load, loadCreatable, titleOf };
};
