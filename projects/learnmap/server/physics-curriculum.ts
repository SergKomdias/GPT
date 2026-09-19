// Editorial pilot mappings; explicit country/grade eligibility, not a claim of
// certification against a national syllabus. Unmapped countries require selection.
export type PhysicsDefinition = [
  id: string,
  title: string,
  grade: number,
  branch: string,
  pre: string[],
];
export const physicsDefinitions: PhysicsDefinition[] = [
  ['units', 'Одиниці та розмірності', 7, 'measurement', []],
  ['vectors', 'Вектори', 7, 'mechanics', ['units']],
  ['distance', 'Шлях і переміщення', 7, 'motion', ['units']],
  ['speed', 'Швидкість', 7, 'motion', ['distance']],
  ['acceleration', 'Прискорення', 9, 'motion', ['speed', 'vectors']],
  ['motion-graphs', 'Графіки руху', 9, 'motion', ['speed', 'acceleration']],
  ['uniform', 'Рівномірний рух', 7, 'motion', ['speed']],
  ['accelerated', 'Рівноприскорений рух', 9, 'motion', ['acceleration', 'motion-graphs']],
  ['free-fall', 'Вільне падіння', 9, 'motion', ['accelerated']],
  ['mass', 'Маса та інертність', 7, 'dynamics', ['units']],
  ['force', 'Сила', 7, 'dynamics', ['mass', 'vectors']],
  ['newton', 'Закони Ньютона', 9, 'dynamics', ['force', 'acceleration']],
  ['net-force', 'Рівнодійна сил', 9, 'dynamics', ['force', 'vectors']],
  ['friction', 'Тертя', 9, 'dynamics', ['net-force', 'newton']],
  ['connected-bodies', 'Зв’язані тіла', 10, 'dynamics', ['newton', 'net-force', 'friction']],
  ['work', 'Механічна робота', 7, 'energy', ['force', 'distance']],
  ['energy', 'Кінетична та потенціальна енергія', 7, 'energy', ['work', 'mass']],
  ['conservation-energy', 'Збереження енергії', 9, 'energy', ['energy', 'friction']],
  ['power', 'Потужність', 7, 'energy', ['work']],
  ['efficiency', 'ККД', 8, 'energy', ['power', 'energy']],
  ['momentum', 'Імпульс тіла та сили', 10, 'dynamics', ['newton', 'vectors']],
  ['voltage', 'Напруга', 8, 'electricity', ['energy']],
  ['current', 'Сила струму', 8, 'electricity', ['units']],
  ['resistance', 'Опір', 8, 'electricity', ['voltage', 'current']],
  ['ohm', 'Закон Ома', 8, 'electricity', ['resistance']],
  ['series', 'Послідовні кола', 8, 'electricity', ['ohm']],
  ['parallel', 'Паралельні кола', 8, 'electricity', ['ohm']],
  ['mixed-circuits', 'Комбіновані кола', 10, 'electricity', ['series', 'parallel']],
  ['electric-power', 'Електрична потужність та енергія', 8, 'electricity', ['ohm', 'power']],
  ['experiment', 'Вимірювання й експеримент', 10, 'measurement', ['units', 'motion-graphs']],
];
export const physicsCurricula: Record<string, { name: string; grades: Record<string, number> }> = {
  UA: {
    name: 'Україна — пілотна відповідність',
    grades: Object.fromEntries(physicsDefinitions.map((d) => [d[0], d[2]])),
  },
  international: {
    name: 'Міжнародна пілотна послідовність',
    grades: Object.fromEntries(physicsDefinitions.map((d) => [d[0], d[2] === 7 ? 8 : d[2]])),
  },
};
export function physicsCurriculum(country: string) {
  const normalized = country.trim().toLowerCase();
  return ['ua', 'ukraine', 'україна'].includes(normalized)
    ? 'UA'
    : normalized === 'international'
      ? 'international'
      : null;
}
export function eligiblePhysics(country: string, grade: number, override?: string) {
  const curriculum = override || physicsCurriculum(country);
  if (!curriculum || !physicsCurricula[curriculum])
    throw Object.assign(
      new Error('Оберіть навчальну програму фізики для цієї країни в налаштуваннях.'),
      { status: 409 },
    );
  const mapping = physicsCurricula[curriculum];
  return {
    curriculum,
    skills: physicsDefinitions
      .filter((d) => mapping.grades[d[0]] <= grade)
      .map((d) => ({ ...d, id: d[0], grade_level: mapping.grades[d[0]] })),
  };
}
