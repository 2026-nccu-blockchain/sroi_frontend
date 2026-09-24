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
  public_token: string | null;
  author_id: string;
  title: string | null;
  content: string | null;
  status: FormStatus;
  create_time?: string | null;
  update_time?: string | null;
  pages: PageResponse[];
}

export interface PublicFormResponse {
  public_token: string;
  title: string | null;
  content: string | null;
  pages: PageResponse[];
}

export interface AnswerPayload {
  question_id: string;
  text_value?: string;
  number_value?: number;
  date_value?: string;
  option_ids?: string[];
}

export interface SubmittedAnswer {
  answer_id: string;
  question_id: string;
  content: string | null;
  number_value: number | null;
  date_value: string | null;
  option_ids: string[];
}

export interface FormSubmission {
  response_id: string;
  form_id: string;
  respondent_email: string | null;
  status: "draft" | "submitted";
  started_at: string;
  submitted_at: string | null;
  answers: SubmittedAnswer[];
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