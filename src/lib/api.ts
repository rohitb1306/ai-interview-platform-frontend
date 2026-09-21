import type {
  ApplyResponse,
  InterviewEventType,
  JobPosition,
  StartInterviewResponse,
  SubmitAnswerResponse,
  ValidateTokenResponse,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (body && (body.detail || body.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }
  return body as T;
}

export async function listJobs(): Promise<JobPosition[]> {
  const res = await fetch(`${API_BASE}/jobs/`);
  return parseOrThrow<JobPosition[]>(res);
}

export async function applyToJob(formData: FormData): Promise<ApplyResponse> {
  const res = await fetch(`${API_BASE}/applications/apply`, {
    method: "POST",
    body: formData,
  });
  return parseOrThrow<ApplyResponse>(res);
}

export async function validateToken(
  token: string
): Promise<ValidateTokenResponse> {
  const res = await fetch(
    `${API_BASE}/interview/validate?token=${encodeURIComponent(token)}`
  );
  if (res.status === 400) {
    return { valid: false };
  }
  return parseOrThrow<ValidateTokenResponse>(res);
}

export async function startInterview(
  token: string
): Promise<StartInterviewResponse> {
  const res = await fetch(`${API_BASE}/interview/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return parseOrThrow<StartInterviewResponse>(res);
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  answerText: string
): Promise<SubmitAnswerResponse> {
  const res = await fetch(`${API_BASE}/interview/submit-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      question_id: questionId,
      answer_text: answerText,
    }),
  });
  return parseOrThrow<SubmitAnswerResponse>(res);
}

/** Fire-and-forget integrity log; `keepalive` lets it finish if the tab is closing. */
export function logInterviewEvent(
  sessionId: string,
  questionId: string | null,
  eventType: InterviewEventType,
  durationMs?: number
) {
  fetch(`${API_BASE}/interview/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      session_id: sessionId,
      question_id: questionId,
      event_type: eventType,
      duration_ms: durationMs ?? null,
    }),
  }).catch(() => {});
}

export async function uploadRecordingChunk(params: {
  sessionId: string;
  questionId: string;
  recordingId: string;
  seq: number;
  mimeType: string;
  chunk: Blob;
}): Promise<void> {
  const form = new FormData();
  form.append("session_id", params.sessionId);
  form.append("question_id", params.questionId);
  form.append("recording_id", params.recordingId);
  form.append("seq", String(params.seq));
  form.append("mime_type", params.mimeType);
  form.append("chunk", params.chunk, `chunk-${params.seq}`);
  const res = await fetch(`${API_BASE}/interview/recording-chunk`, {
    method: "POST",
    body: form,
  });
  await parseOrThrow<unknown>(res);
}
