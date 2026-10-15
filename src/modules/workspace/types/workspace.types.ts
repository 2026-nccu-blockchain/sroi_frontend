import type { ApiEnvelope } from "@/shared/api/http";

export type ProjectStatus = "draft" | "published";

export interface ProjectStakeholder {
  stakeholder_id?: string;
  name: string;
  role: string;
  notes: string;
  pre_form_id?: string | null;
  post_form_id?: string | null;
  position?: number;
}

export interface ProjectOutcome {
  outcome_id?: string;
  name: string;
  position?: number;
}

export interface ProjectInterviewFile {
  file_id: string;
  stakeholder_id: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  create_time: string | null;
}

export interface LinkedProjectForm {
  form_id: string;
  title?: string | null;
  status: "draft" | "published" | "closed";
}

export interface WorkspaceProject {
  project_id: string;
  owner_id: string;
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
  interview_files: ProjectInterviewFile[];
  create_time?: string | null;
  update_time?: string | null;
}

export interface ProjectPayload {
  name: string;
  organization: string;
  description: string;
  actual_input_cost: number;
  begin: string;
  end: string;
  status: ProjectStatus;
  stakeholders: Array<Omit<ProjectStakeholder, "position">>;
  outcomes: Array<Omit<ProjectOutcome, "position">>;
}

export interface OutcomeValuation {
  outcome_id: string;
  outcome_name: string;
  position: number;
  quantity: number;
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

export interface ProjectSROI {
  project_id: string;
  project_name: string;
  actual_input_cost: number;
  discount_rate: number;
  outcomes: OutcomeValuation[];
  total_social_value: number;
  sroi_ratio: number | null;
}

export interface ProjectSROIPayload {
  actual_input_cost: number;
  discount_rate: number;
  outcomes: Array<Pick<OutcomeValuation,
    "outcome_id" | "quantity" | "financial_proxy_value" | "deadweight_rate" |
    "attribution_rate" | "displacement_rate" | "duration_years" | "dropoff_rate" |
    "is_included"
  >>;
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
  begin: string; // "YYYY-MM-DDT00:00:00"
  end: string;
}

export interface GroupUser {
  user_id: string;
  campus_id: string;
  name: string;
}

export interface GroupInfo extends Group {
  status: GroupReviewStatus;
  group_leaders: GroupUser[];
  group_members: GroupUser[];
}

export interface GroupInfoResponse extends ApiEnvelope, GroupInfo {}

export type GroupRole = "leader" | "member";

export interface GroupRoleResponse extends ApiEnvelope {
  group_role: GroupRole;
}

export interface GroupMember extends GroupUser {
  role: GroupRole;
}

export interface GroupUserSearchResponse extends ApiEnvelope {
  users: GroupUser[];
}

export interface InviteMemberPayload {
  user_id: string;
}

export interface ChangeRolePayload {
  user_id: string;
  is_leader: boolean;
}
