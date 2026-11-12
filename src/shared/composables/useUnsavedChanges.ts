import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import { useRouter } from "vue-router";

// 目前頁面的離開確認，給登出這種要先確認、再做其他事的動作使用
let activeConfirm: (() => Promise<boolean>) | null = null;

export const confirmLeaveCurrentPage = (): Promise<boolean> => activeConfirm?.() ?? Promise.resolve(true);

/**
 * 有未儲存的修改時：站內換頁跳出確認彈窗，重新整理或關閉分頁跳出瀏覽器內建提醒。
 * 頁面要自己放一個 ConfirmDialog，綁定回傳的 leaveDialogOpen / answerLeave。
 */
export const useUnsavedChanges = (isDirty: Ref<boolean>) => {
  const router = useRouter();
  const leaveDialogOpen = ref(false);
  let resolveLeave: ((leave: boolean) => void) | null = null;
  // 已在別處確認放棄修改，接下來的換頁不用再問一次
  let discarded = false;

  const askLeave = (): Promise<boolean> => new Promise((resolve) => {
    resolveLeave = resolve;
    leaveDialogOpen.value = true;
  });

  const answerLeave = (leave: boolean): void => {
    leaveDialogOpen.value = false;
    resolveLeave?.(leave);
    resolveLeave = null;
  };

  const confirm = async (): Promise<boolean> => {
    if (!isDirty.value || discarded) return true;
    discarded = await askLeave();
    return discarded;
  };

  // 用 beforeEach 而不是 onBeforeRouteLeave：新增頁儲存後會換成編輯頁路由但沿用同一個元件
  const removeLeaveGuard = router.beforeEach((to, from) => {
    if (to.path === from.path) return true;
    return confirm();
  });

  // 重新整理或關閉分頁時瀏覽器不允許自訂彈窗，只能觸發內建的提醒
  const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!isDirty.value || discarded) return;
    event.preventDefault();
    event.returnValue = "";
  };

  onMounted(() => {
    window.addEventListener("beforeunload", warnBeforeUnload);
    activeConfirm = confirm;
  });

  onBeforeUnmount(() => {
    removeLeaveGuard();
    window.removeEventListener("beforeunload", warnBeforeUnload);
    if (activeConfirm === confirm) activeConfirm = null;
  });

  return { leaveDialogOpen, answerLeave };
};
