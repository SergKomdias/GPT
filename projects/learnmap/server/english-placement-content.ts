export const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type Strand = 'grammar' | 'vocabulary' | 'reading' | 'writing' | 'listening' | 'speaking';
export type EnglishTask = {
  id: string;
  strand: Strand;
  subskill: string;
  level: number;
  kind: 'choice' | 'short' | 'writing' | 'listening' | 'speaking';
  prompt: string;
  options?: string[];
  answer?: number;
  accepted?: string[];
  passage?: string;
  script?: string;
  words?: [number, number];
  reason?: string;
};
// Controlled production is grammar evidence only. It never becomes Writing/Speaking evidence.
type Row = [
  subskill: string,
  prompt: string,
  right: string,
  wrong1: string,
  wrong2: string,
  wrong3: string,
];
const grammar: Row[][] = [
  [
    [
      'tense-context',
      'My sister ___ in a small town.',
      'lives',
      'live',
      'living',
      'lived yesterday',
    ],
    ['articles', 'I saw ___ elephant at the zoo.', 'an', 'a', 'the one', 'any'],
    [
      'prepositions',
      'The keys are ___ the table, beside the book.',
      'on',
      'into',
      'between',
      'through',
    ],
    [
      'modals',
      'You ___ park here. The sign says "No parking".',
      'must not',
      'do not have',
      'can to',
      'must to',
    ],
    [
      'tense-contrast',
      'Look! It ___ outside.',
      'is snowing',
      'snows every winter',
      'snow',
      'has snow yesterday',
    ],
    [
      'relative-clauses',
      'That is the woman ___ teaches us English.',
      'who',
      'which',
      'where',
      'when',
    ],
  ],
  [
    [
      'tense-contrast',
      'I ___ dinner when the phone rang.',
      'was cooking',
      'cook',
      'have cooked tomorrow',
      'am cook',
    ],
    [
      'conditionals',
      'If it rains tomorrow, we ___ indoors.',
      'will stay',
      'would stayed',
      'stayed',
      'are stay yesterday',
    ],
    ['gerund-infinitive', 'She enjoys ___ in the lake.', 'swimming', 'to swimming', 'swim', 'swam'],
    [
      'passive',
      'These bicycles ___ in this factory every year.',
      'are made',
      'made',
      'are making',
      'have make',
    ],
    ['articles', 'We visited a museum. ___ museum closed at six.', 'The', 'A', 'An', 'Any'],
    [
      'prepositions',
      'I have waited here ___ half an hour.',
      'for',
      'since',
      'during the yesterday',
      'from tomorrow',
    ],
  ],
  [
    [
      'tense-contrast',
      'I ___ three emails so far today, but yesterday I wrote ten.',
      'have written',
      'had written',
      'have been writing',
      'had been writing',
    ],
    [
      'conditionals',
      'If I had more free time now, I ___ a language club.',
      'would join',
      'would have joined',
      'had joined',
      'have joined',
    ],
    [
      'reported-speech',
      'On Monday: "I am tired." On Tuesday she said that she ___ tired the day before.',
      'had been',
      'would be',
      'has been',
      'will have been',
    ],
    [
      'modals',
      'Choose the strongest negative deduction, not a possibility or an obligation: "Their car is gone and nobody answers. They ___ be at home."',
      'cannot',
      'might not',
      'must',
      'need not',
    ],
    [
      'relative-clauses',
      'The student ___ project won the prize thanked her teacher.',
      'whose',
      'who',
      'which',
      'where',
    ],
    [
      'passive',
      'The bridge ___ before the road reopened last year.',
      'had been repaired',
      'has been repaired',
      'had repaired',
      'would be repairing',
    ],
  ],
  [
    [
      'conditionals',
      'If she had accepted that job, she ___ in Berlin now.',
      'would be living',
      'will have lived',
      'had been living',
      'has lived',
    ],
    [
      'gerund-infinitive',
      'I remember ___ the door, so I am surprised it is open.',
      'locking',
      'to lock',
      'to have locked',
      'lock',
    ],
    [
      'complex-structures',
      'Hardly had the train left ___ the storm began.',
      'when',
      'than',
      'then',
      'that',
    ],
    [
      'modals',
      'You bought tickets, but it was unnecessary: you ___ bought them because admission was free.',
      'need not have',
      'must not have',
      'might not have',
      'should have',
    ],
    [
      'relative-clauses',
      'The proposal, ___ several members objected, was postponed.',
      'to which',
      'which',
      'for which',
      'to that',
    ],
    [
      'tense-contrast',
      'By the end of next month, I ___ here for ten years.',
      'will have been working',
      'have been working',
      'had been working',
      'will be working',
    ],
  ],
  [
    [
      'complex-structures',
      'Not until the data had been independently checked ___ published.',
      'were the results',
      'the results were',
      'had the results',
      'the results have been',
    ],
    [
      'conditionals',
      '___ it not been for the grant, the project would have been abandoned.',
      'Had',
      'Were',
      'Should',
      'Would',
    ],
    [
      'modals',
      'He may well have misunderstood the brief. This expresses…',
      'a plausible explanation without certainty',
      'a definite obligation',
      'a proven impossibility',
      'a future command',
    ],
    [
      'passive',
      'The documents are believed ___ during the move last year.',
      'to have been lost',
      'to be lost',
      'having been lost',
      'to have lost',
    ],
    [
      'complex-structures',
      'Much ___ I admire the proposal, its cost remains a concern.',
      'as',
      'that',
      'despite',
      'however',
    ],
    [
      'reported-speech',
      'She denied ___ the confidential figures to anyone.',
      'having disclosed',
      'to have disclosed',
      'to disclose',
      'have disclosed',
    ],
  ],
];
const vocabulary: Row[][] = [
  [
    ['basic-meaning', 'You need a ___ to open this door.', 'key', 'cloud', 'spoon', 'river'],
    ['context-choice', 'It is cold outside. Put on your ___.', 'coat', 'plate', 'ticket', 'pencil'],
    ['collocations', 'Please ___ a photo of us.', 'take', 'do', 'make to', 'give out'],
    [
      'meaning-context',
      'The shop is closed. We must come back ___.',
      'later',
      'never yesterday',
      'inside the price',
      'heavy',
    ],
    [
      'register',
      'Which greeting suits a friend?',
      'Hi, Sam!',
      'To whom it may concern',
      'Yours faithfully',
      'Dear Sir or Madam',
    ],
    [
      'word-formation',
      'A person who teaches is a ___.',
      'teacher',
      'teachingly',
      'teachful',
      'teachness',
    ],
  ],
  [
    [
      'phrasal-verbs',
      'Please ___ the lights before you leave.',
      'turn off',
      'look after',
      'give up on',
      'get over',
    ],
    ['collocations', 'I need to ___ my homework before dinner.', 'do', 'make', 'take', 'hold'],
    ['near-synonyms', 'I missed the bus, so I arrived ___.', 'late', 'latest', 'lately', 'laterly'],
    [
      'word-formation',
      'The instructions were easy to understand: very ___.',
      'clear',
      'clearly',
      'clearness',
      'clearing',
    ],
    [
      'meaning-context',
      'Can you lend me your pen? The speaker wants to…',
      'use it temporarily and return it',
      'buy it permanently',
      'give away their own pen',
      'repair it',
    ],
    [
      'register',
      'Which request is polite in a café?',
      'Could I have some water, please?',
      'Water. Now.',
      'You must water me.',
      'Give water, you.',
    ],
  ],
  [
    [
      'collocations',
      'The committee will ___ a decision tomorrow.',
      'make',
      'do',
      'have out',
      'put off from',
    ],
    [
      'phrasal-verbs',
      'We have ___ paper, so we cannot print the report.',
      'run out of',
      'looked up to',
      'come across with',
      'put up at',
    ],
    [
      'word-formation',
      'Her explanation was very ___; it helped us solve the problem.',
      'helpful',
      'helplessly',
      'helpfulness',
      'helpingness',
    ],
    [
      'near-synonyms',
      'Can you ___ me to send the email tonight?',
      'remind',
      'remember',
      'recall',
      'memorise',
    ],
    [
      'meaning-context',
      'The plan is feasible, but it will require extra funding. "Feasible" means…',
      'possible to carry out',
      'already completed',
      'certain to fail',
      'cheap by definition',
    ],
    [
      'register',
      'Which sentence suits a formal email to an organiser?',
      'I would like to enquire about the schedule.',
      'Hey, tell me the stuff.',
      'Gimme times!',
      'Schedule me now, mate.',
    ],
  ],
  [
    [
      'collocations',
      'The new evidence ___ serious doubts about the claim.',
      'casts',
      'launches',
      'sets',
      'makes',
    ],
    [
      'phrasal-verbs',
      'The study was expected to confirm a theory, but its contradictory results ended up ___ it.',
      'calling into question',
      'bearing out',
      'building on',
      'accounting for',
    ],
    [
      'word-formation',
      'The findings are promising, but the sample is not ___.',
      'representative',
      'representation',
      'representatively',
      'represent',
    ],
    [
      'near-synonyms',
      'The results were ___: two teams obtained opposite conclusions.',
      'inconsistent',
      'inconclusive',
      'incomplete',
      'inaccurate',
    ],
    [
      'register',
      'Preserve the meaning of "a lot of people quit" in a formal report.',
      'A substantial number of participants withdrew.',
      'The majority of participants were dismissed.',
      'All participants completed their involvement.',
      'A limited number of participants were temporarily absent.',
    ],
    [
      'meaning-context',
      'The report qualifies its recommendation by noting the cost. Here "qualifies" means…',
      'limits or adds conditions to',
      'awards a certificate to',
      'withdraws every claim in',
      'translates',
    ],
  ],
  [
    [
      'near-synonyms',
      'The evidence is consistent with the hypothesis, but alternative explanations remain. It therefore does not ___ it.',
      'conclusively establish',
      'lend credence to',
      'provide grounds for considering',
      'appear compatible with',
    ],
    [
      'register',
      'Which phrase most cautiously reports evidence compatible with, but insufficient to confirm, a hypothesis?',
      'The findings lend tentative support to the hypothesis.',
      'The findings substantiate the hypothesis beyond reasonable doubt.',
      'The findings are immaterial to the hypothesis.',
      'The findings render the hypothesis untenable.',
    ],
    [
      'collocations',
      'The policy may ___ unintended consequences.',
      'entail',
      'perform',
      'conduct',
      'fulfil',
    ],
    [
      'phrasal-verbs',
      'By describing the risks as negligible, the minister sought to ___ concerns without changing policy.',
      'play down',
      'bring about',
      'act on',
      'give rise to',
    ],
    [
      'word-formation',
      'The apparent agreement concealed substantial ___.',
      'divergence',
      'divergent',
      'divergently',
      'diverged',
    ],
    [
      'meaning-context',
      'A "qualified endorsement" is…',
      'support expressed with reservations',
      'unconditional enthusiasm',
      'a refusal to consider evidence',
      'an endorsement by any professional',
    ],
  ],
];
export const readingPassages = [
  `Mia lives near a small park. Every Saturday she walks there with her brother Leo. They usually play with a ball, but today it is raining. They go to the library instead. Mia chooses a book about animals. Leo uses a computer to find pictures of trains. At twelve they meet their father outside. He has sandwiches for lunch. They eat together at home and decide to visit the park on Sunday if the weather is better.`,
  `Our school garden opened in March. At first, only six students joined the gardening club. They met after school on Wednesdays and planted beans, carrots and flowers. In April, some plants became dry because nobody watered them during a holiday. The students made a new plan: each person would visit on a different day. They also put a small notebook by the gate to record their work. By June, the garden looked much better. The club sold a few vegetables at the school fair and used the money to buy tools. Next year, they hope more younger students will join.`,
  `When a small town library announced that it would lend tools as well as books, some residents were doubtful. They worried that borrowed drills and gardening equipment would quickly be damaged. Others wondered why a library should become involved in practical work at all. The librarian explained that the project had the same purpose as lending books: giving people access to things they might need but could not afford to buy.
During the first three months, the library lent out eighty tools. Most were returned on time and in good condition. However, staff discovered that several borrowers did not know how to use them safely. Instead of ending the scheme, volunteers began offering short demonstrations on Saturday mornings. Attendance was low initially, so the library moved the demonstrations to the afternoon, when more families could attend.
The project has not solved every problem. Storage space is limited, and maintaining equipment costs money. Nevertheless, a survey found that many borrowers had completed repairs they would otherwise have postponed. The library now plans to expand slowly, using donations and checking demand before purchasing anything new. Its experience suggests that an unusual service can succeed when organisers are willing to adjust their plans.`,
  `A city recently introduced a six-month trial in which one busy street was closed to private cars on weekends. The aim was to make the area safer for pedestrians and encourage people to spend time in local shops. Before the trial, several business owners predicted a sharp fall in sales. They argued that customers carrying heavy purchases would choose shopping centres with large car parks instead.
The first month seemed to support these concerns. Sales in some shops declined, and deliveries were occasionally delayed because drivers misunderstood the new arrangements. However, the council then improved signs, created a nearby collection point and allowed deliveries early in the morning. By the fourth month, the number of pedestrians had risen substantially. Cafés reported higher income, while results for other businesses remained mixed. A furniture shop continued to struggle, whereas a bookshop attracted customers who said they had previously avoided the noisy street.
The council's report described the trial as a success, but an independent researcher urged caution. The trial coincided with an unusually warm summer and a local arts festival, both of which may have attracted visitors regardless of the traffic restrictions. Moreover, sales figures were supplied voluntarily, so businesses with particularly positive or negative experiences may have been more likely to respond.
None of this proves that the policy failed. It does mean that a simple comparison of sales before and during the trial cannot establish its precise effect. The researcher recommended comparing the area with similar streets and repeating the study across different seasons. The debate therefore concerns not only whether residents liked the quieter street, but also how confidently the available evidence can support a permanent change.`,
  `The appeal of a single performance indicator is understandable: it compresses a complicated institution into a number that can be compared, ranked and communicated. Yet the very act of measuring can alter the activity being measured. When a school is judged primarily by examination results, for instance, allocating more time to the tested material may be entirely rational, even if this leaves other valuable learning neglected.
It would be misleading to infer that measurement is therefore inherently harmful. Without records, systematic inequalities can remain invisible, and confident claims of improvement may rest on little more than selective memory. The difficulty lies in mistaking a useful signal for an exhaustive account of quality. An indicator can be informative while remaining incomplete; acknowledging its limits need not diminish its practical value.
One response is to multiply the indicators. This can reveal dimensions that a single measure misses, but it also introduces new choices about weighting and interpretation. A composite score may appear neutral even though it embeds contestable assumptions about which outcomes matter most. Furthermore, an elaborate dashboard is not automatically more transparent to those whose work it evaluates.
A more defensible approach treats numerical indicators as invitations to inquiry. Unexpected changes should prompt investigation rather than immediate praise or punishment. Qualitative accounts, independent observation and the perspectives of affected participants can help distinguish genuine improvement from changes in reporting or incentives. Such an approach demands time and judgement, qualities that ranking systems are often designed to economise on.
The central question is consequently not whether institutions should measure their performance, but how measurement can remain accountable to their purposes. Numbers are most useful when they help people ask better questions. They become least trustworthy when the convenience of comparison is allowed to determine what counts as success.`,
];
const readingChecks: Row[][] = [
  [
    [
      'gist',
      'What is the text mainly about?',
      'A family changing its Saturday plans',
      'A train accident',
      'Buying a new computer',
      'A school examination',
    ],
    [
      'detail',
      'Where do they eat lunch?',
      'At home',
      'In the park',
      'On a train',
      'In the library',
    ],
    [
      'inference',
      'Why do they not play in the park today?',
      'The weather is wet',
      'The park is closed forever',
      'They have no ball',
      'Their father dislikes parks',
    ],
    [
      'meaning-context',
      '"Instead" shows that they…',
      'choose a different activity',
      'repeat the same activity',
      'finish reading',
      'travel faster',
    ],
    [
      'author-intention',
      'The writer describes…',
      'an ordinary family day',
      'rules for train drivers',
      'an argument about computers',
      'a scientific experiment',
    ],
  ],
  [
    [
      'gist',
      'What is the main idea?',
      'A school club learns to look after a garden',
      'A shop sells computers',
      'A family moves home',
      'A teacher ends all clubs',
    ],
    [
      'detail',
      'What did the club buy with money from the fair?',
      'Tools',
      'A gate',
      'Computers',
      'Sandwiches',
    ],
    [
      'inference',
      'Why did the new watering plan help?',
      'Responsibility was shared across days',
      'It made rain more frequent',
      'It removed all plants',
      'It closed the garden',
    ],
    [
      'meaning-context',
      '"Record their work" means…',
      'write down what they did',
      'sell their vegetables',
      'listen to music',
      'stop working',
    ],
    [
      'author-intention',
      'The writer mainly wants to…',
      'describe the club’s progress',
      'persuade everyone to avoid gardening',
      'explain a complex scientific theory',
      'criticise every student',
    ],
  ],
  [
    [
      'gist',
      'What is the main message?',
      'A lending project improved by responding to problems',
      'Libraries should stop lending books',
      'Borrowers always damage equipment',
      'A town closed its library',
    ],
    [
      'detail',
      'Why were demonstrations moved to afternoons?',
      'More families could attend',
      'The tools worked only then',
      'Staff disliked mornings in every season',
      'The library had no lights',
    ],
    [
      'inference',
      'Why does the library plan to expand slowly?',
      'It wants growth to match resources and demand',
      'It has decided the project failed',
      'All residents oppose the project',
      'It has unlimited storage',
    ],
    [
      'meaning-context',
      'Repairs people would have "postponed" were repairs they would have…',
      'done at a later time',
      'completed earlier',
      'given to the library permanently',
      'forgotten how to describe',
    ],
    [
      'author-intention',
      'The author presents the project as…',
      'promising but still facing practical limits',
      'a perfect solution with no costs',
      'a mistake that should end immediately',
      'an unrelated national law',
    ],
  ],
  [
    [
      'gist',
      'What is the central issue?',
      'How confidently the trial’s effects can be inferred',
      'Whether books should be banned',
      'How to build a furniture shop',
      'Why summer never affects shopping',
    ],
    [
      'detail',
      'What did the council change after the first month?',
      'Signs, collection arrangements and delivery access',
      'All shop prices',
      'The length of every working week',
      'The city’s climate',
    ],
    [
      'inference',
      'Why mention the arts festival?',
      'It is an alternative explanation for increased visitors',
      'It proves the restrictions had no effect',
      'It shows all businesses responded',
      'It explains the furniture shop’s exact losses',
    ],
    [
      'meaning-context',
      '"Results remained mixed" means…',
      'different businesses experienced different outcomes',
      'all sales fell equally',
      'nobody supplied any information',
      'the report contained no figures',
    ],
    [
      'author-intention',
      'The researcher’s caution is intended to…',
      'improve the basis for a permanent decision',
      'prove pedestrians are unimportant',
      'claim measurement is impossible',
      'reject every possible traffic policy',
    ],
  ],
  [
    [
      'gist',
      'Which statement best captures the argument?',
      'Indicators should inform inquiry without replacing judgement',
      'All numerical records should be abandoned',
      'More indicators always remove bias',
      'Rankings define quality without assumptions',
    ],
    [
      'detail',
      'What can a composite score conceal?',
      'Disputable choices about the importance of outcomes',
      'The existence of numbers',
      'The identity of every observer',
      'An automatic guarantee of fairness',
    ],
    [
      'inference',
      'The phrase "economise on" implies that rankings often…',
      'reduce the time and judgement required for evaluation',
      'increase every institution’s budget',
      'eliminate the need for any data',
      'make qualitative evidence mathematically exact',
    ],
    [
      'meaning-context',
      'A "defensible approach" is one that…',
      'can be justified with sound reasons',
      'cannot be questioned',
      'is physically protected',
      'costs nothing',
    ],
    [
      'author-intention',
      'Why does the author acknowledge benefits of measurement?',
      'To distinguish criticism of misuse from rejection of measurement',
      'To retract the entire argument',
      'To claim indicators are complete',
      'To present a ranking of schools',
    ],
  ],
];
export const englishPlacementTasks: EnglishTask[] = [];
for (const [strand, bank] of [
  ['grammar', grammar],
  ['vocabulary', vocabulary],
  ['reading', readingChecks],
] as const) {
  bank.forEach((rows, index) =>
    rows.forEach(([subskill, prompt, right, ...wrong], i) => {
      const level = index + 1;
      englishPlacementTasks.push({
        id: `en-v4-${strand}-${level}-${i}`,
        strand,
        subskill,
        level,
        kind: 'choice',
        prompt,
        options: [right, ...wrong],
        answer: 0,
        ...(strand === 'reading' ? { passage: readingPassages[index] } : {}),
      });
    }),
  );
}
const repairs: [number, string, string, string[]][] = [
  [1, 'tense-context', 'Complete: She ___ (be) at home.', ['is']],
  [2, 'tense-contrast', 'Complete: Yesterday I ___ (go) to the library.', ['went']],
  [3, 'tense-contrast', 'Complete: I ___ (know) her since 2020.', ['have known']],
  [
    4,
    'transformations',
    'Rewrite using UNLESS: If you do not leave now, you will miss the bus.',
    ['Unless you leave now, you will miss the bus.', 'You will miss the bus unless you leave now.'],
  ],
  [
    4,
    'transformations',
    'Rewrite beginning "Despite": Although it was raining, they continued the match.',
    [
      'Despite the rain, they continued the match.',
      'Despite it raining, they continued the match.',
      'Despite the fact that it was raining, they continued the match.',
    ],
  ],
  [
    5,
    'complex-structures',
    'Rewrite beginning "Had": If I had known about the delay, I would have stayed at home.',
    ['Had I known about the delay, I would have stayed at home.'],
  ],
];
repairs.forEach(([level, subskill, prompt, accepted], i) =>
  englishPlacementTasks.push({
    id: `en-v4-production-${i}`,
    strand: 'grammar',
    subskill,
    level,
    kind: 'short',
    prompt,
    accepted,
  }),
);
const writing: [string, [number, number]][] = [
  ['Write a short message introducing yourself and describing your daily routine.', [25, 40]],
  [
    'Write an email inviting a friend to an activity. Say what it is, when and where it happens, and what your friend should bring.',
    [40, 60],
  ],
  [
    'Your school wants to start an after-school club. Write an email proposing one club, explaining two benefits and suggesting how to organise the first meeting.',
    [80, 120],
  ],
  [
    'Your town is considering replacing a car park with a public garden. Write a balanced article discussing benefits and drawbacks, and justify your recommendation.',
    [150, 180],
  ],
  [
    'Write a proposal evaluating two ways a school could assess progress beyond examinations. Discuss trade-offs, practical constraints and how success could be evaluated.',
    [200, 250],
  ],
];
writing.forEach(([prompt, words], i) =>
  englishPlacementTasks.push({
    id: `en-v4-writing-${i + 1}`,
    strand: 'writing',
    subskill: 'productive-writing',
    level: i + 1,
    kind: 'writing',
    prompt,
    words,
  }),
);
const listening: [string, string, string, string[]][] = [
  [
    'Hello, this is Anna. Our class starts at nine tomorrow, not ten. Please bring your blue book. We will meet in room five, next to the library. See you there.',
    'When does the class start?',
    'At nine',
    ['At ten', 'At five', 'At noon'],
  ],
  [
    'Hi Ben. I cannot meet you at the café at three because my bus is late. Could we meet at the station at half past three instead? I will call you when I arrive. Please do not wait outside the café.',
    'What change does the speaker request?',
    'A different meeting place and a later time',
    ['An earlier meeting at the café', 'Cancelling every meeting', 'Buying a bus ticket for her'],
  ],
  [
    'Good afternoon. The museum workshop will still take place on Saturday, but building repairs mean we must use the community hall across the road. Your ticket remains valid. Although the session was advertised for ten o’clock, please arrive fifteen minutes earlier so we can distribute materials. There is no need to bring your own equipment.',
    'Why should participants arrive early?',
    'To receive materials before the workshop',
    ['To buy replacement tickets', 'To repair the museum', 'To bring tools to the museum'],
  ],
  [
    'The committee has agreed to extend the cycle-lane trial, rather than make it permanent immediately. Initial surveys suggest that cyclists feel safer, but the traffic counts cover only a holiday period. We need to know whether the same pattern continues when schools reopen. Local businesses will also be invited to comment, since the earlier survey did not distinguish between different types of shop.',
    'Why is the trial being extended?',
    'The current evidence may not represent normal conditions',
    [
      'Cyclists unanimously rejected it',
      'All shops lost money',
      'The committee has already made it permanent',
    ],
  ],
  [
    'It would be premature to interpret the fall in reported complaints as proof of improved service. The reporting procedure was changed at the same time as the new service was introduced, and we have yet to establish whether users find the new form accessible. That does not invalidate the improvement claim, but it does mean that the figures should be treated as a starting point for investigation rather than as a conclusive verdict.',
    'What is the speaker’s position?',
    'The figures permit a possible improvement but do not establish it conclusively',
    [
      'The service definitely deteriorated',
      'All complaint data are useless',
      'The form change proves improvement',
    ],
  ],
];
listening.forEach(([script, prompt, right, wrong], i) => {
  englishPlacementTasks.push({
    id: `en-v4-listening-${i + 1}`,
    strand: 'listening',
    subskill: 'audio-comprehension',
    level: i + 1,
    kind: 'listening',
    script,
    prompt,
    options: [right, ...wrong],
    answer: 0,
  });
});
const speakingPrompts = [
  [
    'Tell me about your home and one thing you like there.',
    'Describe what you do on a normal school day.',
    'Your friend asks: "Can we meet after school?" Reply and suggest a time.',
  ],
  [
    'Describe a place you visited recently and what you did there.',
    'Explain an activity you enjoy and why.',
    'Your friend says: "I want to learn a new hobby but I have little money." Respond with a suggestion and ask a useful question.',
  ],
  [
    'Describe a challenge you faced and how you dealt with it.',
    'Compare studying alone with studying with friends. Give reasons.',
    'Your partner says: "I disagree that homework is useful. It takes all my free time." Respond to that point, explain your view and ask a follow-up question.',
  ],
  [
    'Explain a change you would make in your town and discuss its possible disadvantages.',
    'Compare two ways of learning a language and defend your recommendation for a busy student.',
    'Your partner says: "Online learning is cheaper, so schools should move entirely online." Challenge or qualify that argument and invite a response.',
  ],
  [
    'Evaluate the tension between measuring educational progress and protecting student creativity.',
    'Discuss an apparently beneficial policy that could have unintended consequences.',
    'Your partner argues: "Only measurable outcomes should influence public funding." Respond to the assumptions, acknowledge a counterargument and formulate a probing question.',
  ],
];
speakingPrompts.forEach((prompts, i) =>
  prompts.forEach((prompt, j) =>
    englishPlacementTasks.push({
      id: `en-v4-speaking-${i + 1}-${j}`,
      strand: 'speaking',
      subskill: j === 2 ? 'spoken-interaction' : 'spoken-production',
      level: i + 1,
      kind: 'speaking',
      prompt,
    }),
  ),
);
export const englishTaskById = (id: string) => englishPlacementTasks.find((t) => t.id === id);
