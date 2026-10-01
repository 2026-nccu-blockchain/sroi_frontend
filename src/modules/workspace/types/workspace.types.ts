import type { ApiEnvelope } from "@/shared/api/http";

export type ProjectStatus = "draft" | "published";

export interface ProjectStakeholder {
  stakeholder_id?: string;
  name: string;
  role: string;
  email?: string | null;
  notes: string;
  position?: number;
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
  year: number;
  status: ProjectStatus;
  linked_form_id?: string | null;
  linked_form?: LinkedProjectForm | null;
  stakeholders: ProjectStakeholder[];
  create_time?: string | null;
  update_time?: string | null;
}

export interface ProjectPayload {
  name: string;
  organization: string;
  description: string;
  year: number;
  status: ProjectStatus;
  linked_form_id: string | null;
  stakeholders: Array<Omit<ProjectStakeholder, "stakeholder_id" | "position">>;
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
