# AI tutor and learning evidence

AIService supports authored/mock and optional OpenAI adapters. Models are configured server-side; keys never belong in VITE variables. Responses, transcription and TTS integrations passed real synthetic smoke on 2026-09-18; see docs/LIVE-OPENAI.md. Objective question grading is deterministic.

Positive score increments are at most 4 per independent correct answer, weighted down by hints, capped at +8 per skill/session and +12 per skill/local day. An incorrect answer subtracts 4, bounded at zero. First assessment uses a neutral 50 prior, not a claim of previously demonstrated knowledge. Zero-confidence scores are hidden. Three or more hints give no positive knowledge increment.

Confidence = min(0.95, 0.05 × distinct independent question IDs + 0.12 × min(independent local days, 6)); assisted-only evidence has a 0.05 floor. Repeating the same question/session is idempotent. Confidence describes evidence quantity/diversity, not correctness or a validated probability.

Mastered: score ≥80, confidence ≥0.65, at least 6 distinct independent questions, 3 independent days and 2 successful spaced checks. Strong: score ≥95, confidence ≥0.85, 9 questions, 5 days, 3 spaced checks including one gap of at least 7 days. A spaced check needs at least two independent answers, at least 80% correctness, and a gap of at least 24 hours since the previous skill session. See shared/learning.ts and docs/PROGRESSION.md.

Diagnostics actively rotate branches before repeatedly testing one path. They use 70% leaf coverage, 60% diagnostic sampling confidence (two observations per leaf for full sampling credit), all branches and at least min(6, 2 × leaf count) questions as a stopping target, with a maximum of 24. Diagnostic sampling confidence is distinct from longitudinal mastery confidence. At the cap the UI discloses uncertainty.

Speaking separates activity, grammar, vocabulary, relevance, sentence complexity, fluency and pronunciation. Mock checks a limited grammar pattern; live feedback is qualitative. Neither six words, a long answer, positive feedback nor completion changes proficiency/mastery. Acoustic fluency and pronunciation remain Not assessed. Multiple-choice speaking subskills test response strategies only.

Read state → finish transaction → provider call → short revalidated write. Completed conversations are checked before provider work; late responses cannot write to a session ended during the call. Request UUIDs deduplicate turns; concurrent duplicates share an in-process promise. AI failure is visible, with explicitly labelled authored fallback for lesson explanations.

Tutor prompts treat student text as untrusted data, keep educational scope, ask no identifying details and reveal solutions only at the final hint. Real-world safety, pedagogical quality and model behavior require evaluation before a child pilot.

Previously assessed subjects (at least 70% coverage and 35% mean confidence) use a short recheck: maximum 12 questions, all branches, at least 6 responses, 35% fresh coverage and 20% fresh sampling confidence. The lower sampling target relies on the preserved longitudinal evidence; it does not grant mastery by itself.


## Pilot 0.3

0.3: OpenAI Responses handles concept explanations, five progressive hint levels and mistake explanations. Structured JSON feedback is validated for correction, grammar, vocabulary, relevance and sentence complexity. Pronunciation/fluency remain Not assessed. Objective grading never calls OpenAI. Text failure returns authored explanation/hint with a visible warning; audio/conversation failure remains an explicit retry error rather than fabricated learner text. Consent/Speaking controls are checked around external phases. pilot:smoke uses fictional text and synthetic TTS audio. Real synthetic live smoke passed on 2026-09-18; mocked-network contracts additionally cover request shapes, failures and concurrency. See docs/LIVE-OPENAI.md. Responses uses store:false; see official provider data policy for separate retention.
