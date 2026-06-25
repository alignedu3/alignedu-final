# OpenAI Migration Notes

## What changed

- Lesson analysis now attempts a structured `responses.create(...)` call first.
- The structured response is rendered back into the legacy text report format so the rest of the app can keep using the current `result` shape.
- If the structured path fails, the app falls back to the previous `chat.completions.create(...)` path automatically.
- `analysis_jobs` now capture lightweight OpenAI diagnostics so monitoring can distinguish Responses-based runs from fallback Chat Completions runs.
- Audio transcription behavior is unchanged in this pass.

## Current model strategy

- Primary analysis model order:
  1. `OPENAI_ANALYSIS_MODEL` if set
  2. `gpt-5.5`
  3. `gpt-5.4-mini`
  4. `gpt-4o-mini`
- Analysis uses the Responses API with a strict JSON schema.
- Transcription continues to use the existing route-specific models:
  - `gpt-4o-mini-transcribe` for most analyze uploads
  - `whisper-1` for long analyze uploads
  - `whisper-1` in `/api/transcribe` because that route depends on segment timing metadata

## Why this shape is safer

- Existing UI and storage still receive the same sectioned text report.
- Existing metric parsing still works against the legacy text block.
- Existing repair logic remains in place as a secondary safety net.
- The previous chat-completions flow is still available as a fallback if the structured path fails.

## Manual validation

Run these locally after setting `OPENAI_API_KEY`:

```bash
npm run dev
node --test tests/openai-structured-analysis.test.mjs
```

Then validate:

1. Transcript-only analyze flow
2. Audio analyze flow with a short upload
3. Long audio analyze flow that triggers the Whisper fallback
4. School-grade TEKS lesson
5. Higher-ed biology lesson
6. Higher-ed custom textbook lesson
7. Admin observation submission

For each run, verify:

- all major report sections are present
- the metrics block is present and parseable
- `Gaps Flagged` matches the visible content-gap list
- TEKS sections appear only when relevant
- higher-ed alignment sections use the correct heading
- `/api/analyze/jobs/[id]` still returns the same shape
- saved analyses still render correctly in the dashboard/admin surfaces

## Follow-up cleanup

- Add regression fixtures for representative lesson types
- Add contract tests around `/api/analyze` and `/api/analyze/jobs/[id]`
- Measure structured-path success rate and fallback frequency in `/admin/monitoring`
- Delete the now-delegating `legacyPOST` body entirely once you are comfortable removing dead fallback code
- Revisit `/api/transcribe` only after validating a timestamp-capable modern replacement
