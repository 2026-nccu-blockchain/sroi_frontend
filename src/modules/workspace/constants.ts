import type { GroupBucketKey, GroupReviewStatus, GroupRole } from "@/modules/workspace/types/workspace.types";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

export const GROUP_BUCKETS: GroupBucketKey[] = ["verified", "inProgress", "unverified"];

// 使用者與管理員共用同一組名稱
export const GROUP_BUCKET_LABELS: Record<GroupBucketKey, string> = {
  verified: "進行中",
  inProgress: "申請中",
  unverified: "不同意"
};

export const GROUP_ROLES: GroupRole[] = ["leader", "editor", "viewer"];

export const GROUP_ROLE_LABELS: Record<GroupRole, string> = {
  leader: "組長",
  editor: "編輯者",
  viewer: "檢視者"
};

export const STATUS_TO_BUCKET: Record<GroupReviewStatus, GroupBucketKey> = {
  verified: "verified",
  in_progress: "inProgress",
  unverified: "unverified"
};

const PROJECT_ERROR_MESSAGES: Record<string, string> = {
  "30001": "找不到專案，或你不是這個專案所屬群組的成員",
  "30007": "權限不足：檢視者只能查看，刪除專案需要組長",
  "30008": "必填欄位不能清空"
};

export const toProjectErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof ApiError && err.statusCode && PROJECT_ERROR_MESSAGES[err.statusCode]) {
    return PROJECT_ERROR_MESSAGES[err.statusCode];
  }
  return err instanceof Error ? toErrorMessage(err) : fallback;
};
