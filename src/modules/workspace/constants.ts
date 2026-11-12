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
  "30008": "必填欄位不能清空"
};

export const toProjectErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof ApiError && err.statusCode && PROJECT_ERROR_MESSAGES[err.statusCode]) {
    return PROJECT_ERROR_MESSAGES[err.statusCode];
  }
  return err instanceof Error ? toErrorMessage(err) : fallback;
};

export const PROJECT_PHASES: ProjectPhase[] = ["not_started", "in_progress", "pending_close", "closed"];
export const PROJECT_PHASE_TABS: ProjectPhaseTab[] = ["all", ...PROJECT_PHASES];

export const PROJECT_PHASE_TAB_LABELS: Record<ProjectPhaseTab, string> = {
  all: "所有專案",
  not_started: "未開始",
  in_progress: "進行中",
  pending_close: "待結案",
  closed: "已結案"
};

export const PROJECT_PHASE_LABELS: Record<ProjectPhase, string> = {
  not_started: "未開始",
  in_progress: "進行中",
  pending_close: "待結案",
  closed: "已結案"
};

// 依目前時間與專案期間判斷狀態；begin / end 帶時區，直接比較時間點即可
// TODO: 已結案的判斷條件之後再補
export const getProjectPhase = (
  project: Pick<WorkspaceProject, "begin" | "end">,
  now: Date = new Date()
): ProjectPhase => {
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
