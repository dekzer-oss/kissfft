export type Norm = 'none' | 'backward' | 'ortho';

export interface ParsedOpts {
  cache: boolean;
  norm: Norm;
}

export function parseOpts(opts?: boolean | { cache?: boolean; norm?: Norm }): ParsedOpts {
  if (typeof opts === 'boolean') return { cache: opts, norm: 'none' };
  return { cache: opts?.cache ?? true, norm: (opts?.norm ?? 'none') as Norm };
}

/** Returns per-direction scales for given transform length n (N or size). */
export function normScales(n: number, mode: Norm): { fwd: number; inv: number } {
  if (mode === 'none') return { fwd: 1, inv: 1 };
  if (mode === 'backward') return { fwd: 1, inv: 1 / n };
  const s = 1 / Math.sqrt(n);
  return { fwd: s, inv: s };
}

/** In-place scale for interleaved complex buffers (len = 2 * size). */
export function scaleComplexInPlace(buf: Float32Array, s: number): void {
  for (let i = 0; i < buf.length; i++) buf[i] *= s;
}

/** In-place scale for real buffers (len = size). */
export function scaleRealInPlace(buf: Float32Array, s: number): void {
  for (let i = 0; i < buf.length; i++) buf[i] *= s;
}
