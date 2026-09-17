# Speaking and Listening

Three modes: Conversation; Role Play (airport, café, university, hotel, job interview, meeting a new person); Topic Practice (hobby, technology, robotics, travel, school, future profession). Each server session preserves turns and scenario context.

MediaRecorder + getUserMedia; explicit start/stop; stop tracks on stop, error and unmount; 60 second/8 MB limit; server transcription; text confirmation; AI analysis; persisted speaking evidence; voice reply; next question. Browser microphone requires localhost or HTTPS. Permission denial and absent devices are recoverable; typed transcript remains usable.

Without credentials, audio returns an explicitly marked example transcript. It does not pretend to understand the audio. Student edits/enters the intended utterance. Heuristic feedback corrects a few sample grammar patterns; other assessments are limited. Mock voice uses browser speech synthesis; availability varies by OS/browser. Live voice uses server synthesis. Pronunciation and acoustic fluency are not scored from text. Source audio is held only transiently in memory and discarded after transcription.

Listening plays an authored passage via the same voice interface, asks comprehension questions and records evidence against the separate Listening skill. Revealing the transcript counts as a hint.
