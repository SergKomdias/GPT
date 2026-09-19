# Speaking and listening

Speaking supports Conversation, Role Play and Topic Practice, browser recording (60 seconds / 8 MB), editable transcription and typed fallback. Default mock returns an explicit example transcript. Real transcription/TTS adapters require separate API setup and verification.

A turn persists transcript, reply and qualitative practice/grammar/vocabulary/relevance/sentence-complexity fields. Fluency and pronunciation stay Not assessed without acoustic analysis. Turn time and XP are activity; no free-conversation turn or completed conversation automatically raises proficiency. Completion counts one session and is idempotent.

Completed sessions are rejected before transcription/feedback/TTS session requests. Ownership and active English selection are rechecked after provider calls. Duplicate turn UUIDs persist once; concurrent duplicates share one call in the single server process. Audio is processed in memory; only metadata and text/results persist. Pilot consent, withdrawal, separate Speaking permission and retention are enforced server-side.

Listening retains a narrated sample passage and a comprehension question. New listening subskills are explicitly text-based strategy exercises, not acoustic proficiency measurements. Full real-device, live voice and diverse audio-content evaluation remains outstanding.


## Pilot 0.3

0.3: parent consent plus Allow Speaking gates conversation/transcription/voice. Withdrawal prevents new and late assessment writes. Transcript deletion closes/redacts sessions and removes productive feedback and cached transcription. No raw microphone bytes are written to disk. Text expires after the configured 30-day default plus hourly cleanup scheduling. Conversation does not change proficiency.

English Diagnostic now includes a separate Speaking Assessment: three standardized voice prompts at the placed CEFR level, server transcription and structured relevance/grammar/vocabulary/complexity/interaction evaluation. All three responses are needed for a provisional textual-language estimate. Typed responses and mock transcripts cannot establish speaking ability. Interaction covers responding to a supplied prompt, not live turn-taking. Pronunciation and acoustic fluency stay null; real audio alone does not supply an acoustic scoring model.

Diagnostic Listening uses actual TTS audio and hides its transcript. Revealing the transcript marks assisted evidence at 0.25 weight. The existing Listening practice screen and text-based strategy questions do not establish CEFR. A single independent audio question gives at most low confidence. See [examples, retention and limitations](docs/DIAGNOSTICS.uk.md).
