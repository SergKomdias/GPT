export type LocalText = { en: string; uk: string };
export const bi = (en: string, uk: string): LocalText => ({ en, uk });
type SeedSkill = {
  id: string;
  subject: string;
  topic: string;
  title: LocalText;
  pre: string[];
  score: number;
  explanation: LocalText;
};
const s = (
  id: string,
  subject: string,
  topic: string,
  en: string,
  uk: string,
  pre: string[],
  score: number,
  ex: string,
  ux: string,
): SeedSkill => ({ id, subject, topic, title: bi(en, uk), pre, score, explanation: bi(ex, ux) });
export const seedSkills: SeedSkill[] = [
  s(
    'arithmetic',
    'math',
    'arithmetic',
    'Arithmetic',
    'Арифметика',
    [],
    92,
    'Multiplication combines equal groups. Apply multiplication before addition.',
    'Множення об’єднує рівні групи. Виконуй множення перед додаванням.',
  ),
  s(
    'expressions',
    'math',
    'algebra',
    'Algebra basics',
    'Основи алгебри',
    ['arithmetic'],
    76,
    'Substitute the value of the variable, then follow the order of operations.',
    'Підстав значення змінної та дотримуйся порядку дій.',
  ),
  s(
    'brackets',
    'math',
    'algebra',
    'Brackets',
    'Дужки',
    ['expressions'],
    80,
    'Distribute the outside factor to every term inside the brackets.',
    'Помнож кожен доданок у дужках на множник перед дужками.',
  ),
  s(
    'linear',
    'math',
    'algebra',
    'Linear equations',
    'Лінійні рівняння',
    ['expressions'],
    82,
    'Keep both sides balanced. Undo addition, then multiplication to isolate x.',
    'Зберігай рівність обох частин. Спочатку усунь додавання, потім множення, щоб знайти x.',
  ),
  s(
    'systems',
    'math',
    'algebra',
    'Systems of equations',
    'Системи рівнянь',
    ['linear'],
    71,
    'Add equations to eliminate one variable, then substitute back.',
    'Додай рівняння, щоб виключити змінну, і підстав результат.',
  ),
  s(
    'powers',
    'math',
    'algebra',
    'Powers',
    'Степені',
    ['arithmetic'],
    78,
    'A power repeats multiplication: a² = a × a.',
    'Степінь повторює множення: a² = a × a.',
  ),
  s(
    'roots',
    'math',
    'algebra',
    'Square roots',
    'Квадратні корені',
    ['powers'],
    66,
    'The principal square root is the nonnegative number whose square is the given value.',
    'Арифметичний квадратний корінь — невід’ємне число, квадрат якого дорівнює заданому значенню.',
  ),
  s(
    'quadratic',
    'math',
    'algebra',
    'Quadratic equations',
    'Квадратні рівняння',
    ['linear', 'roots'],
    44,
    'For x² = a², both x = a and x = −a work. Factoring turns a quadratic into a product of linear factors. A zero product has at least one zero factor.',
    'Для x² = a² підходять x = a і x = −a. Розкладання квадратного виразу на множники дає добуток лінійних виразів. Якщо добуток нульовий, хоча б один множник дорівнює нулю.',
  ),
  s(
    'functions',
    'math',
    'algebra',
    'Functions',
    'Функції',
    ['linear'],
    57,
    'A function maps an input to one output. Substitute x into the rule.',
    'Функція ставить у відповідність аргументу одне значення. Підстав x у формулу.',
  ),
  ...[
    ['angles', 'Angles', 'Кути', 70],
    ['triangles', 'Triangles', 'Трикутники', 63],
    ['polygons', 'Polygons', 'Многокутники', 59],
    ['circles', 'Circles', 'Кола', 52],
    ['area', 'Area', 'Площа', 65],
    ['volume', 'Volume', 'Об’єм', 65],
  ].map(([id, en, uk, score]) =>
    s(
      String(id),
      'math',
      'geometry',
      String(en),
      String(uk),
      ['arithmetic'],
      Number(score),
      'Draw the shape, identify the known dimensions and check the units. Angles in a triangle sum to 180°. Area counts squares; volume counts cubes.',
      'Намалюй фігуру, визнач відомі величини та перевір одиниці. Сума кутів трикутника 180°. Площа вимірюється квадратними одиницями, об’єм — кубічними.',
    ),
  ),
  ...[
    ['distance', 'Distance', 'Відстань', 70],
    ['speed', 'Speed', 'Швидкість', 64],
    ['acceleration', 'Acceleration', 'Прискорення', 49],
    ['uniform', 'Uniform motion', 'Рівномірний рух', 66],
    ['accelerated', 'Accelerated motion', 'Рівноприскорений рух', 42],
    ['force', 'Force', 'Сила', 57],
    ['mass', 'Mass', 'Маса', 63],
    ['newton', 'Newton’s laws', 'Закони Ньютона', 52],
    ['work', 'Work', 'Робота', 50],
    ['power', 'Power', 'Потужність', 48],
    ['energy', 'Energy', 'Енергія', 53],
    ['voltage', 'Voltage', 'Напруга', 50],
    ['current', 'Current', 'Струм', 49],
    ['resistance', 'Resistance', 'Опір', 50],
    ['ohm', 'Ohm’s law', 'Закон Ома', 42],
    ['electric-power', 'Electric power', 'Електрична потужність', 45],
    ['series', 'Series circuits', 'Послідовне з’єднання', 62],
    ['parallel', 'Parallel circuits', 'Паралельне з’єднання', 62],
  ].map(([id, en, uk, score], i) =>
    s(
      String(id),
      'physics',
      i < 11 ? 'mechanics' : 'electricity',
      String(en),
      String(uk),
      i === 0
        ? []
        : [
            i < 11
              ? [
                  'distance',
                  'distance',
                  'speed',
                  'speed',
                  'acceleration',
                  'mass',
                  'distance',
                  'force',
                  'force',
                  'work',
                  'work',
                ][i] || 'distance'
              : i === 11
                ? 'energy'
                : 'voltage',
          ],
      Number(score),
      'Begin with the situation: what changes, and what stays constant? Draw a model, select the relation, calculate in SI units, then interpret the result. Speed v=s/t; acceleration a=Δv/t; force F=ma; work W=Fs; power P=W/t; voltage U=IR.',
      'Почни із ситуації: що змінюється, а що залишається сталим? Побудуй модель, обери залежність, обчисли в одиницях SI та поясни результат. v=s/t; a=Δv/t; F=ma; W=Fs; P=W/t; U=IR.',
    ),
  ),
  ...[
    ['grammar', 'Grammar', 'Граматика', 72],
    ['vocabulary', 'Vocabulary', 'Словниковий запас', 65],
    ['reading', 'Reading', 'Читання', 81],
    ['writing', 'Writing', 'Письмо', 61],
    ['listening', 'Listening', 'Аудіювання', 58],
    ['speaking', 'Speaking', 'Говоріння', 54],
  ].map(([id, en, uk, score]) =>
    s(
      String(id),
      'english',
      'b1',
      String(en),
      String(uk),
      [],
      Number(score),
      'Communicate your meaning clearly. Use Past Simple for finished events, support your ideas with reasons, and notice the context before choosing a word.',
      'Чітко передавай свою думку. Для завершених подій використовуй Past Simple, пояснюй свої ідеї та враховуй контекст під час добору слів.',
    ),
  ),
];
export function sampleQuestion(id: string, n: number) {
  const a = n + 2,
    b = n + 3;
  let en = '',
    uk = '',
    right = '',
    wrong: string[] = [];
  switch (id) {
    case 'arithmetic':
      en = `Calculate ${a} + ${b} × 2.`;
      uk = `Обчисли ${a} + ${b} × 2.`;
      right = String(a + b * 2);
      wrong = [String((a + b) * 2), String(a + b), String(a * b)];
      break;
    case 'expressions':
    case 'functions':
      en = `If x = ${a}, find 3x + 2.`;
      uk = `Якщо x = ${a}, знайди 3x + 2.`;
      right = String(3 * a + 2);
      wrong = [String(3 * a), String(a + 5), String(3 * a - 2)];
      break;
    case 'brackets':
      en = `Expand ${a}(x + ${b}).`;
      uk = `Розкрий дужки: ${a}(x + ${b}).`;
      right = `${a}x + ${a * b}`;
      wrong = [`${a}x + ${b}`, `x + ${a * b}`, `${a}x − ${a * b}`];
      break;
    case 'linear':
      en = `Solve 2x + ${b} = ${2 * a + b}.`;
      uk = `Розв’яжи 2x + ${b} = ${2 * a + b}.`;
      right = String(a);
      wrong = [String(a + 1), String(2 * a), String(a - 1)];
      break;
    case 'systems':
      en = `x + y = ${a + b} and x − y = ${b - a}. Find x.`;
      uk = `x + y = ${a + b} та x − y = ${b - a}. Знайди x.`;
      right = String(b);
      wrong = [String(a), String(a + b), String(b + 1)];
      break;
    case 'powers':
      en = `What is ${a}²?`;
      uk = `Чому дорівнює ${a}²?`;
      right = String(a * a);
      wrong = [String(a * a + 2), String(a), String(a * a + 1)];
      break;
    case 'roots':
      en = `Find √${a * a}.`;
      uk = `Знайди √${a * a}.`;
      right = String(a);
      wrong = [String(-a), String(a * a), String(a + 1)];
      break;
    case 'quadratic':
      en = `Solve x² − ${a * a} = 0. Choose ALL roots.`;
      uk = `Розв’яжи x² − ${a * a} = 0. Обери ВСІ корені.`;
      right = `−${a} and ${a}`;
      wrong = [String(a), String(a * a), `−${a * a} and ${a * a}`];
      break;
    case 'angles':
      en = `A straight angle is split into ${a * 10}° and x. Find x.`;
      uk = `Розгорнутий кут розділено на ${a * 10}° та x. Знайди x.`;
      right = String(180 - a * 10) + '°';
      wrong = [String(190 - a * 10) + '°', String(200 - a * 10) + '°', String(360 - a * 10) + '°'];
      break;
    case 'triangles':
      en = `A triangle has angles 60° and ${a * 5}°. Find the third.`;
      uk = `Кути трикутника: 60° та ${a * 5}°. Знайди третій.`;
      right = String(120 - a * 5) + '°';
      wrong = ['180°', '60°', String(180 - a * 5) + '°'];
      break;
    case 'polygons':
      en = `What is the interior angle sum of a ${a + 2}-sided polygon?`;
      uk = `Яка сума внутрішніх кутів ${a + 2}-кутника?`;
      right = String(a * 180) + '°';
      wrong = ['90°', String((a + 2) * 180) + '°', String(a * 90) + '°'];
      break;
    case 'circles':
      en = `A circle has radius ${a}. What is its circumference?`;
      uk = `Радіус кола ${a}. Яка довжина кола?`;
      right = `${2 * a}π`;
      wrong = [`${a}π`, `${a * a + 1}π`, String(2 * a)];
      break;
    case 'area':
      en = `A rectangle measures ${a} m by ${b} m. Find its area.`;
      uk = `Прямокутник ${a} м на ${b} м. Знайди площу.`;
      right = `${a * b} m²`;
      wrong = [`${a + b} m²`, `${a * b} m`, `${2 * (a + b)} m²`];
      break;
    case 'volume':
      en = `A cube has side ${a} m. Find its volume.`;
      uk = `Ребро куба ${a} м. Знайди об’єм.`;
      right = `${a ** 3} m³`;
      wrong = [`${a * a} m²`, `${a ** 3 + 1} m³`, `${a ** 3} m²`];
      break;
    default: {
      const physics: Record<string, [string, string, number, string]> = {
        distance: [
          `A cyclist travels at ${a} m/s for ${b} s. How far?`,
          `Велосипедист рухається ${a} м/с протягом ${b} с. Яка відстань?`,
          a * b,
          'm',
        ],
        speed: [
          `A robot travels ${a * b} m in ${b} s. Find its speed.`,
          `Робот проходить ${a * b} м за ${b} с. Яка швидкість?`,
          a,
          'm/s',
        ],
        acceleration: [
          `A cart goes from rest to ${a * b} m/s in ${b} s. Find acceleration.`,
          `Візок розганяється зі спокою до ${a * b} м/с за ${b} с. Яке прискорення?`,
          a,
          'm/s²',
        ],
        uniform: [
          `A train travels at ${a} m/s for ${b} s without changing speed. Find distance.`,
          `Поїзд рухається ${a} м/с протягом ${b} с. Яка відстань?`,
          a * b,
          'm',
        ],
        accelerated: [
          `A cart starts at rest with acceleration 2 m/s² for ${a} s. Find distance.`,
          `Візок рушає зі спокою з прискоренням 2 м/с² протягом ${a} с. Яка відстань?`,
          a * a,
          'm',
        ],
        force: [
          `A ${a} kg cart accelerates at ${b} m/s². Find net force.`,
          `Візок масою ${a} кг має прискорення ${b} м/с². Яка рівнодійна сила?`,
          a * b,
          'N',
        ],
        mass: [
          `A net force of ${a * b} N produces ${b} m/s². Find mass.`,
          `Сила ${a * b} Н спричиняє прискорення ${b} м/с². Яка маса?`,
          a,
          'kg',
        ],
        newton: [
          `A ${a} kg trolley is pushed with ${a * b} N net force. Find acceleration.`,
          `На візок масою ${a} кг діє сила ${a * b} Н. Яке прискорення?`,
          b,
          'm/s²',
        ],
        work: [
          `You push a box ${b} m with ${a} N along its motion. Find work.`,
          `Ти штовхаєш коробку на ${b} м силою ${a} Н уздовж руху. Яка робота?`,
          a * b,
          'J',
        ],
        power: [
          `A motor does ${a * b} J of work in ${b} s. Find power.`,
          `Мотор виконує ${a * b} Дж роботи за ${b} с. Яка потужність?`,
          a,
          'W',
        ],
        energy: [
          `A 2 kg ball moves at ${a} m/s. Find kinetic energy.`,
          `М’яч масою 2 кг рухається ${a} м/с. Яка кінетична енергія?`,
          a * a,
          'J',
        ],
        voltage: [
          `A ${a} Ω resistor carries ${b} A. Find voltage.`,
          `Через резистор ${a} Ом тече ${b} А. Яка напруга?`,
          a * b,
          'V',
        ],
        current: [
          `A ${b} Ω resistor has ${a * b} V across it. Find current.`,
          `На резисторі ${b} Ом напруга ${a * b} В. Який струм?`,
          a,
          'A',
        ],
        resistance: [
          `Voltage is ${a * b} V and current is ${b} A. Find resistance.`,
          `Напруга ${a * b} В, струм ${b} А. Який опір?`,
          a,
          'Ω',
        ],
        ohm: [
          `A lamp has resistance ${b} Ω and voltage ${a * b} V. Find current.`,
          `Лампа має опір ${b} Ом і напругу ${a * b} В. Який струм?`,
          a,
          'A',
        ],
        'electric-power': [
          `A device uses ${a} V and ${b} A. Find electrical power.`,
          `Пристрій працює за ${a} В і ${b} А. Яка потужність?`,
          a * b,
          'W',
        ],
        series: [
          `Two resistors ${a} Ω and ${b} Ω are connected in series. Find total resistance.`,
          `Опори ${a} Ом і ${b} Ом з’єднані послідовно. Який загальний опір?`,
          a + b,
          'Ω',
        ],
        parallel: [
          `Two ${2 * a} Ω resistors are in parallel. Find equivalent resistance.`,
          `Два резистори по ${2 * a} Ом з’єднані паралельно. Який еквівалентний опір?`,
          a,
          'Ω',
        ],
      };
      if (physics[id]) {
        const [e, u, v, unit] = physics[id];
        en = e;
        uk = u;
        right = `${v} ${unit}`;
        wrong = [`${v + 1} ${unit}`, `${v + 3} ${unit}`, `${v + 7} ${unit}`];
        break;
      }
      const sentences = [
        ['Yesterday I ___ to school.', 'went', 'go', 'going', 'gone'],
        ['She has lived here ___ 2020.', 'since', 'for', 'during', 'at'],
        ['If I had more time, I ___ travel.', 'would', 'will', 'am', 'did'],
        ['He is interested ___ robotics.', 'in', 'on', 'at', 'to'],
        ['We ___ already finished the project.', 'have', 'did', 'are', 'were'],
        ['I enjoy ___ books.', 'reading', 'read', 'to reading', 'reads'],
        ['This task is ___ than the last one.', 'easier', 'easy', 'easiest', 'more easy'],
        ['She asked me where I ___.', 'lived', 'live tomorrow', 'living', 'am live'],
        ['You ___ wear a helmet for safety.', 'should', 'would to', 'are', 'have'],
      ];
      const row = sentences[n % sentences.length];
      if (id === 'vocabulary') {
        const words = [
          ['reliable', 'can be trusted', 'very loud', 'always late', 'unusual'],
          ['improve', 'make better', 'make smaller', 'forget', 'borrow'],
          ['achieve', 'succeed in reaching a goal', 'give away', 'disagree', 'arrive late'],
        ][n % 3];
        en = `Choose the meaning of “${words[0]}”.`;
        uk = `Обери значення слова “${words[0]}”.`;
        right = words[1];
        wrong = words.slice(2);
      } else if (id === 'reading' || id === 'listening') {
        en = `Maya takes the train to the robotics club every ${['Monday', 'Tuesday', 'Friday'][n % 3]}. She goes because she enjoys building machines. Why does she attend?`;
        uk = `Maya takes the train to the robotics club every ${['Monday', 'Tuesday', 'Friday'][n % 3]}. She goes because she enjoys building machines. Чому вона відвідує гурток?`;
        right = 'She enjoys building machines.';
        wrong = ['She dislikes trains.', 'She wants to learn cooking.', 'She teaches every day.'];
      } else {
        en = `Choose the correct form: ${row[0]}`;
        uk = `Обери правильну форму: ${row[0]}`;
        right = row[1];
        wrong = row.slice(2);
      }
    }
  }
  const options = [right, ...wrong];
  const rotate = n % 4;
  const shuffled = [...options.slice(rotate), ...options.slice(0, rotate)];
  const skill = seedSkills.find((s) => s.id === id)!;
  const reasoning = bi(
    `${skill.explanation.en} Correct choice: ${right}.`,
    `${skill.explanation.uk} Правильний варіант: ${right}.`,
  );
  return {
    id: `${id}-${n}`,
    skill_id: id,
    difficulty: Math.min(3, Math.floor(n / 3) + 1),
    prompt: bi(en, uk),
    options: shuffled,
    answer: shuffled.indexOf(right),
    reasoning,
    hints: [
      bi(
        'Identify what is given and what you need to find.',
        'Визнач відомі величини й те, що потрібно знайти.',
      ),
      skill.explanation,
      bi(
        'Write the relevant rule and substitute the known values.',
        'Запиши відповідне правило та підстав відомі значення.',
      ),
      bi(
        `Work through the rule carefully. ${skill.explanation.en}`,
        `Застосуй правило крок за кроком. ${skill.explanation.uk}`,
      ),
      reasoning,
    ],
  };
}
