# Architecture

React + TypeScript + Vite → same-origin /api → Express → repository → PostgreSQL.

Default local database is PGlite, an embedded PostgreSQL engine persisted under .data; DATABASE_URL selects a standard PostgreSQL connection via pg without frontend changes. This is real server-side persistence, not browser localStorage. API and Vite run on loopback. Production serves dist from Express.

Server modules: db, seed, auth, domain, AIService, routes. Client: components, pages, features, hooks, services, types, data, utils. App.tsx only composes providers and routing.

HTTP-only SameSite cookies, scrypt salted password hashes, expiring server sessions, origin checks on writes, bounded bodies, login throttling, role checks and explicit parent linkage. Admin cannot self-register. Public demo logins only exist when ENABLE_DEMO=true (default for local development); never enable that setting in a public pilot.

Answers are checked on the server using a question id. Clients cannot supply mastery or grading. Session answers and hint counts are persisted; repeated answers cannot earn duplicate progress. Completion is transactional and idempotent. AI requests go through server-side adapters; provider failures surface visibly and never silently impersonate successful AI output.

Parent analytics derive from the same events/mastery rows as student views. Daily plans are recalculated from evidence. Weekly reports are computed from actual event timestamps; no fabricated activity history. Query ownership is enforced in the server repository; database is not exposed directly to browsers.
