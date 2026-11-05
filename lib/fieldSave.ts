/** El indicador «Guardado» solo puede llegar después de una promesa resuelta. */
export function isThenable(value: unknown): value is Promise<unknown> {
  return !!value && typeof (value as { then?: unknown }).then === 'function';
}

export function phaseWhenFlushed(returned: unknown): 'saving' | 'idle' {
  return isThenable(returned) ? 'saving' : 'idle';
}
