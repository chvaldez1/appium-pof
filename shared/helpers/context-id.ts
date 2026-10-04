export function contextId(context: unknown): string | undefined {
  if (typeof context === 'string') return context;
  if (context && typeof context === 'object' && 'id' in context && typeof context.id === 'string') {
    return context.id;
  }
  return undefined;
}
