export function hasOwnField<K extends string>(
  value: unknown,
  key: K,
): value is object & Record<K, unknown> {
  return (
    typeof value === 'object' && value !== null && Object.hasOwn(value, key)
  );
}
