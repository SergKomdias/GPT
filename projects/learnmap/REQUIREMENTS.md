Так, для тестування це логічніше. **У LearnMap 0.1 весь функціонал і для учня, і для батьків безкоштовний.** Монетизацію поки лише закладаємо архітектурно, але жодних paywall, тарифів чи обмежень у тестовій версії не показуємо.

Оновив ТЗ для Codex:

# LearnMap — MVP 0.1

Створи з нуля робочий web-app **LearnMap**.

LearnMap — персональний AI-викладач для школярів.

На першому етапі підтримуються три предмети:

1. Mathematics
2. Physics
3. English

## Важливо для MVP 0.1

На етапі тестування **весь функціонал LearnMap безкоштовний**:

* навчання учня;
* AI Tutor;
* Speaking;
* Knowledge Map;
* статистика;
* батьківський кабінет;
* повна аналітика;
* щотижневі звіти.

Жодних paywall, оплат або функціональних обмежень у MVP 0.1 не робити.

Архітектуру можна підготувати до майбутньої монетизації, але вона не повинна впливати на UX поточної версії.

Основна ідея:

> У кожного учня є персональна карта знань — LearnMap. Система визначає поточний рівень, знаходить прогалини, формує персональний навчальний маршрут, проводить заняття та постійно перебудовує програму за результатами учня.

---

# 1. Ролі

Передбачити три ролі:

### Student

Може:

* зареєструватися;
* вибрати клас;
* вибрати предмет;
* пройти діагностику;
* отримати Knowledge Map;
* проходити AI-заняття;
* користуватися Speaking;
* виконувати вправи;
* бачити прогрес.

### Parent

Може:

* зареєструватися;
* прив'язати одну або кілька дітей;
* бачити повну статистику;
* бачити Knowledge Map дитини;
* бачити проблемні та сильні теми;
* бачити час навчання;
* переглядати щотижневі звіти;
* отримувати рекомендації LearnMap.

**У MVP весь Parent Dashboard безкоштовний.**

### Admin

Може керувати:

* предметами;
* класами;
* curricula;
* темами;
* skills;
* diagnostic questions;
* AI prompts;
* користувачами;
* статистикою платформи.

---

# 2. Onboarding

Запитати:

* ім'я;
* вік або дату народження;
* клас;
* країну;
* мову навчання;
* мову інтерфейсу.

Поки підтримати:

* Ukrainian;
* English.

Архітектура повинна дозволяти додавати інші мови.

Після onboarding:

## Обери предмет

* Mathematics
* Physics
* English

Для нового предмета запропонувати діагностику.

---

# 3. Diagnostic Engine

Діагностика адаптивна.

Для MVP реалізувати rule-based adaptive algorithm.

Логіка:

правильна відповідь
→ складніше питання

неправильна
→ перевірити базовіший skill

декілька правильних поспіль
→ підняти рівень

повторні помилки
→ перевірити prerequisite

Результат діагностики — mastery для кожного skill.

Приклад:

Mathematics — 68%

Numbers — 92%

Algebra — 63%

* Linear equations — 82%
* Systems — 71%
* Quadratic equations — 44%
* Functions — 57%

Geometry — 51%

---

# 4. Knowledge Map

Це центральний елемент LearnMap.

Для кожного учня зберігати:

* subject;
* topic;
* subtopic;
* skill;
* mastery;
* confidence;
* attempts;
* correct_answers;
* incorrect_answers;
* hints_used;
* time_spent;
* last_activity;
* next_review_date.

Mastery: 0–100.

Статуси:

* 0–39 — gap
* 40–59 — learning
* 60–79 — developing
* 80–94 — mastered
* 95–100 — strong

Knowledge Map має показувати не список оцінок, а взаємопов'язану структуру знань.

---

# 5. Student Dashboard

Головний екран максимально простий.

Приклад:

## Привіт, Alex

Сьогодні приблизно 42 хвилини.

Mathematics — 15 min
Quadratic equations

Physics — 15 min
Uniformly accelerated motion

English — 12 min
Speaking

## START

LearnMap сам визначає, що сьогодні потрібно вивчати.

Навігація:

* Today
* LearnMap
* Subjects
* Progress

---

# 6. Daily Learning Planner

Алгоритм формування плану враховує:

1. слабкі prerequisite skills;
2. теми, які зараз вивчаються;
3. spaced repetition;
4. нові теми.

Для skill:

* priority;
* mastery;
* prerequisite;
* last_review;
* next_review.

---

# 7. Lesson Engine

Одне заняття:

### Review

2–3 питання з раніше вивченого.

### Explain

Коротке пояснення.

### Guided Practice

Одне завдання разом з AI Tutor.

### Independent Practice

3–6 завдань.

### Mini Test

2–4 питання.

### Result

Наприклад:

Quadratic equations

44% → 57%

Після заняття Knowledge Map реально оновлюється.

---

# 8. AI Tutor

Не давати готову відповідь одразу.

Progressive hints:

Level 0 — самостійне рішення

Level 1 — невелика підказка

Level 2 — пояснення принципу

Level 3 — перший крок

Level 4 — детальний розбір

Level 5 — повне рішення

Кількість використаних підказок впливає на mastery.

Самостійна відповідь повинна оцінюватися вище за відповідь після декількох підказок.

---

# 9. Dependency Graph

Skills мають залежності.

Приклад:

Arithmetic
↓
Algebra basics
↓
Linear equations
↓
Quadratic equations

Якщо проблема в prerequisite, LearnMap повинен повернути учня до базової теми.

Dependency graph зберігати в БД.

---

# 10. Mathematics

Для MVP потрібен sample curriculum.

### Arithmetic

### Algebra

* expressions;
* brackets;
* linear equations;
* systems;
* powers;
* roots;
* quadratic equations;
* functions.

### Geometry

* angles;
* triangles;
* polygons;
* circles;
* area;
* volume.

Контент повинен додаватися через Admin.

---

# 11. Physics

Sample curriculum:

### Mechanics

* distance;
* speed;
* acceleration;
* uniform motion;
* accelerated motion;
* force;
* mass;
* Newton's laws;
* work;
* power;
* energy.

### Electricity

* voltage;
* current;
* resistance;
* Ohm's law;
* power;
* series circuits;
* parallel circuits.

Логіка навчання:

situation
→ understanding
→ physical model
→ formula
→ calculation
→ interpretation

Не перетворювати фізику на заучування формул.

---

# 12. English

Knowledge Map для English:

* Grammar
* Vocabulary
* Reading
* Writing
* Listening
* **Speaking**

Кожен напрям має власний mastery.

Наприклад:

Grammar — 72%
Vocabulary — 65%
Reading — 81%
Writing — 61%
Listening — 58%
Speaking — 54%

---

# 13. English Speaking

Speaking обов'язково входить у MVP.

Flow:

Microphone
↓
Audio capture
↓
Speech-to-text
↓
AI analysis
↓
Feedback
↓
AI voice response
↓
Next question

AI аналізує:

* relevance;
* grammar;
* vocabulary;
* sentence structure;
* fluency;
* pronunciation — наскільки дозволяє speech/audio API.

Приклад:

Student:

“I go to school yesterday.”

LearnMap:

“I went to school yesterday.”

Пояснення:

Because the action happened yesterday, use Past Simple.

Далі AI продовжує розмову.

Speaking має відчуватися як **живий діалог**, а не тест.

---

# 14. Speaking Modes

Передбачити:

### Conversation

AI веде звичайний діалог.

### Role Play

Приклади:

* airport;
* café;
* university;
* hotel;
* job interview;
* meeting a new person.

### Topic Practice

* My hobby
* Technology
* Robotics
* Travel
* School
* Future profession

---

# 15. Listening

AI озвучує:

* слово;
* речення;
* короткий текст;
* невеликий діалог.

Учень:

* відповідає на питання;
* вибирає відповідь;
* переказує зміст.

Listening має окремий mastery.

---

# 16. CEFR

Архітектуру English підготувати під:

A1
A2
B1
B2
C1

Для MVP достатньо sample curriculum B1.

---

# 17. Parent Dashboard

У MVP 0.1 **повністю безкоштовний**.

Показувати:

* чи займалася дитина сьогодні;
* час навчання;
* кількість занять;
* mastery предметів;
* Knowledge Map;
* динаміку;
* сильні теми;
* проблемні теми;
* рекомендації;
* weekly reports.

Не показувати:

* upgrade;
* premium;
* pricing;
* locked features;
* payment forms.

---

# 18. Parent Analytics

Приклад:

## This week

Mathematics
62% → 67%

Physics
48% → 56%

English
71% → 74%

Time:

Math — 2h 10m
Physics — 1h 35m
English — 1h 20m

Також показувати динаміку по окремих skills.

---

# 19. Parent Insights

Автоматично формувати:

### Strengths

* mechanics;
* linear equations;
* reading.

### Needs attention

* electricity;
* quadratic equations;
* Present Perfect;
* Speaking.

### Recommendation

Наприклад:

> Наступного тижня рекомендуються два короткі заняття з quadratic equations та три Speaking sessions.

---

# 20. Weekly Report

Приклад:

## LearnMap Weekly Report

Student: Demo Student

Learning time:
4h 45m

Completed:
13/15 lessons

Mathematics:
+5%

Physics:
+8%

English:
+3%

Best progress:
Kinematics

Needs attention:
Quadratic equations

Speaking:
B1 developing

Next week:

* 2 equations sessions;
* 2 physics sessions;
* 3 Speaking sessions.

У MVP показувати в Parent Dashboard.

Email delivery поки не потрібна.

---

# 21. Gamification

Легка гейміфікація:

* streak;
* XP;
* learning level;
* weekly goal.

Не робити продукт дитячим.

Важливо:

**XP ≠ Mastery**

XP показує engagement.

Mastery показує знання.

---

# 22. Database

Основні entities:

users

student_profiles

parent_profiles

parent_student_links

subjects

curricula

topics

skills

skill_dependencies

diagnostic_questions

diagnostic_sessions

diagnostic_answers

student_skill_mastery

lessons

lesson_sessions

lesson_steps

questions

student_answers

ai_interactions

learning_events

daily_plans

weekly_reports

speaking_sessions

speaking_turns

audio_records_metadata

Можна закласти `subscriptions` для майбутнього використання, але **не використовувати у MVP 0.1**.

---

# 23. student_skill_mastery

Мінімум:

id

student_id

skill_id

mastery_score

confidence_score

attempts_count

correct_count

incorrect_count

hints_used

time_spent_seconds

last_practiced_at

next_review_at

updated_at

---

# 24. AI abstraction

Не викликати AI безпосередньо з UI.

Створити AIService.

Методи:

generateLesson()

explainConcept()

generateQuestion()

evaluateAnswer()

generateHint()

analyzeMistake()

recommendNextSkill()

generateParentInsight()

generateWeeklyReport()

transcribeSpeech()

evaluateSpeaking()

generateConversationReply()

synthesizeSpeech()

Архітектура повинна дозволяти міняти AI models/providers.

---

# 25. Safety

LearnMap призначений для дітей.

Не використовувати реальні дані дітей у demo/seed.

Мінімізувати персональні дані.

Audio бажано обробляти:

record
→ transcribe
→ analyze
→ delete source audio

якщо постійне збереження не потрібне.

AI Tutor має працювати в межах освітнього продукту.

---

# 26. Tech Stack

Frontend:

* React
* TypeScript
* Vite
* responsive UI

Backend:

* PostgreSQL / Supabase

Auth:

* email/password
* role-aware authorization

AI:

* OpenAI API;
* server-side AI service;
* ніколи не передавати API key у browser.

Speaking:

* browser microphone API;
* server-side transcription;
* AI analysis;
* speech synthesis.

Якщо AI credentials ще не підключені — зробити mock adapter.

Але архітектура повинна бути готова до підключення real API без переробки frontend.

---

# 27. Visual Style

Ціль:

школярі приблизно 12–18 років + батьки.

Стиль:

* clean;
* modern;
* intelligent;
* technological;
* friendly;
* calm.

Не використовувати:

* мультяшний дизайн;
* childish UI;
* надлишкові badges;
* нескінченні card grids;
* агресивну гейміфікацію.

Головна візуальна метафора:

# Knowledge Map

Знання представлені як система взаємопов'язаних вузлів.

---

# 28. Screens

Реалізувати:

1. Landing / Login
2. Student onboarding
3. Student Dashboard
4. Diagnostic
5. Knowledge Map
6. AI Lesson
7. Mathematics
8. Physics
9. English
10. English Speaking
11. English Listening
12. Progress
13. Parent Dashboard
14. Parent Analytics
15. Weekly Report
16. Admin curriculum editor

---

# 29. Mobile

Підтримати:

* desktop;
* tablet;
* smartphone.

Speaking особливо оптимізувати для smartphone.

---

# 30. Seed Data

Створити тільки вигаданого користувача:

Demo Student

Class: 10

Mathematics — 68%

Physics — 54%

English — B1

English:

Grammar — 72
Vocabulary — 65
Reading — 81
Writing — 61
Listening — 58
Speaking — 54

Не використовувати реальні імена дітей.

---

# 31. MVP Priority

Порядок:

1. authentication;
2. onboarding;
3. knowledge model;
4. diagnostic engine;
5. Knowledge Map;
6. Today planner;
7. Lesson Engine;
8. AI abstraction;
9. Speaking;
10. Listening;
11. student progress;
12. Parent Dashboard;
13. Parent Analytics;
14. weekly reports.

---

# 32. Development Approach

Створити проект:

`projects/learnmap`

Це ТЗ використовувати як **source of truth**.

Перед coding:

1. проаналізувати вимоги;
2. створити PRODUCT.md;
3. створити ARCHITECTURE.md;
4. створити DATABASE.md;
5. створити AI_TUTOR.md;
6. створити SPEAKING.md;
7. сформувати design system;
8. розробити візуальну концепцію;
9. реалізувати application.

Не робити монолітний App.tsx.

Структура:

components

features

pages

services

data

hooks

types

utils

ai

---

# 33. Testing

Перед завершенням:

* build;
* lint;
* typecheck;
* tests;
* responsive check;
* microphone permissions;
* microphone denied/error state;
* Speaking flow;
* Knowledge Map;
* Student flow;
* Parent flow.

Основний flow:

Register
→ onboarding
→ diagnostic
→ Knowledge Map
→ Today
→ lesson
→ answers
→ mastery updated
→ Parent Dashboard updated.

Speaking flow:

Open Speaking
→ microphone
→ record
→ transcription
→ AI feedback
→ AI voice reply
→ next question
→ Speaking mastery updated.

---

# 34. Deliverables

Repository повинен містити:

README.md

PRODUCT.md

ARCHITECTURE.md

DATABASE.md

AI_TUTOR.md

SPEAKING.md

та working application.

README:

* що таке LearnMap;
* як запустити;
* architecture;
* environment;
* database;
* AI setup;
* implemented functionality;
* mock functionality;
* limitations;
* next steps.

---

# 35. Monetization

У **MVP 0.1 монетизації немає**.

Усе безкоштовно.

Не показувати користувачам тарифи або Premium.

Але архітектурно не створювати перешкод для майбутнього введення:

* paid Parent Analytics;
* family plans;
* advanced reports;
* school plans.

Це тема наступних версій після тестування реальної поведінки користувачів.

---

# 36. Головне правило MVP

Не будувати красивий dashboard із fake buttons.

LearnMap повинен реально змінювати дані.

Після заняття:

* зберігається результат;
* оновлюється mastery;
* змінюється Knowledge Map;
* перебудовується план;
* оновлюється Parent Dashboard.

Якщо зовнішній AI API поки не підключений — використовувати mock adapter, але весь application flow повинен працювати.

Після завершення покажи:

1. структуру проекту;
2. реалізований функціонал;
3. що працює через real backend;
4. що працює через mock;
5. як запустити;
6. результати тестів;
7. screenshots основних екранів;
8. наступні 10 задач у порядку пріоритету.

Project:

# LearnMap

Tagline:

**Your personal map of knowledge.**

І це навіть краще для першого етапу: ми зможемо дати LearnMap, наприклад, **20–50 сім'ям без будь-якої оплати** і дивитися не на готовність платити, а на більш фундаментальні метрики: чи повертається дитина сама, скільки реально займається, чи росте mastery, чи користуються батьки аналітикою і які звіти вони реально відкривають.

Монетизацію вже варто вмикати **після того, як побачимо, за яку саме частину Parent Dashboard батьки відчувають найбільшу цінність**.
