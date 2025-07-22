// tests/bench/simd-stress.bench.ts
import { bench, describe } from 'vitest'
import type { KissFftWasmModule } from '../../src/types'
import { loadKissFft } from '../../src/loader';

let wasm: KissFftWasmModule

await loadKissFft().then(m => wasm = m)

function createComplexBuffer(size: number) {
  const real = new Float32Array(size)
  const imag = new Float32Array(size)
  for (let i = 0; i < size; i++) {
    real[i] = Math.sin(2 * Math.PI * i / size)
    imag[i] = 0
  }
  return { real, imag }
}

function performFft(nfft: number, inverse: boolean) {
  const total = 16 // how many full FFTs we run per benchmark loop
  const size = nfft * 2

  const { real, imag } = createComplexBuffer(nfft)
  const inputPtr = wasm._malloc(size * 4)
  const outputPtr = wasm._malloc(size * 4)
  const cfgPtr = wasm._kiss_fft_alloc(nfft, inverse ? 1 : 0, 0, 0)

  const input = new Float32Array(wasm.HEAPF32.buffer, inputPtr, size)
  const output = new Float32Array(wasm.HEAPF32.buffer, outputPtr, size)

  return () => {
    for (let t = 0; t < total; t++) {
      // interleave real/imag into HEAP
      for (let i = 0; i < nfft; i++) {
        input[i * 2 + 0] = real[i]
        input[i * 2 + 1] = imag[i]
      }
      wasm._kiss_fft(cfgPtr, inputPtr, outputPtr)
    }
  }
}

const SIZES = [128, 512, 2048, 8192, 32768]

describe('KissFFT SIMD Stress Benchmark', () => {
  for (const size of SIZES) {
    bench(`complex forward SIMD stress N=${size}`, () => {
      const run = performFft(size, false)
      run()
    })

    bench(`complex inverse SIMD stress N=${size}`, () => {
      const run = performFft(size, true)
      run()
    })
  }
})
