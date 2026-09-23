import type { ApiEnvelope } from "@/shared/api/http";

export interface WorkspaceProject {
  id: number;
  name: string;
  organization: string;
  year: number;
  status: "草稿" | "已發布";
}

export type GroupStatus = "已驗證" | "審核中" | "未驗證";

export interface Group {
  group_id: string;
  title: string;
  desc: string;
  begin: string;
  end: string;
}

export interface GroupBuckets {
  verified: Group[];
  inProgress: Group[];
  unverified: Group[];
}

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