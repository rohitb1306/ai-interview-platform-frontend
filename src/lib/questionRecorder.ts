import { uploadRecordingChunk } from "./api";

const CHUNK_MS = 5000;
const VIDEO_MIME_CANDIDATES = [
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9,opus",
  "video/webm",
  "video/mp4",
];
const AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];
// Low bitrate keeps webcam video around 2 MB per minute.
const VIDEO_BITS_PER_SECOND = 250_000;
const AUDIO_BITS_PER_SECOND = 64_000;

function pickMimeType(hasVideo: boolean): string {
  const candidates = hasVideo ? VIDEO_MIME_CANDIDATES : AUDIO_MIME_CANDIDATES;
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Records camera + microphone continuously, one recording per question, streaming
 * ordered chunks to the backend so at most a few seconds are lost if the tab closes.
 */
export class QuestionRecorder {
  private recorder: MediaRecorder | null = null;
  private uploads: Promise<void> = Promise.resolve();

  constructor(
    private stream: MediaStream,
    private sessionId: string,
    private onUploadError: (questionId: string) => void
  ) {}

  /** Stop any current recording and start a new one for `questionId`. */
  start(questionId: string) {
    this.stopRecorder();

    const hasVideo = this.stream.getVideoTracks().length > 0;
    const mimeType = pickMimeType(hasVideo);
    const recorder = new MediaRecorder(this.stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      ...(hasVideo ? { videoBitsPerSecond: VIDEO_BITS_PER_SECOND } : {}),
    });
    const recordingId = crypto.randomUUID();
    let seq = 0;
    let broken = false;

    recorder.ondataavailable = (e) => {
      if (e.data.size === 0) return;
      const chunk = e.data;
      const chunkSeq = seq++;
      this.uploads = this.uploads.then(async () => {
        if (broken) return;
        const ok = await this.uploadWithRetry(questionId, {
          recordingId,
          seq: chunkSeq,
          mimeType: recorder.mimeType || mimeType || (hasVideo ? "video/webm" : "audio/webm"),
          chunk,
        });
        if (ok) return;
        // Later chunks of this recording would be rejected as out of order, so
        // report once and continue in a fresh recording for the same question.
        broken = true;
        this.onUploadError(questionId);
        if (this.recorder === recorder) this.start(questionId);
      });
    };
    recorder.start(CHUNK_MS);
    this.recorder = recorder;
  }

  /** Stop recording and wait (up to `timeoutMs`) for pending chunks to upload. */
  async stop(timeoutMs = 8000) {
    const recorder = this.recorder;
    this.recorder = null;
    if (recorder && recorder.state !== "inactive") {
      // `stop` fires a final dataavailable before the stop event.
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        recorder.stop();
      });
    }
    await Promise.race([this.uploads, sleep(timeoutMs)]);
  }

  private stopRecorder() {
    if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    this.recorder = null;
  }

  private async uploadWithRetry(
    questionId: string,
    params: { recordingId: string; seq: number; mimeType: string; chunk: Blob }
  ): Promise<boolean> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await uploadRecordingChunk({ sessionId: this.sessionId, questionId, ...params });
        return true;
      } catch {
        await sleep(1000 * (attempt + 1));
      }
    }
    return false;
  }
}
