# Upstream: KISS FFT

- Project: https://github.com/mborgerding/kissfft
- License: BSD-3-Clause
- Vendored files: a minimal subset under `src/wasm/` used for WASM builds.
- Local changes: (document any patching applied, if any).
- How to bump:
  1. Update the vendored files from upstream at the desired tag/commit.
  2. Re-run the WASM build (see `scripts/build-wasm.*`).
  3. Confirm headers still carry `SPDX-License-Identifier: BSD-3-Clause`.
  4. Run `pnpm test` and `pnpm bench`.
  5. Update this file with the new tag/commit.
