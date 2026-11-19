import type {
  GroupBucketKey,
  GroupReviewStatus,
  GroupRole,
  ProjectPhase,
  ProjectPhaseTab,
  WorkspaceProject
} from "@/modules/workspace/types/workspace.types";
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
  "30008": "必填欄位不能清空",
  "30014": "專案已結案，無法再修改",
  "30015": "專案期間尚未結束，還不能結案",
  "30016": "專案結案後才能發布至資料庫",
  "30017": "專案已發布至資料庫",
  "30018": "專案已送出，正在審核中",
  "30019": "只有資料庫編輯者或管理員能審核專案",
  "30020": "專案不在審核中，可能已被其他人審核"
};

export const toProjectErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof ApiError && err.statusCode && PROJECT_ERROR_MESSAGES[err.statusCode]) {
    return PROJECT_ERROR_MESSAGES[err.statusCode];
  }
  return err instanceof Error ? toErrorMessage(err) : fallback;
};

export const PROJECT_PHASES: ProjectPhase[] = ["not_started", "in_progress", "pending_close", "closed", "reviewing", "published"];
export const PROJECT_PHASE_TABS: ProjectPhaseTab[] = ["all", ...PROJECT_PHASES];

export const PROJECT_PHASE_TAB_LABELS: Record<ProjectPhaseTab, string> = {
  all: "所有專案",
  not_started: "未開始",
  in_progress: "進行中",
  pending_close: "待結案",
  closed: "已結案",
  reviewing: "審核中",
  published: "已發布"
};

export const PROJECT_PHASE_LABELS: Record<ProjectPhase, string> = {
  not_started: "未開始",
  in_progress: "進行中",
  pending_close: "待結案",
  closed: "已結案",
  reviewing: "審核中",
  published: "已發布"
};

// 審核中、已發布一定已結案；內容都不能再修改
export const isProjectClosed = (project: Pick<WorkspaceProject, "closed_at">): boolean => Boolean(project.closed_at);

// 已發布、審核中、已結案以 published_at / review_requested_at / closed_at 為準；其餘依目前時間與專案期間判斷，begin / end 帶時區，直接比較時間點即可
export const getProjectPhase = (
  project: Pick<WorkspaceProject, "begin" | "end" | "closed_at" | "published_at" | "review_requested_at">,
  now: Date = new Date()
): ProjectPhase => {
  if (project.published_at) return "published";
  if (project.closed_at && project.review_requested_at) return "reviewing";
  if (project.closed_at) return "closed";
  const current = now.getTime();
  if (current < new Date(project.begin).getTime()) return "not_started";
  if (current <= new Date(project.end).getTime()) return "in_progress";
  return "pending_close";
};

// 利害關係人的關係（影響力／參與度）與類型；選「其他」時改存自訂文字
export const STAKEHOLDER_OTHER = "其他";

export const STAKEHOLDER_RELATIONS = [
  "高影響、高參與",
  "高影響、低參與",
  "低影響、高參與",
  "低影響、低參與",
  STAKEHOLDER_OTHER
];

export const STAKEHOLDER_TYPES = [
  "直接受益者",
  "間接受益者",
  "執行者/投入者",
  "資源提供者/合作夥伴",
  STAKEHOLDER_OTHER
];
