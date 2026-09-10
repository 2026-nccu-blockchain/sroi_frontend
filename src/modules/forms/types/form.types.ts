export type ApiQuestionType = "DS" | "OQ" | "SC" | "DT" | "CQ";
export type FormStatus = "draft" | "published" | "closed";

export interface QuestionOptionPayload {
  option_id?: string;
  label: string;
  value?: string;
  position?: number;
}

export interface QuestionPayload {
  question_type: ApiQuestionType;
  title?: string | null;
  content: string;
  is_required: boolean;
  position: number;
  scale_begin?: number | null;
  scale_end?: number | null;
  is_multiple: boolean;
  options: QuestionOptionPayload[];
}

export interface QuestionOptionResponse {
  option_id: string;
  label: string;
  value: string;
  position: number;
}

export interface QuestionResponse extends QuestionPayload {
  question_id: string;
  page_id: string;
  is_temp: boolean;
  pre_id: string | null;
  next_id: string | null;
  jump_rules: Array<Record<string, string>>;
  options: QuestionOptionResponse[];
}

export interface PageResponse {
  page_id: string;
  title: string | null;
  content: string;
  position: number;
  questions: QuestionResponse[];
}

export interface FormResponse {
  form_id: string;
  author_id: string;
  title: string | null;
  content: string | null;
  status: FormStatus;
  pages: PageResponse[];
}

export interface CreateFormPayload {
  title: string;
  content: string;
  status: FormStatus;
  pages: Array<{
    title?: string;
    content: string;
    position: number;
    questions: QuestionPayload[];
  }>;
}
