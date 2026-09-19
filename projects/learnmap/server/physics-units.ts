// SI dimensions [mass, length, time, current]; used to independently audit every
// numerical question's calculation and requested unit, not to grade by AI.
export type Dimension = [number, number, number, number];
export const unitDimensions: Record<string, Dimension> = {
  '1': [0, 0, 0, 0],
  '%': [0, 0, 0, 0],
  m: [0, 1, 0, 0],
  s: [0, 0, 1, 0],
  kg: [1, 0, 0, 0],
  'm/s': [0, 1, -1, 0],
  'm/s²': [0, 1, -2, 0],
  N: [1, 1, -2, 0],
  J: [1, 2, -2, 0],
  W: [1, 2, -3, 0],
  A: [0, 0, 0, 1],
  C: [0, 0, 1, 1],
  V: [1, 2, -3, -1],
  Ω: [1, 2, -3, -2],
  'kg·m/s': [1, 1, -1, 0],
  'N·s': [1, 1, -1, 0],
  m2: [0, 2, 0, 0],
};
export type Quantity = { value: number; dim: Dimension };
export type Calculation =
  { value: number; unit: string } | { op: '+' | '-' | '*' | '/' | 'sqrt'; args: Calculation[] };
export const val = (value: number, unit = '1'): Calculation => ({ value, unit });
export const calc = (op: '+' | '-' | '*' | '/' | 'sqrt', ...args: Calculation[]): Calculation => ({
  op,
  args,
});
export function evaluate(c: Calculation): Quantity {
  if ('value' in c) {
    if (!unitDimensions[c.unit]) throw Error('Unknown unit');
    return { value: c.value, dim: unitDimensions[c.unit] };
  }
  const [a, b] = c.args.map(evaluate);
  if (c.op === 'sqrt')
    return { value: Math.sqrt(a.value), dim: a.dim.map((d) => d / 2) as Dimension };
  if (c.op === '+' || c.op === '-') {
    if (a.dim.some((d, i) => d !== b.dim[i])) throw Error('Dimension mismatch');
    return { value: c.op === '+' ? a.value + b.value : a.value - b.value, dim: a.dim };
  }
  return {
    value: c.op === '*' ? a.value * b.value : a.value / b.value,
    dim: a.dim.map((d, i) => d + (c.op === '*' ? 1 : -1) * b.dim[i]) as Dimension,
  };
}
