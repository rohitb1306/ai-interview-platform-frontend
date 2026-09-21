export interface JobPosition {
  id: string;
  title: string;
  department: string;
  required_skills: string[];
}

export interface ApplyResponse {
  message: string;
  application_id: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  candidate_name?: string;
  job_title?: string;
  in_progress?: boolean;
  answered_count?: number;
  total_questions?: number;
}

export interface Question {
  id: string;
  text: string;
  number: number;
  total: number;
}

export interface StartInterviewResponse {
  session_id: string;
  // null when every answer is already in (interview finished on this call)
  question: Question | null;
  is_complete: boolean;
}

export interface SubmitAnswerResponse {
  next_question: Question | null;
  is_complete: boolean;
}

export interface InterviewQA {
  id: string;
  question_text: string;
  question_type: "TECHNICAL" | "BEHAVIORAL" | "SYSTEM_DESIGN";
  candidate_answer_text: string | null;
  evaluation_score: number | null;
  ai_feedback: string | null;
}

export interface GapAnalysis {
  matched_skills: string[];
  missing_skills: string[];
  missing_context: string;
}

export interface StoredInterviewSession {
  sessionId: string;
  question: Question;
}

// Recruiter dashboard (/admin)

export type ApplicationStatus =
  | "PENDING"
  | "SCREENING"
  | "SHORTLISTED"
  | "REJECTED"
  | "INTERVIEW_IN_PROGRESS"
  | "COMPLETED";

export interface StaffUser {
  id: number;
  username: string;
  email: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: StaffUser;
}

export interface AdminJob {
  id: string;
  title: string;
  department: string;
  raw_jd_text: string;
  required_skills: string[];
  created_at: string;
  application_count: number;
}

export type AdminJobInput = Pick<
  AdminJob,
  "title" | "department" | "raw_jd_text" | "required_skills"
>;

export interface AdminApplication {
  id: string;
  candidate_name: string;
  candidate_email: string;
  job_id: string;
  job_title: string;
  status: ApplicationStatus;
  match_score: number | null;
  interview_score: number | null;
  created_at: string;
}

export interface AdminInterviewSession {
  id: string;
  started_at: string | null;
  completed_at: string | null;
  overall_score: number | null;
  answered_count: number;
  focus_lost_count: number;
  fullscreen_exit_count: number;
  face_flag_count: number;
}

export interface InterviewRecording {
  id: string;
  url: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

export type InterviewEventType =
  | "FOCUS_LOST"
  | "FOCUS_RETURNED"
  | "FULLSCREEN_EXIT"
  | "RECORDING_ERROR"
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "CAMERA_LOST"
  | "FACE_CHECK_UNAVAILABLE";

export interface AdminInterviewEvent {
  id: string;
  event_type: InterviewEventType;
  qa_id: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface AdminSessionReport {
  id: string;
  application_id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  match_score: number | null;
  gap_analysis: GapAnalysis | null;
  started_at: string | null;
  completed_at: string | null;
  overall_score: number | null;
  final_feedback: string | null;
  qa_pairs: (InterviewQA & { recordings: InterviewRecording[] })[];
  events: AdminInterviewEvent[];
}

export interface AdminApplicationDetail extends AdminApplication {
  gap_analysis: GapAnalysis | null;
  extracted_text: string | null;
  resume_url: string | null;
  sessions: AdminInterviewSession[];
  active_invite_expires_at: string | null;
  interview_url?: string;
}

export interface AdminStats {
  total_jobs: number;
  total_applications: number;
  by_status: Record<ApplicationStatus, number>;
  completed_interviews: number;
  avg_match_score: number | null;
  avg_interview_score: number | null;
  recent_applications: AdminApplication[];
}
