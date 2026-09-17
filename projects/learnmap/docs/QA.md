# LearnMap 0.1 — verification and handoff

## Environment

Verified on Windows with Node 24, React/Vite and disk-persisted PGlite. Interactive review used Codex's in-app browser at `http://127.0.0.1:5173`. Isolated Playwright/Edge tests used `http://127.0.0.1:5174`, their own API on 3101 and `.data/e2e`, with fictional test accounts only.

The in-app browser was the primary visual/interaction tool. Headless Edge was additionally used for reproducible microphone permission/error fixtures and synthetic audio; those controls are not exposed by the in-app browser. No actual personal microphone recording was needed for automated testing.

Viewports checked: 390×844, 768×844, 1280×900, 1400×1000, and the concept's nominal 1505×1045. The in-app capture cropped the oversized native-width viewport to the host panel, so the final readable desktop capture uses 1400×1000. Full-page capture also produced excess blank canvas; final screenshots use viewport capture instead.

## Results

| Check | Result |
| --- | --- |
| TypeScript | PASS (`pnpm typecheck`, also part of build) |
| ESLint | PASS |
| Domain + PostgreSQL API tests | PASS — 16 tests |
| Browser regression tests | PASS — 4 end-to-end tests |
| Production build | PASS |
| Page identity and nonempty rendering | PASS |
| Framework error overlay | None on final load |
| Console health | No errors/warnings after final clean reload; end-to-end main flow captures no page errors |
| Responsive overflow | No document horizontal overflow at tested widths |
| Microphone allowed | PASS with synthetic device: start → stop → example transcription |
| Microphone denied | PASS: clear error → typed answer → saved feedback |
| Live OpenAI / external PostgreSQL | Not exercised; no external credentials supplied |
| Physical phone microphone / audible voice quality | Not verified; browser invocation and synthetic media verified |

## Interaction evidence

1. Register fictional student → onboarding → eight adaptive questions → knowledge map → full nine-step lesson → stored result → student invitation → separately registered parent → same child results and weekly report.
2. In-app demo lesson: 8/8 correct answers with one review hint. Quadratic-equation mastery changed **44 → 86**; Math subject average **68 → 71**; Today selected **Circles** next. A server restart preserved the result. The parent saw the same mastery and completed lesson.
3. Speaking: synthetic microphone → explicit example transcript → confirm text → grammar feedback → follow-up question → finish conversation. Individual turns save evidence; completion counts one conversation. `I go to school yesterday.` produced `I went to school yesterday.` Pronunciation remains explicitly unassessed.
4. Listening: voice request → stop → reveal transcript as hint → answer → separate listening mastery.
5. Administration: edit prompt → save → confirmation. Student role is denied API and UI administration. Cyclic skill prerequisites are rejected.

## Issues found and fixed

- First startup failed when the database parent directory did not exist; initialization now creates it.
- Several sample distractors duplicated an option; all 351 questions now pass uniqueness validation, and a one-time content migration fixes existing local seed rows.
- Mobile Ukrainian navigation overflowed; compact nav sizing removes horizontal overflow.
- Graph `role=img` hid its interactive labels from accessibility navigation; it now exposes a labeled group and skill buttons.
- Speaking session counts originally counted every turn; explicit completion now counts one session, while turns retain practice evidence and elapsed time.
- Tied transaction timestamps could reorder history; an event sequence now makes ordering deterministic.
- Responsive snapshot heading wrapped awkwardly; medium desktop sizes stack its heading and link.
- Temporary Vite hot-reload errors occurred during bulk source formatting. Final reload and isolated browser tests run without those errors.
- Test fixture origin and admin locator mismatches were corrected; all final tests pass.

## Design comparison

Reference: [concept.png](concept.png), generated with built-in ImageGen before coding. Final implementation and the concept were opened with `view_image` for direct comparison.

| Comparison point | Verification / intentional difference |
| --- | --- |
| Layout | Sidebar + greeting + lime plan panel + ruled learning rows + graph + subject summary retained |
| Palette | Cool pale canvas, white surfaces, forest controls, lime panel, muted amber learning nodes retained |
| Typography | Sans hierarchy, large greeting, two-line plan title, restrained chrome; breakpoint sizes adjusted for legibility |
| Graph | Real SVG nodes, dependencies and accessible controls replace illustrative graph data |
| Icons | Connected-node mark and graph navigation, consistent outline subject icons; no bitmap UI |
| Containers | Open rows and restrained graph panel; no repeated dashboard card grid |
| Responsive | Single-column mobile, accessible compact navigation, horizontally scrollable graph; conversation settings collapse while speaking |
| Copy | Core greeting, plan copy, CTA and nav preserved. Actual planner topics, metrics, Ukrainian labels and explicit mock notice intentionally supersede example content |

Above-the-fold copy audit: intentional differences are live learner results, prerequisite-aware Physics choice, a parent **connection** action instead of entering another role's private dashboard, and disclosure of the demo AI adapter. English shows both B1 sample level and separate numerical mastery. No pricing, premium labels, locked features or fabricated learning history were introduced.

The implementation was visually verified against the concept for layout, palette, typography, icons, graph treatment and spacing. It preserves the concept's design language, with the functional and responsive adaptations listed above; it is not claimed to be pixel-identical across viewport sizes.

## Screenshots

- [Today — desktop](screenshots/today-desktop.png)
- [Today — Ukrainian mobile](screenshots/today-mobile-uk.png)
- [Knowledge Map](screenshots/knowledge-map.png)
- [Lesson and progressive hint](screenshots/lesson.png)
- [Speaking — desktop](screenshots/speaking-desktop.png)
- [Speaking — mobile](screenshots/speaking-mobile.png)
- [Parent dashboard](screenshots/parent-dashboard.png)
- [Weekly report](screenshots/weekly-report.png)
- [Curriculum editor](screenshots/admin-editor.png)
- [Login](screenshots/login.png)

The development server remains available on loopback. For environment setup, limitations and the next ten priorities, see [README.md](../README.md).
