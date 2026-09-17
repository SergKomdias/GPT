// B1 sample only. Each row supplies a contextual choice, sentence repair and rule task.
type Row = [string, string, string, string, string];
type Unit = {
  id: string;
  strand: string;
  title: string;
  uk: string;
  pre: string[];
  rule: string;
  rows: Row[];
};
const unit = (
  id: string,
  strand: string,
  title: string,
  uk: string,
  pre: string[],
  rule: string,
  rows: Row[],
): Unit => ({ id, strand, title, uk, pre, rule, rows });
export const englishUnits: Unit[] = [
  unit(
    'present-simple',
    'grammar',
    'Present Simple',
    'Present Simple',
    [],
    'Use the base form for habits; add -s with he/she/it. Questions use do/does.',
    [
      ['She ___ to work by bus every day.', 'goes', 'go', 'going', 'gone'],
      ['___ your brother play tennis?', 'Does', 'Do', 'Is', 'Has'],
      [
        'They ___ coffee in the evening.',
        'do not drink',
        'does not drink',
        'not drinking',
        'are drink',
      ],
    ],
  ),
  unit(
    'present-continuous',
    'grammar',
    'Present Continuous',
    'Present Continuous',
    ['present-simple'],
    'Use am/is/are + -ing for an action happening now or a temporary situation.',
    [
      ['Please wait: I ___ dinner now.', 'am cooking', 'cook', 'cooked', 'have cook'],
      ['They ___ with their aunt this week.', 'are staying', 'stays', 'is staying', 'have stay'],
      ['Look! The bus ___.', 'is coming', 'come', 'has come yesterday', 'coming'],
    ],
  ),
  unit(
    'past-simple',
    'grammar',
    'Past Simple',
    'Past Simple',
    ['present-simple'],
    'Use Past Simple for a finished past time; after did use the base form.',
    [
      ['Yesterday we ___ the museum.', 'visited', 'visit', 'have visit', 'visiting'],
      ['Did she ___ the tickets?', 'buy', 'bought', 'buys', 'buying'],
      ['He ___ at home last night.', 'was not', 'is not', 'has not', 'does not'],
    ],
  ),
  unit(
    'present-perfect',
    'grammar',
    'Present Perfect',
    'Present Perfect',
    ['past-simple'],
    'Use have/has + past participle for experience or a past action connected to now; finished dates take Past Simple.',
    [
      ['I ___ never seen snow before.', 'have', 'did', 'am', 'was'],
      ['She has lived here ___ 2020.', 'since', 'for', 'during', 'ago'],
      ['We ___ already finished the report.', 'have', 'did', 'are', 'were'],
    ],
  ),
  unit(
    'future-forms',
    'grammar',
    'Future forms',
    'Майбутній час',
    ['present-continuous'],
    'Use going to for prior plans, will for an immediate decision, and Present Continuous for arrangements.',
    [
      ['The phone is ringing. I ___ answer it.', 'will', 'was', 'did', 'have'],
      ['We bought tickets. We ___ fly tomorrow.', 'are going to', 'went to', 'have', 'were'],
      ['I ___ meeting Jo at six; we arranged it yesterday.', 'am', 'will', 'have', 'did'],
    ],
  ),
  unit(
    'conditionals',
    'grammar',
    'Conditionals',
    'Умовні речення',
    ['past-simple', 'future-forms'],
    'First conditional: if + present, will + base. Second: if + past, would + base for an imagined situation.',
    [
      ['If it rains, we ___ stay inside.', 'will', 'would to', 'did', 'are'],
      ['If I had more time, I ___ learn Italian.', 'would', 'will', 'am', 'have'],
      ['If you heat ice, it ___.', 'melts', 'melted yesterday', 'would to melt', 'is melt'],
    ],
  ),
  unit(
    'passive-voice',
    'grammar',
    'Passive Voice',
    'Пасивний стан',
    ['past-simple'],
    'Passive voice uses be + past participle and focuses on the receiver of an action.',
    [
      ['This bridge ___ built in 1990.', 'was', 'is being tomorrow', 'has', 'did'],
      ['English ___ spoken here.', 'is', 'does', 'has', 'are'],
      ['The windows were ___ yesterday.', 'cleaned', 'clean', 'cleaning', 'cleans'],
    ],
  ),
  unit(
    'modal-verbs',
    'grammar',
    'Modal verbs',
    'Модальні дієслова',
    ['present-simple'],
    'Use a base verb after a modal. Must expresses obligation; should advice; might possibility.',
    [
      ['You ___ wear a seat belt: it is compulsory.', 'must', 'might', 'would to', 'are'],
      ['You look tired. You ___ rest.', 'should', 'have', 'are', 'did'],
      ['It ___ rain later, but I am not sure.', 'might', 'must always', 'has', 'is'],
    ],
  ),
  unit(
    'articles',
    'grammar',
    'Articles',
    'Артиклі',
    [],
    'Use a/an for a nonspecific singular count noun and the when the listener can identify it.',
    [
      ['She is ___ engineer.', 'an', 'a', 'some', 'many'],
      ['I saw a dog. ___ dog was brown.', 'The', 'A', 'An', 'Many'],
      ['We need ___ umbrella.', 'an', 'a', 'many', 'these'],
    ],
  ),
  unit(
    'prepositions',
    'grammar',
    'Prepositions',
    'Прийменники',
    [],
    'Prepositions depend on meaning and collocation: interested in, good at, arrive at a small place.',
    [
      ['He is interested ___ robotics.', 'in', 'on', 'at', 'to'],
      ['The meeting starts ___ Monday.', 'on', 'in', 'at', 'by yesterday'],
      ['She is good ___ solving puzzles.', 'at', 'on', 'for', 'to'],
    ],
  ),
  unit(
    'reported-speech',
    'grammar',
    'Reported Speech',
    'Непряма мова',
    ['past-simple', 'present-perfect'],
    'Reported statements often backshift tense. Reported questions use statement word order.',
    [
      ['He said that he ___ tired.', 'was', 'is be', 'were', 'has'],
      ['She asked where I ___.', 'lived', 'did I live', 'do I live', 'living'],
      ['They told me they ___ help.', 'would', 'will to', 'are', 'did'],
    ],
  ),
  unit(
    'word-meaning',
    'vocabulary',
    'Meaning in context',
    'Значення в контексті',
    [],
    'Infer a word from the surrounding situation, not a single translation.',
    [
      [
        'A reliable friend is someone who ___.',
        'can be trusted',
        'always arrives late',
        'never listens',
        'speaks loudly',
      ],
      [
        'To improve a design means to ___.',
        'make it better',
        'throw it away',
        'copy its name',
        'make it worse',
      ],
      [
        'A crowded train has ___.',
        'many passengers',
        'no passengers',
        'one driver only',
        'no seats by definition',
      ],
    ],
  ),
  unit(
    'collocations',
    'vocabulary',
    'Everyday collocations',
    'Типові словосполучення',
    ['word-meaning'],
    'Some words naturally combine: make a decision, do homework, take a break.',
    [
      ['We need to ___ a decision.', 'make', 'do', 'give', 'put'],
      ['I usually ___ my homework after dinner.', 'do', 'make', 'take', 'keep'],
      ['Let us ___ a break.', 'take', 'do', 'make', 'set'],
    ],
  ),
  unit(
    'word-formation',
    'vocabulary',
    'Word formation',
    'Словотвір',
    ['word-meaning'],
    'Choose noun, adjective or adverb according to its role in the sentence.',
    [
      ['She answered the question ___.', 'carefully', 'careful', 'care', 'caringness'],
      ['His ___ helped the team succeed.', 'kindness', 'kindly', 'kind', 'kinder'],
      ['The instructions are very ___.', 'helpful', 'helpfully', 'help', 'helpingness'],
    ],
  ),
  unit(
    'reading-main',
    'reading',
    'Main idea',
    'Головна думка',
    [],
    'The main idea summarizes the whole passage rather than one small detail.',
    [
      [
        'Lina cycles to work to save money and reduce pollution. The main idea is ___.',
        'why Lina cycles',
        'how to repair a bicycle',
        'the price of a train',
        'the history of roads',
      ],
      [
        'A library offers books, classes and quiet study rooms. It supports ___.',
        'several ways to learn',
        'only book sales',
        'sports competitions',
        'car repairs',
      ],
      [
        'Tom practised daily and gradually improved. The passage emphasizes ___.',
        'regular practice',
        'instant success',
        'expensive equipment',
        'avoiding mistakes forever',
      ],
    ],
  ),
  unit(
    'reading-detail',
    'reading',
    'Finding details',
    'Пошук деталей',
    ['reading-main'],
    'Scan for the detail asked for and distinguish it from nearby distractors.',
    [
      [
        'The club meets on Friday at 5, not Thursday. Which day?',
        'Friday',
        'Thursday',
        'Saturday',
        'Monday',
      ],
      [
        'Mia borrowed a book from Ali and returned it to him. Who owns it?',
        'Ali',
        'Mia',
        'the narrator',
        'no one',
      ],
      ['The bus costs £3; a return ticket costs £5. A return costs ___.', '£5', '£3', '£8', '£6'],
    ],
  ),
  unit(
    'reading-inference',
    'reading',
    'Inference',
    'Висновки з тексту',
    ['reading-detail'],
    'An inference must be supported by clues, not an invented fact.',
    [
      [
        'Eva took an umbrella after looking at dark clouds. She probably expected ___.',
        'rain',
        'snow for certain',
        'a birthday',
        'a train delay',
      ],
      [
        'Ben whispered because the baby was asleep. He wanted to ___.',
        'avoid waking the baby',
        'wake everyone',
        'test a microphone',
        'leave the house',
      ],
      [
        'Sara checked the address twice before leaving. She likely wanted to ___.',
        'avoid going to the wrong place',
        'buy a new phone',
        'cancel all plans',
        'change her name',
      ],
    ],
  ),
  unit(
    'writing-linking',
    'writing',
    'Linking ideas',
    'Зв’язок думок',
    [],
    'Use because for a reason, although for contrast and therefore for a result.',
    [
      ['I stayed home ___ I was ill.', 'because', 'although', 'however', 'unless'],
      ['___ it was cold, we went outside.', 'Although', 'Because of', 'Therefore', 'Despite of'],
      [
        'The train was cancelled; ___, we took a bus.',
        'therefore',
        'although',
        'unless',
        'because of',
      ],
    ],
  ),
  unit(
    'writing-paragraph',
    'writing',
    'Paragraph structure',
    'Будова абзацу',
    ['writing-linking'],
    'A paragraph needs a clear main point and relevant supporting details.',
    [
      [
        'A paragraph about cycling benefits should include ___.',
        'how cycling improves fitness',
        'a recipe for soup',
        'a list of film titles',
        'an unrelated phone number',
      ],
      [
        'The best opening for a paragraph about learning languages is ___.',
        'Learning languages offers several benefits.',
        'My shoes are blue.',
        'It rained once.',
        'The end.',
      ],
      [
        'After stating an opinion, add ___.',
        'a reason or example',
        'unrelated facts',
        'only punctuation',
        'the same sentence repeatedly',
      ],
    ],
  ),
  unit(
    'writing-register',
    'writing',
    'Polite messages',
    'Ввічливі повідомлення',
    ['writing-paragraph'],
    'Match register to the reader and make a clear, polite request.',
    [
      [
        'To request information politely, write ___.',
        'Could you send me the details, please?',
        'Send it now!',
        'You are wrong.',
        'No details.',
      ],
      ['An appropriate formal greeting is ___.', 'Dear Ms Brown,', 'Yo mate!', 'Bye!', 'What?'],
      [
        'A useful subject line for a course enquiry is ___.',
        'Question about the evening course',
        'Hello????',
        'Nothing',
        'Random news',
      ],
    ],
  ),
  unit(
    'listening-gist',
    'listening',
    'Listening: gist strategies',
    'Аудіювання: загальний зміст',
    [],
    'This text-based task checks listening strategies, not acoustic comprehension.',
    [
      [
        'On a first listen, focus on ___.',
        'the overall topic',
        'writing every word',
        'translating every sound',
        'one unknown word only',
      ],
      [
        'If you miss one word, you should ___.',
        'keep listening for context',
        'stop attending entirely',
        'invent the rest',
        'assume every answer is wrong',
      ],
      [
        'To prepare for a travel announcement, predict ___.',
        'times and destinations',
        'cooking ingredients',
        'book authors only',
        'shoe sizes',
      ],
    ],
  ),
  unit(
    'listening-detail',
    'listening',
    'Listening: detail strategies',
    'Аудіювання: деталі',
    ['listening-gist'],
    'Notice corrections, numbers and negatives. Text tasks assess strategies only.',
    [
      [
        'The transcript says: platform four, sorry, platform five. The corrected platform is ___.',
        'five',
        'four',
        'nine',
        'unknown',
      ],
      [
        'Not before six means ___.',
        'six or later',
        'always five',
        'any time before six',
        'exactly midnight',
      ],
      ['The speaker says fifteen, not fifty. The number is ___.', '15', '50', '5', '150'],
    ],
  ),
  unit(
    'listening-intent',
    'listening',
    'Listening: speaker intent',
    'Аудіювання: намір',
    ['listening-detail'],
    'Use words and context to infer intent. Tone and acoustic fluency require audio evidence.',
    [
      [
        'Could you close the window? is usually ___.',
        'a polite request',
        'a past event',
        'a threat by definition',
        'a timetable',
      ],
      [
        'I am sorry I missed your call expresses ___.',
        'an apology',
        'a command',
        'a price',
        'a location',
      ],
      [
        'Why not try the train? offers ___.',
        'a suggestion',
        'a certainty',
        'a complaint only',
        'a date',
      ],
    ],
  ),
  unit(
    'speaking-relevance',
    'speaking',
    'Relevant responses',
    'Відповідь по темі',
    [],
    'Answer the actual question and add relevant detail. This is a response-choice task, not spoken proficiency.',
    [
      [
        'Asked: How do you get to school? A relevant answer is ___.',
        'I take the bus because it is quick.',
        'My favourite food is rice.',
        'It was red.',
        'Seven apples.',
      ],
      [
        'Asked: Why do you enjoy reading? Answer ___.',
        'It helps me explore new ideas.',
        'At six o clock.',
        'On the table.',
        'My shoes fit.',
      ],
      [
        'Asked: What did you do yesterday? Answer ___.',
        'I visited my cousin.',
        'I will go tomorrow.',
        'Blue is nice.',
        'I am twelve metres.',
      ],
    ],
  ),
  unit(
    'speaking-interaction',
    'speaking',
    'Conversation strategies',
    'Стратегії розмови',
    ['speaking-relevance'],
    'Ask for clarification, take turns and respond to your partner. These tasks do not assess pronunciation.',
    [
      [
        'If you do not understand, say ___.',
        'Could you explain what you mean?',
        'You must stop forever.',
        'I refuse all questions.',
        'The weather is a number.',
      ],
      [
        'To invite a partner to contribute, ask ___.',
        'What do you think?',
        'Why are you always wrong?',
        'Be quiet.',
        'I will answer for you.',
      ],
      [
        'To check understanding, say ___.',
        'Do you mean we should leave now?',
        'I never listen.',
        'It is definitely false.',
        'No one can speak.',
      ],
    ],
  ),
  unit(
    'speaking-complexity',
    'speaking',
    'Extending an answer',
    'Розгорнута відповідь',
    ['speaking-relevance', 'writing-linking'],
    'Extend a clear answer with a reason, example or contrast; length alone is not quality.',
    [
      [
        'A useful extension of I like cycling is ___.',
        'because it helps me relax.',
        'and and and and.',
        'blue seven running.',
        'cycling cycling cycling.',
      ],
      [
        'To contrast two options, use ___.',
        'whereas',
        'because of of',
        'and and and',
        'yesterday tomorrow',
      ],
      [
        'A clear example begins ___.',
        'For example,',
        'But because although,',
        'Never words,',
        'The the the,',
      ],
    ],
  ),
];
export function englishQuestion(id: string, n: number) {
  const u = englishUnits.find((u) => u.id === id);
  if (!u) return null;
  const row = u.rows[n % 3],
    mode = Math.floor(n / 3),
    answer = row[1];
  let prompt = row[0],
    options = row.slice(1),
    reason = u.rule;
  if (mode === 1) {
    prompt = 'Choose the completed response that fits the context: ' + row[0];
    options = row
      .slice(1)
      .map((x) => (row[0].includes('___') ? row[0].replace('___', x) : 'The answer is ' + x + '.'));
  }
  if (mode === 2) {
    prompt = 'Explain the correct choice in: ' + row[0].replace('___', answer);
    options = [
      u.rule,
      'Any longer answer is always correct.',
      'Context and grammar do not matter.',
      'Repeating a word always changes its meaning.',
    ];
    reason = u.rule;
  }
  const rotate = n % 4,
    shuffled = [...options.slice(rotate), ...options.slice(0, rotate)];
  return {
    id: id + '-' + n,
    skill_id: id,
    difficulty: Math.floor(n / 3) + 1,
    prompt: { en: prompt, uk: 'Обери правильний варіант: ' + prompt },
    options: shuffled,
    answer: shuffled.indexOf(options[0]),
    reasoning: { en: reason, uk: reason },
    hints: [
      { en: 'Read the context first.', uk: 'Спочатку прочитай контекст.' },
      { en: u.rule, uk: u.rule },
      { en: 'Check the sentence structure and meaning.', uk: 'Перевір будову речення та зміст.' },
      {
        en: 'Eliminate choices that contradict the context.',
        uk: 'Відкинь варіанти, що суперечать контексту.',
      },
      { en: 'Correct choice: ' + options[0], uk: 'Правильний варіант: ' + options[0] },
    ],
  };
}
