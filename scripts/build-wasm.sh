#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# KISS FFT → WASM build (stable, strict, quiet)
# - Keeps -msimd128 enabled (future-friendly)
# - Does NOT fail or warn when autovectorization doesn't fire
#   (set REQUIRE_WASM_SIMD=1 to re-enable a hard check)
# ------------------------------------------------------------

# Emscripten env bootstrap
EMSDK_ROOT="${EMSDK_ROOT:-$HOME/emsdk}"
if [[ -f "$EMSDK_ROOT/emsdk_env.sh" ]]; then
  export EMSDK_QUIET=1
  # shellcheck disable=SC1090
  source "$EMSDK_ROOT/emsdk_env.sh" >/dev/null
else
  echo "❌ emsdk_env.sh not found in $EMSDK_ROOT" >&2
  exit 1
fi

# Tooling checks
if ! command -v jq >/dev/null 2>&1; then
  echo "❌ 'jq' is required (apt/brew install jq)" >&2
  exit 1
fi

# Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src/wasm"
BUILD_DIR="$SCRIPT_DIR/../build"
CONFIG_FILE="$SRC_DIR/wasm.config.json"

mkdir -p "$BUILD_DIR"

# Load config (with defaults)
OPTIMIZATION="$(jq -r '.optimization // "O3"' "$CONFIG_FILE")"
USE_SIMD="$(jq -r '.useSimd // true' "$CONFIG_FILE")"
EXPORTED_FUNCS="$(jq -c '.exportedFunctions // []' "$CONFIG_FILE")"
SINGLE_FILE="$(jq -r '.singleFile // false' "$CONFIG_FILE")"
INITIAL_MEMORY="$(jq -r '.initialMemory // 16777216' "$CONFIG_FILE")"
ENVIRONMENTS="$(jq -r '.environments // "web,worker,node"' "$CONFIG_FILE")"

# Flags
CFLAGS=( -std=c11 "-${OPTIMIZATION}" -fno-math-errno )
[[ "$USE_SIMD" == "true" ]] && CFLAGS+=( -msimd128 )

EMFLAGS=(
  -s WASM=1
  -s STRICT=1
  -s DYNAMIC_EXECUTION=0
  -s ENVIRONMENT="${ENVIRONMENTS}"
  -s FILESYSTEM=0
  -s MODULARIZE=1
  -s EXPORT_ES6=1
  -s EXPORT_NAME=createModule
  -s ALLOW_MEMORY_GROWTH=1
  -s INITIAL_MEMORY="${INITIAL_MEMORY}"
)
case "$OPTIMIZATION" in
  O0|Og) EMFLAGS+=( -s ASSERTIONS=1 ) ;;
  *)     EMFLAGS+=( -s ASSERTIONS=0 ) ;;
esac
[[ "$SINGLE_FILE" == "true" ]] && EMFLAGS+=( -s SINGLE_FILE=1 )

EXPORTED_RUNTIME='["HEAPF32","HEAP32"]'

# Collect sources
mapfile -t SRC_C < <(ls "$SRC_DIR"/*.c 2>/dev/null || true)
if [[ ${#SRC_C[@]} -eq 0 ]]; then
  echo "❌ No .c sources found in $SRC_DIR" >&2
  exit 1
fi

# Banner
echo "🔧 emcc: $(emcc -v 2>&1 | head -n1)"
echo "📦 Sources: ${#SRC_C[@]} file(s)"
echo "⚙️  CFLAGS: ${CFLAGS[*]}"
echo "🔩 EMFLAGS: ${EMFLAGS[*]}"
echo "🚀 EXPORTED_FUNCTIONS: $EXPORTED_FUNCS"
echo "🧰 EXPORTED_RUNTIME_METHODS: $EXPORTED_RUNTIME"

# Build
emcc "${SRC_C[@]}" \
  "${CFLAGS[@]}" \
  "${EMFLAGS[@]}" \
  -s EXPORTED_FUNCTIONS="$EXPORTED_FUNCS" \
  -s EXPORTED_RUNTIME_METHODS="$EXPORTED_RUNTIME" \
  -o "$BUILD_DIR/kissfft-wasm.js"

# Optional: WASM SIMD presence check (silent by default)
if [[ "${REQUIRE_WASM_SIMD:-0}" == "1" ]]; then
  WASM_PATH="$BUILD_DIR/kissfft-wasm.wasm"
  if [[ ! -f "$WASM_PATH" && "$SINGLE_FILE" == "true" ]]; then
    WASM_PATH=""
  fi
  if [[ -n "$WASM_PATH" && -f "$WASM_PATH" && $(command -v wasm-objdump || true) ]]; then
    if wasm-objdump -d "$WASM_PATH" | grep -qE '\bv128\b|f32x4|i32x4'; then
      echo "✅ SIMD ops detected in $WASM_PATH"
    else
      echo "❌ SIMD expected but not detected in $WASM_PATH" >&2
      echo "   Hint: -msimd128 is set, but compiler may not autovectorize scalar KISS loops." >&2
      exit 1
    fi
  fi
fi

echo "🎉 Build finished — artifacts in $BUILD_DIR"
