// Permanent content contract: a change in magnitude alone never changes demand.
export const cognitiveDemand = [
  { level: 1, key: 'recall', label: 'Пригадування / пряма дія' },
  { level: 2, key: 'application', label: 'Стандартне застосування' },
  { level: 3, key: 'multi-step', label: 'Кілька пов’язаних кроків' },
  { level: 4, key: 'transfer', label: 'Вибір моделі в новій ситуації' },
  { level: 5, key: 'reasoning', label: 'Міркування, графік або експеримент' },
] as const;
export const difficultyPolicy = 'Складність — властивість способу мислення, а не величини числа.';
export function demandFor(key: (typeof cognitiveDemand)[number]['key']) {
  return cognitiveDemand.find((d) => d.key === key)!.level;
}
