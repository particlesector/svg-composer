/**
 * UUID generation utility
 */

/**
 * Generates a unique identifier for elements
 *
 * @returns A unique string identifier
 * @throws Error - Not implemented
 *
 * @example
 * ```typescript
 * const id = generateId();
 * // Returns something like: "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateId(): string {
  return crypto.randomUUID();
}
