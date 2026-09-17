# AI Tutor

AIService methods: generateLesson, explainConcept, generateQuestion, evaluateAnswer, generateHint, analyzeMistake, recommendNextSkill, generateParentInsight, generateWeeklyReport, transcribeSpeech, evaluateSpeaking, generateConversationReply, synthesizeSpeech.

Mock adapter is deterministic, labeled in UI, needs no keys. OpenAI adapter uses server-side Responses, Audio Transcriptions and Speech APIs. Provider selection is server configuration. Keep secret API keys out of VITE_* variables. Model names are configurable.

Tutor behavior: educational content only; age appropriate; no requests for identifying information; user answers are untrusted data, never system instructions. Progressive hints 0 independent, 1 clue, 2 principle, 3 first step, 4 worked reasoning, 5 solution. Server records hints before answering and reduces mastery evidence accordingly. Objective sample questions use deterministic grading even with real AI enabled.

AI explanations complement authored, answer-checked content. A sample assessment is not a validated proficiency test. Pronunciation cannot be inferred reliably from a text transcript and is reported as unassessed.

Official references: https://developers.openai.com/api/reference/typescript/resources/audio and https://developers.openai.com/api/reference/resources/responses/methods/create . Live provider integration must be verified with actual account access before a pilot.
