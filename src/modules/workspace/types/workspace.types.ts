import type { ApiEnvelope } from "@/shared/api/http";

export type ProjectStatus = "draft" | "published";

export interface ProjectStakeholder {
  stakeholder_id?: string;
  name: string;
  // 關係、類型：選「其他」時是自訂文字
  relation: string;
  stakeholder_type: string;
  notes: string;
  pre_form_id?: string | null;
  post_form_id?: string | null;
  position?: number;
}

export interface ProjectOutcome {
  outcome_id?: string;
  // 所屬利害關係人；舊資料可能沒有
  stakeholder_id?: string | null;
  name: string;
  position?: number;
}

export interface ProjectCost {
  cost_id: string;
  stakeholder_id?: string | null;
  name: string;
  // 單價，小計 = price × quantity
  price: number;
  quantity: number;
  funding_source: string;
  position: number;
  create_time?: string | null;
  update_time?: string | null;
}

export interface ProjectCostPayload {
  // 沒帶就是新增
  cost_id?: string;
  name: string;
  price: number;
  quantity: number;
  funding_source: string;
}

// 編輯頁上尚未儲存的利害關係人（含他的成果與成本）
// key：已儲存的用後端 id，新增的用 new-n，讓尚未儲存的項目也能互相對應
export interface StakeholderDraft {
  key: string;
  stakeholder_id?: string;
  name: string;
  relation: string;
  stakeholder_type: string;
  notes: string;
  pre_form_id: string | null;
  post_form_id: string | null;
  outcomes: Array<Pick<ProjectOutcome, "outcome_id" | "name">>;
  costs: Array<ProjectCostPayload & { key: string }>;
}

export interface ProjectCostsResponse {
  project_id: string;
  costs: ProjectCost[];
  total_cost: number;
}

export interface ProjectInterviewFile {
  file_id: string;
  stakeholder_id: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  create_time: string | null;
}

// 上傳到暫存資料夾的訪綱，儲存專案前不會寫入資料庫
export interface TempInterviewFile {
  temp_file_id: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
}

export interface LinkedProjectForm {
  form_id: string;
  title?: string | null;
  status: "draft" | "published" | "closed";
}

// 依專案期間計算的進度狀態；closed 之後再接上結案邏輯
export type ProjectPhase = "not_started" | "in_progress" | "pending_close" | "closed";
export type ProjectPhaseTab = ProjectPhase | "all";

export interface WorkspaceProject {
  project_id: string;
  // 個人專案只有 owner_id，群組專案只有 group_id
  owner_id: string | null;
  group_id: string | null;
  created_by: string;
  my_role?: GroupRole | null;
  name: string;
  organization: string;
  description: string;
  actual_input_cost: number;
  begin: string;
  end: string;
  status: ProjectStatus;
  forms: LinkedProjectForm[];
  stakeholders: ProjectStakeholder[];
  outcomes: ProjectOutcome[];
  costs: ProjectCost[];
  interview_files: ProjectInterviewFile[];
  create_time?: string | null;
  update_time?: string | null;
}

export interface ProjectPayload {
  name: string;
  organization: string;
  description: string;
  begin: string;
  end: string;
  status: ProjectStatus;
  // 成果與成本放在各利害關係人底下
  stakeholders: Array<Omit<ProjectStakeholder, "position"> & {
    outcomes?: Array<Pick<ProjectOutcome, "outcome_id" | "name">>;
    costs?: ProjectCostPayload[];
    // 只有更新時會帶：要保留的已儲存訪綱，以及這次要存入的暫存訪綱
    interview_file_ids?: string[];
    temp_file_ids?: string[];
  }>;
}

export interface OutcomeValuation {
  outcome_id: string;
  outcome_name: string;
  position: number;
  quantity: number;
  financial_proxy_id: string | null;
  financial_proxy_name: string | null;
  financial_proxy_note: string | null;
  financial_proxy_value: number;
  deadweight_rate: number;
  attribution_rate: number;
  displacement_rate: number;
  duration_years: number;
  dropoff_rate: number;
  is_included: boolean;
  scale_score: number | null;
  scale_answer_count: number;
  suggested_eligible: boolean | null;
  calculated_value: number;
}

export interface StakeholderSROI {
  project_id: string;
  project_name: string;
  stakeholder_id: string;
  stakeholder_name: string;
  stakeholder_role: string;
  position: number;
  input_cost: number;
  discount_rate: number;
  outcomes: OutcomeValuation[];
  total_social_value: number;
  sroi_ratio: number | null;
}

export interface StakeholderSROIPayload {
  discount_rate: number;
  outcomes: Array<Pick<OutcomeValuation,
    "outcome_id" | "quantity" | "financial_proxy_id" | "deadweight_rate" |
    "attribution_rate" | "displacement_rate" | "duration_years" | "dropoff_rate" |
    "is_included"
  >>;
}

// 只有建立時能指定專案位置，建立後不能在個人 / 群組之間移動
export interface ProjectCreatePayload extends ProjectPayload {
  // 不帶就是個人專案
  group_id?: string | null;
}

// 後端 Group.status 的值
export type GroupReviewStatus = "verified" | "in_progress" | "unverified";

export interface Group {
  group_id: string;
  title: string;
  desc: string;
  begin: string;
  end: string;
  // 只有不同意的群組會帶
  reason?: string;
  // 只有管理員的所有群組會帶
  creator?: GroupUser | null;
}

export interface GroupBuckets {
  verified: Group[];
  inProgress: Group[];
  unverified: Group[];
}

export type GroupBucketKey = keyof GroupBuckets;

export interface GroupListResponse extends ApiEnvelope {
  verified_groups: Group[];
  in_progress_groups: Group[];
  unverified_groups: Group[];
}

export interface GroupPayload {
  title: string;
  desc: string;
  begin: string; // "YYYY-MM-DDT00:00:00+08:00"
  end: string; // "YYYY-MM-DDT23:59:59+08:00"
}

export interface GroupUser {
  user_id: string;
  // 資料庫允許空值，舊帳號可能沒有學號
  campus_id: string | null;
  name: string;
}

export type GroupRole = "leader" | "editor" | "viewer";

export interface GroupMemberUser extends GroupUser {
  group_role?: GroupRole | null;
}

export interface GroupInfo extends Group {
  status: GroupReviewStatus;
  group_leaders: GroupUser[];
  // 編輯者與檢視者，用 group_role 區分
  group_members: GroupMemberUser[];
}

export interface GroupInfoResponse extends ApiEnvelope, GroupInfo {}

export interface GroupRoleResponse extends ApiEnvelope {
  // 管理員查自己不在的群組時不會帶
  group_role?: GroupRole | null;
}

export interface GroupMember extends GroupUser {
  role: GroupRole;
}

export interface GroupUserSearchResponse extends ApiEnvelope {
  users: GroupUser[];
}

export interface InviteMemberPayload {
  user_id: string;
  group_role?: GroupRole;
}

export interface ChangeRolePayload {
  user_id: string;
  group_role: GroupRole;
}
