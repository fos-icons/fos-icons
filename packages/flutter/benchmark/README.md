# Flutter release-size benchmarks

## Web

From the repository root, with Flutter **3.50.1** on `PATH` and Python 3:

```sh
python3 packages/flutter/benchmark/benchmark.py
```

Set `FLUTTER` to the absolute path of `flutter` to use a specific SDK. The
script uses the pinned `pubspec.lock`, then builds the same minimal host app three
times with `flutter build web --release --no-pub --no-wasm-dry-run`. The
`FOS_BENCHMARK_ICON_COUNT` compile-time define selects 0, 1, or 6 icons. Each
variant imports the same public Fos Icons library.

The script reports raw and deterministic gzip level 9 byte counts for
`main.dart.js` alone, and deltas from baseline. Engine assets, the web page,
and other outputs are not counted. The one-icon delta includes the renderer
and its dependencies; it is not the size of just one glyph.

For each glyph, the script reads a distinguishing full `d` (path data)
string from its canonical SVG. It requires none of the six markers in the
baseline, only regular binoculars in the one-icon build, and all six in the
all-icons build. The all-icons build is the positive control for the markers.
It also counts the SVG root prefix shared by all 5,968 generated payloads,
so retaining any additional catalog glyph fails even if the sample checks pass.
Any mismatch fails the benchmark. The three release builds are saved under
`build/benchmark/` next to this README.

### Measured web result

Flutter 3.50.1 (`ae9b586f34`), Dart 3.14.0, macOS arm64, zlib 1.2.12:

| Variant | Raw bytes | Gzip bytes | Raw vs. baseline | Gzip vs. baseline |
| --- | ---: | ---: | ---: | ---: |
| Baseline (0 icons) | 1,099,749 | 356,716 | — | — |
| Regular binoculars only | 1,345,197 | 432,579 | +245,448 | +75,863 |
| All six icons | 1,361,436 | 436,146 | +261,687 | +79,430 |

All six marker checks passed. Adding the other five icons to the one-icon
build added 16,239 raw bytes and 3,567 gzip bytes.

## Android and iOS

From the repository root, with Flutter **3.50.1** and Python 3 (or set
`FLUTTER` to the SDK's absolute `flutter` path):

```sh
python3 packages/flutter/benchmark/native_benchmark.py android
python3 packages/flutter/benchmark/native_benchmark.py ios
```

Run Android on Linux or macOS with JDK 17 and a configured Android SDK,
including API 36, build tools, command-line tools (`apkanalyzer`), the Flutter
template's NDK `28.2.13676358`, and accepted SDK licenses.
Run iOS on macOS with full Xcode selected, initialized, and its iOS platform
installed. No emulator, device, signing credentials, or provisioning profile
is needed. No native measurements were taken on the local Mac because these
toolchains were not installed.

The script generates a temporary host from the pinned SDK template and reuses
the web benchmark's Dart entrypoint, locked packages, and 0/1/6-icon variants.
Android builds an unsigned release App Bundle with `--target-platform=android-arm64`
and extracts `base/lib/arm64-v8a/libapp.so`. iOS builds an arm64 device release
with `--no-codesign` and measures `Runner.app/Frameworks/App.framework/App`.

The table reports the raw and gzip level 9 sizes of those Dart AOT binaries,
plus deltas from baseline. It excludes the Flutter engine, assets, and host
application code outside the Dart binary; gzip is a like-for-like comparison,
not an estimate of store download size. Compare variants within a platform on
the same toolchain. In both scripts, `all` means the six sample icons, not the
entire catalog. The web benchmark verifies individual SVG markers; the native
benchmark measures AOT size only.

For CI, run each command on a separate configured runner. The table goes to
stdout, and the three measured binaries are available to archive under
`packages/flutter/benchmark/build/benchmark/native/<platform>/` after a
successful run.
