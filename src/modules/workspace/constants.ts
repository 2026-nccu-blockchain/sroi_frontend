import type { GroupBucketKey, GroupReviewStatus } from "@/modules/workspace/types/workspace.types";

export const GROUP_BUCKETS: GroupBucketKey[] = ["verified", "inProgress", "unverified"];

// 使用者與管理員共用同一組名稱
export const GROUP_BUCKET_LABELS: Record<GroupBucketKey, string> = {
  verified: "實作中",
  inProgress: "申請中",
  unverified: "不同意"
};

export const STATUS_TO_BUCKET: Record<GroupReviewStatus, GroupBucketKey> = {
  verified: "verified",
  in_progress: "inProgress",
  unverified: "unverified"
};
