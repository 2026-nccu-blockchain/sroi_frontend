import { defineStore } from "pinia";

import { deleteForm as deleteFormRequest, getForms } from "@/modules/forms/api/forms.api";
import type { FormResponse } from "@/modules/forms/types/form.types";

const CACHE_TTL_MS = 30_000;
let activeRequest: Promise<FormResponse[]> | null = null;
let cacheGeneration = 0;

interface FormState {
  forms: FormResponse[];
  loaded: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string;
  lastLoadedAt: number;
}

export const useFormStore = defineStore("forms", {
  state: (): FormState => ({
    forms: [],
    loaded: false,
    loading: false,
    refreshing: false,
    error: "",
    lastLoadedAt: 0
  }),
  actions: {
    async refresh(background = false): Promise<FormResponse[]> {
      if (activeRequest) return activeRequest;
      this.loading = !background && !this.loaded;
      this.refreshing = background;
      this.error = "";
      const generation = cacheGeneration;
      const request = getForms();
      activeRequest = request;
      try {
        const forms = await request;
        if (generation === cacheGeneration) {
          this.forms = forms;
          this.loaded = true;
          this.lastLoadedAt = Date.now();
        }
        return forms;
      } catch (caught) {
        this.error = caught instanceof Error ? caught.message : "無法載入表單";
        throw caught;
      } finally {
        if (activeRequest === request) activeRequest = null;
        if (generation === cacheGeneration) {
          this.loading = false;
          this.refreshing = false;
        }
      }
    },
    async ensureLoaded(): Promise<FormResponse[]> {
      if (!this.loaded) return this.refresh();
      if (Date.now() - this.lastLoadedAt > CACHE_TTL_MS) void this.refresh(true).catch(() => undefined);
      return this.forms;
    },
    upsert(form: FormResponse): void {
      const index = this.forms.findIndex((item) => item.form_id === form.form_id);
      if (index === -1) this.forms.unshift(form);
      else this.forms[index] = form;
      this.loaded = true;
      this.lastLoadedAt = Date.now();
    },
    async remove(formId: string): Promise<void> {
      await deleteFormRequest(formId);
      this.forms = this.forms.filter((item) => item.form_id !== formId);
    },
    clear(): void {
      cacheGeneration += 1;
      this.$reset();
      activeRequest = null;
    }
  }
});
