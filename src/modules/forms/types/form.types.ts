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
  project_outcome_id: string | null;
  is_respondent_info: boolean;
  title: string | null;
  content: string;
  position: number;
  questions: QuestionResponse[];
}

export interface ConsentResponse {
  consent_id: string;
  version: number;
  is_published: boolean;
  title: string;
  organization_name: string;
  content: string;
  secondary_use_description: string;
  withdrawal_method: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  requires_guardian: boolean;
  secondary_use_enabled: boolean;
  published_at: string | null;
}

export type ConsentUpdatePayload = Omit<
  ConsentResponse,
  "consent_id" | "version" | "is_published" | "published_at"
>;

export interface ConsentSubmissionPayload {
  consent_id: string;
  participant_name: string;
  participant_agreed: boolean;
  secondary_use_agreed: boolean;
  is_adult: boolean;
  guardian_name?: string | null;
  guardian_relationship?: string | null;
  guardian_agreed?: boolean | null;
}

export interface FormResponse {
  form_id: string;
  project_id: string | null;
  public_token: string | null;
  author_id: string;
  title: string | null;
  content: string | null;
  status: FormStatus;
  shuffle_outcome_questions: boolean;
  outcome_sync_index: number;
  create_time?: string | null;
  update_time?: string | null;
  pages: PageResponse[];
  consent: ConsentResponse | null;
}

export interface PublicFormResponse {
  public_token: string;
  title: string | null;
  content: string | null;
  shuffle_outcome_questions: boolean;
  pages: PageResponse[];
  consent: ConsentResponse;
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
  is_duplicate_legacy: boolean;
  started_at: string;
  submitted_at: string | null;
  answers: SubmittedAnswer[];
  consent?: {
    consent_record_id: string;
    consent_id: string;
    participant_name: string;
    participant_agreed: boolean;
    secondary_use_agreed: boolean;
    is_adult: boolean;
    guardian_name: string | null;
    guardian_relationship: string | null;
    guardian_agreed: boolean | null;
    consented_at: string;
  } | null;
}

export interface CreateFormPayload {
  project_id: string;
  title: string;
  content: string;
  status: FormStatus;
  shuffle_outcome_questions?: boolean;
  pages: Array<{
    project_outcome_id?: string | null;
    is_respondent_info?: boolean;
    title?: string;
    content: string;
    position: number;
    questions: QuestionPayload[];
  }>;
}
