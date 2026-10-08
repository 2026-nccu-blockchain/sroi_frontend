import { defineStore } from "pinia";
import { useFormStore } from "@/modules/forms/store/form.store";

import {
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  getProjects,
  updateProject as updateProjectRequest
} from "@/modules/workspace/api/workspace.api";
import type { ProjectPayload, WorkspaceProject } from "@/modules/workspace/types/workspace.types";

const CACHE_TTL_MS = 30_000;
let activeRequest: Promise<WorkspaceProject[]> | null = null;
let cacheGeneration = 0;

interface ProjectState {
  projects: WorkspaceProject[];
  loaded: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string;
  lastLoadedAt: number;
}

export const useProjectStore = defineStore("projects", {
  state: (): ProjectState => ({
    projects: [],
    loaded: false,
    loading: false,
    refreshing: false,
    error: "",
    lastLoadedAt: 0
  }),
  getters: {
    projectsWithForms(state): WorkspaceProject[] {
      const forms = useFormStore().forms;
      return state.projects.map((project) => {
        const currentForms = project.forms.map((linkedForm) => {
          const cached = forms.find((item) => item.form_id === linkedForm.form_id);
          return cached
            ? { form_id: cached.form_id, title: cached.title, status: cached.status }
            : linkedForm;
        });
        return { ...project, forms: currentForms };
      });
    }
  },
  actions: {
    async refresh(background = false): Promise<WorkspaceProject[]> {
      if (activeRequest) return activeRequest;
      this.loading = !background && !this.loaded;
      this.refreshing = background;
      this.error = "";
      const generation = cacheGeneration;
      const request = getProjects();
      activeRequest = request;
      try {
        const projects = await request;
        if (generation === cacheGeneration) {
          this.projects = projects;
          this.loaded = true;
          this.lastLoadedAt = Date.now();
        }
        return projects;
      } catch (caught) {
        this.error = caught instanceof Error ? caught.message : "無法載入專案";
        throw caught;
      } finally {
        if (activeRequest === request) activeRequest = null;
        if (generation === cacheGeneration) {
          this.loading = false;
          this.refreshing = false;
        }
      }
    },
    async ensureLoaded(): Promise<WorkspaceProject[]> {
      if (!this.loaded) return this.refresh();
      if (Date.now() - this.lastLoadedAt > CACHE_TTL_MS) void this.refresh(true).catch(() => undefined);
      return this.projects;
    },
    upsert(project: WorkspaceProject): void {
      const index = this.projects.findIndex((item) => item.project_id === project.project_id);
      if (index === -1) this.projects.unshift(project);
      else this.projects[index] = project;
      this.loaded = true;
      this.lastLoadedAt = Date.now();
    },
    async create(payload: ProjectPayload): Promise<WorkspaceProject> {
      const project = await createProjectRequest(payload);
      this.upsert(project);
      return project;
    },
    async update(projectId: string, payload: Partial<ProjectPayload>): Promise<WorkspaceProject> {
      const project = await updateProjectRequest(projectId, payload);
      this.upsert(project);
      return project;
    },
    async remove(projectId: string): Promise<void> {
      await deleteProjectRequest(projectId);
      this.projects = this.projects.filter((item) => item.project_id !== projectId);
    },
    clear(): void {
      cacheGeneration += 1;
      this.$reset();
      activeRequest = null;
    }
  }
});
