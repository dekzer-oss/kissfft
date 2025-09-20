// Vite's `?url` imports resolve to string URLs at runtime.
declare module '*.wasm?url' {
  const url: string;
  export default url;
}
