import type { ApiEnvelope } from "@/shared/api/http";

export interface WorkspaceProject {
  id: number;
  name: string;
  organization: string;
  year: number;
  status: "草稿" | "已發布";
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