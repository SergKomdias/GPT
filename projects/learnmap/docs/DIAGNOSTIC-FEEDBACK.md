# Student diagnostic feedback fixes — 2026-09-18

- Answer choices now shuffle in the shared question UI. Display letters follow the displayed order; submitted values retain original server answer indices. Order stays stable while selecting or requesting hints.
- Diagnostic state remembers question IDs answered in earlier diagnostic sessions for that student/subject. Branch coverage and adaptive difficulty remain; unseen questions are preferred within candidate skills before reusing known ones. The finite existing bank is reused after exhaustion, and questions never repeat within one diagnostic.
- Subject summaries call confidence Evidence strength / Надійність оцінки, explain that it is not knowledge, and show the actual minimums: 60% skill coverage and 35% mean assessed-skill confidence. When coverage is sufficient, recommend new independent answers and another-day practice, without promising a fixed number of sessions.
- No prior learner data, score thresholds or subject selections are reset.

Verification: lint, typecheck and production build passed; 63 unit/API tests and all 10 browser scenarios passed. Browser regression verifies original server index submission after shuffle and a fresh next diagnostic question. See the accompanying test files. The local dist build is updated; restart START-LEARNMAP.cmd and refresh the browser to use the new server and UI.
