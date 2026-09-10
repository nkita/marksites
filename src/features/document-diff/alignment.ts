export type Pair<T> = [T | undefined, T | undefined];

/** Order-preserving alignment; exact matches are stronger than replacements. */
export function align<T>(
  old: T[],
  current: T[],
  score: (a: T, b: T) => number,
): Pair<T>[] {
  if (old.length * current.length > 250_000)
    return [
      ...old.map((value): Pair<T> => [value, undefined]),
      ...current.map((value): Pair<T> => [undefined, value]),
    ];
  const values = Array.from(
    { length: old.length + 1 },
    () => new Float64Array(current.length + 1),
  );
  for (let i = old.length - 1; i >= 0; i--)
    for (let j = current.length - 1; j >= 0; j--)
      values[i]![j] = Math.max(
        values[i + 1]![j]!,
        values[i]![j + 1]!,
        values[i + 1]![j + 1]! + score(old[i]!, current[j]!),
      );
  const pairs: Pair<T>[] = [];
  let i = 0,
    j = 0;
  while (i < old.length || j < current.length) {
    const match =
      i < old.length && j < current.length ? score(old[i]!, current[j]!) : 0;
    if (match > 0 && values[i]![j] === values[i + 1]![j + 1]! + match)
      pairs.push([old[i++]!, current[j++]!]);
    else if (
      j < current.length &&
      (i === old.length || values[i]![j + 1]! > values[i + 1]![j]!)
    )
      pairs.push([undefined, current[j++]!]);
    else pairs.push([old[i++]!, undefined]);
  }
  return pairs;
}

export function similarity(a: string, b: string): number {
  if (a === b) return 4;
  const grams = (value: string) => {
    const chars = Array.from(value.trim());
    return new Set(chars.map((char, i) => char + (chars[i + 1] ?? "")));
  };
  const left = grams(a),
    right = grams(b);
  const shared = [...left].filter((value) => right.has(value)).length;
  const ratio = (2 * shared) / (left.size + right.size || 1);
  return ratio >= 0.2 ? ratio : 0;
}
