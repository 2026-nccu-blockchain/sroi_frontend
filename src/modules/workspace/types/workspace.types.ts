export interface WorkspaceProject {
  id: number;
  name: string;
  organization: string;
  year: number;
  status: "草稿" | "已發布";
}

export interface WorkspaceGroup {
  id: number;
  name: string;
  memberCount: number;
  role: "擁有者" | "管理員" | "成員";
}
