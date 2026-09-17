# LearnMap 0.3 — first-family guide

No subject expansion or redesign. Mathematics, Physics and English remain free for every student and parent. No premium, payments or advertising analytics. Conversation is practice activity, not a proficiency examination. Speaking Assessment is a future mode and cannot be started in 0.3; pronunciation/acoustic fluency remain Not assessed.

## First family

1. The operator verifies the guardian relationship directly and sends the family the pilot URL and private registration invite code. The app records guardian self-attestation; it does not independently verify identity or legal guardianship.
2. Parent and student create separate accounts with unique passwords. The student chooses subjects/timezone and generates a one-time parent link under Settings / Parent connection. Avoid full names and unnecessary personal details.
3. The parent redeems that link, reads Privacy & pilot consent, and explicitly confirms version `pilot-2026-09-v1`. The database stores timestamp, current state and consent history. Enable Allow Speaking separately only if wanted. A new confirmation starts with Speaking off.
4. Before consent, the student can onboard, select subjects, inspect their account and link a parent; learning endpoints and Speaking are blocked server-side. After consent, try one approved diagnostic and one short lesson together. No objective grade is delegated to AI.
5. Try Conversation only after the parent enables it. Start with typed answers, then a microphone if desired. Do not dictate names, addresses or private information. LearnMap does not save raw microphone audio. It stores conversation text/feedback/replies for at most 30 days from session creation, with hourly cleanup (up to one hour scheduling delay).
6. After three completed lessons the student can optionally rate a lesson 👍/😐/👎. The parent can rate report usefulness 👍/👎 or dismiss. No free-text personal information is requested.
7. Settings or the selected child's parent panel offers JSON export, transcript deletion and account deletion. Account deletion requires the acting account's current password. A parent can delete their linked child's account. Transcript deletion closes sessions; late provider responses cannot recreate them. Withdrawal stops new learning/AI use but does not silently erase the learning history; use deletion controls separately.

If multiple parents are linked, the most recent explicit consent update controls the child's permission; any linked parent can withdraw. Deleting the granting parent's account withdraws that consent. Renewed consent is explicit. The operator must resolve guardian disputes outside the app.

## Pilot metrics definitions

Admin → Pilot metrics shows fixed-enum first-party events, never transcripts, email, IP or fingerprints. Stored events use an internal account ID so account deletion can erase them; this is pseudonymous, not anonymous. Raw events and feedback expire after 90 days. Demo accounts are excluded from activity metrics.

- Active students today: distinct student accounts with a recorded event during the current pilot-timezone day.
- Lessons started/completed, completion rate: recorded lesson-session starts and completions in the retention window, with idempotent session keys.
- Average learning time: capped elapsed time for completed lessons, not a measure of active attention. Hints per lesson divides hint events by starts.
- Speaking sessions: starts and ends; these are activity counts, not language scores.
- Parent/weekly views: deduplicated per child, screen and UTC hour to avoid rerender inflation.
- Day-1/day-7: exact local-calendar-day return after account creation. Only accounts whose entire target day has elapsed enter the denominator. No eligible cohort means “—”, not 0%.
- Subject usage: distinct students, fixed event count and recorded completed-session seconds. Subject adding/pausing also contributes events.
- Lesson abandoned: an unfinished lesson older than 24 hours, detected on cleanup. A later completion remains recorded as a return to that session; this is not a browser-close detector.

## Before the first real child

- [ ] Deploy HTTPS, verify Secure cookies and disable demo; confirm the invite code is enforced.
- [ ] Provision external PostgreSQL, verify restart persistence, perform and record a backup/restore drill.
- [ ] Set project-scoped OpenAI credentials/budget and run synthetic live smoke; review each output and listen to TTS on a real device.
- [ ] A teacher reviews/approves the exact skills, prerequisite questions, hints, answer keys and explanations used by the family. Draft/reviewed questions are blocked in pilot mode. No mass content generation or automatic approval is performed.
- [ ] Operator reviews guardian identity, consent wording and provider data handling with the family; verify withdrawal and Speaking-off behavior together.
- [ ] Verify export, transcript/account deletion and retention cleanup on fictional data; define how deletion requests are replayed after restoring backups.
- [ ] Give the family a support contact and procedure for incorrect AI explanations, forgotten passwords or accidental disclosure. Self-service email recovery is not implemented.
- [ ] Confirm exactly one app instance; verify request/spend controls, monitoring and a way to disable live AI quickly.
- [ ] Use 3–5 invited students only; collect feedback and review results before expansion.

## Known limits

This is an alpha candidate, not certified assessment or a fully audited child-data service. Live AI and staging status are reported separately in QA. No hosting/managed database/backup was provisioned. Guardian identity, legal review and teacher approval are manual gates. No calibrated pronunciation/CEFR scoring, distributed provider deduplication, automatic email recovery or external monitoring is included. AI explanations can be wrong even though objective grades are deterministic. Short in-process database phases and single-flight requests are suitable for the intended single-process alpha; multi-instance scale needs further work. Privacy deletion covers LearnMap's live database, not independently retained provider data or unexpired backups.
