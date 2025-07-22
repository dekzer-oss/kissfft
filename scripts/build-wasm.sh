#!/usr/bin/env bash
set -euo pipefail

# Emscripten env bootstrap
EMSDK_ROOT="${EMSDK_ROOT:-$HOME/emsdk}"
if [[ -f "$EMSDK_ROOT/emsdk_env.sh" ]]; then
  export EMSDK_QUIET=1
  source "$EMSDK_ROOT/emsdk_env.sh" >/dev/null
else
  echo "❌ emsdk_env.sh not found in $EMSDK_ROOT" >&2
  exit 1
fi

# Paths
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SRC_DIR="$SCRIPT_DIR/../src/wasm"
BUILD_DIR="$SCRIPT_DIR/../build"
CONFIG_FILE="$SRC_DIR/wasm.config.json"

mkdir -p "$BUILD_DIR"

# Load config from wasm.config.json
OPTIMIZATION=$(jq -r '.optimization' "$CONFIG_FILE")
USE_SIMD=$(jq -r '.useSimd' "$CONFIG_FILE")
EXPORTED_FUNCS=$(jq -c '.exportedFunctions' "$CONFIG_FILE")

# Compiler flags
CFLAGS="-std=c11"

if [[ "$OPTIMIZATION" != "null" ]]; then
  CFLAGS+=" -$OPTIMIZATION"
fi

if [[ "$USE_SIMD" == "true" ]]; then
  CFLAGS+=" -msimd128 -DKISS_FFT_USE_SIMD"
fi

LDFLAGS=${LDFLAGS:-""}

EXPORTED_RUNTIME='["HEAPF32","HEAP32"]'

# Compile to WebAssembly
emcc "$SRC_DIR"/*.c \
  $CFLAGS $LDFLAGS \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="createKissFftModule" \
  -s NO_FILESYSTEM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=16777216 \
  -s EXPORTED_FUNCTIONS="$EXPORTED_FUNCS" \
  -s EXPORTED_RUNTIME_METHODS="$EXPORTED_RUNTIME" \
  -o "$BUILD_DIR/kissfft-wasm.js"

# Completion message
echo "🎉 Build finished — artifacts in $BUILD_DIR"
