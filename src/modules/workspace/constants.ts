import type { GroupBucketKey, GroupReviewStatus, GroupRole } from "@/modules/workspace/types/workspace.types";

export const GROUP_BUCKETS: GroupBucketKey[] = ["verified", "inProgress", "unverified"];

// 使用者與管理員共用同一組名稱
export const GROUP_BUCKET_LABELS: Record<GroupBucketKey, string> = {
  verified: "實作中",
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
