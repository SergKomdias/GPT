# LearnMap 0.1

Your personal map of knowledge.

Source of truth: REQUIREMENTS.md. All student and parent features are free. No billing UI, entitlement gates, or subscription checks.

## People and journeys

- Student: register → minimal profile → choose subject → adaptive diagnostic → knowledge graph → daily plan → staged lesson → persisted mastery and new plan.
- Parent: register → redeem a student-generated, single-use invitation → select child → current map, activity, subject/skill trends, weekly report and recommendations.
- Admin: server-provisioned role only; edit curriculum, skills, prerequisite edges, questions and tutor prompt; view platform usage.

## Scope and acceptance

React/TypeScript/Vite responsive UI; Ukrainian and English interface and sample content; mathematics and mechanics/electricity curricula, English B1 with six separate strands. Knowledge is a graph, not a grade list. Unknown mastery remains visibly unassessed. Seed profiles are fictional. Learning data is server authoritative.

Diagnostics adapt difficulty and prerequisites. Lessons use review (2), explain, guided practice (1), independent practice (3), mini-test (2), result. Hint usage reduces evidence weight. XP never changes mastery. Planner prioritizes weak prerequisites, overdue reviews, developing skills, then new content. Completed work changes map, plan and parent statistics.

Speaking: conversation, role play and topic practice; microphone/error/retry, transcription, contextual feedback, voice and next turn. Without API credentials, explicitly labeled example transcription/heuristic feedback, with editable transcript; never imply mock output is an actual recording transcription. Listening has distinct evidence and mastery.

## Boundaries

This is a locally runnable MVP, not a certified learning assessment. Sample content is intentionally limited. Live AI requires server credentials; SMTP, password recovery, production deployment and child consent operations are follow-up work. No real children in seed data.
