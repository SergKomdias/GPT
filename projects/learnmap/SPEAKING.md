# Speaking and listening

Speaking supports Conversation, Role Play and Topic Practice, browser recording (60 seconds / 8 MB), editable transcription and typed fallback. Default mock returns an explicit example transcript. Real transcription/TTS adapters require separate API setup and verification.

A turn persists transcript, reply and qualitative practice/grammar/vocabulary/relevance/sentence-complexity fields. Fluency and pronunciation stay Not assessed without acoustic analysis. Turn time and XP are activity; no free-conversation turn or completed conversation automatically raises proficiency. Completion counts one session and is idempotent.

Completed sessions are rejected before transcription/feedback/TTS session requests. Ownership and active English selection are rechecked after provider calls. Duplicate turn UUIDs persist once; concurrent duplicates share one call in the single server process. Audio is processed in memory; only metadata and text/results persist. Data-retention and consent workflows remain pilot work.

Listening retains a narrated sample passage and a comprehension question. New listening subskills are explicitly text-based strategy exercises, not acoustic proficiency measurements. Full real-device, live voice and diverse audio-content evaluation remains outstanding.
