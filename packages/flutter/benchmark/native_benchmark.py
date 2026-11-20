"""Measure the arm64 Dart AOT payload in Flutter native release builds."""

import argparse
import gzip
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
from zipfile import ZipFile
import zlib

from benchmark import HERE, VARIANTS, icon_count_flag


SDK_VERSION = "3.50.1"
OUTPUT = HERE / "build" / "benchmark" / "native"
ANDROID_BUNDLE = Path("build/app/outputs/bundle/release/app-release.aab")
ANDROID_AOT = "base/lib/arm64-v8a/libapp.so"
IOS_AOT = Path("build/ios/iphoneos/Runner.app/Frameworks/App.framework/App")


def replace_once(text, old, new, filename):
    if text.count(old) != 1:
        raise SystemExit(f"{filename}: expected exactly one occurrence of {old!r}")
    return text.replace(old, new)


def prepare_app(flutter, platform, app):
    subprocess.run(
        [
            flutter,
            "create",
            "--no-pub",
            "--empty",
            f"--platforms={platform}",
            "--project-name=fos_icons_benchmark",
            "--org=dev.fos_icons",
            str(app),
        ],
        cwd=HERE,
        check=True,
    )
    shutil.copyfile(HERE / "lib" / "main.dart", app / "lib" / "main.dart")
    # Keep the entire web lockfile except for rebasing the local package path.
    dependency = Path(os.path.relpath(HERE.parent, app)).as_posix()
    for name, old_path in (("pubspec.yaml", ".."), ("pubspec.lock", '".."')):
        contents = (HERE / name).read_text(encoding="utf-8")
        (app / name).write_text(
            replace_once(
                contents, f"path: {old_path}\n", f'path: "{dependency}"\n', name
            ),
            encoding="utf-8",
        )
    if platform == "android":
        gradle = app / "android" / "app" / "build.gradle.kts"
        gradle.write_text(
            replace_once(
                gradle.read_text(encoding="utf-8"),
                'signingConfig = signingConfigs.getByName("debug")',
                "signingConfig = null",
                gradle,
            ),
            encoding="utf-8",
        )
    subprocess.run([flutter, "pub", "get", "--enforce-lockfile"], cwd=app, check=True)


def read_aot(app, platform):
    if platform == "android":
        with ZipFile(app / ANDROID_BUNDLE) as bundle:
            return bundle.read(ANDROID_AOT)
    return (app / IOS_AOT).read_bytes()


def benchmark(flutter, platform):
    output = OUTPUT / platform
    output.mkdir(parents=True, exist_ok=True)
    target = (
        ["appbundle", "--target-platform=android-arm64"]
        if platform == "android"
        else ["ios", "--no-simulator", "--no-codesign"]
    )
    filename = "libapp.so" if platform == "android" else "App"
    results = []
    with TemporaryDirectory(prefix=f".{platform}-", dir=OUTPUT) as scratch:
        app = Path(scratch) / "app"
        prepare_app(flutter, platform, app)
        for variant, count in VARIANTS:
            print(f"\n{platform}: building {variant} ({count} icons)", flush=True)
            subprocess.run(
                [flutter, "build", *target, "--release", "--no-pub", icon_count_flag(count)],
                cwd=app,
                check=True,
            )
            aot = read_aot(app, platform)
            (output / f"{variant}-{filename}").write_bytes(aot)
            compressed = gzip.compress(aot, compresslevel=9, mtime=0)
            results.append((variant, len(aot), len(compressed)))

    _, raw_base, gzip_base = results[0]
    print(f"\n{platform} arm64 {filename} bytes (gzip level 9, zlib {zlib.ZLIB_RUNTIME_VERSION})")
    print("variant   raw bytes  gzip bytes    raw delta   gzip delta")
    for variant, raw, gz in results:
        print(f"{variant:<9} {raw:>9} {gz:>11} {raw - raw_base:>+12} {gz - gzip_base:>+12}")
    print(f"AOT binaries: {output.relative_to(HERE)}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("platform", choices=("android", "ios"))
    args = parser.parse_args()
    if args.platform == "ios" and sys.platform != "darwin":
        parser.error("iOS requires macOS and the full Xcode toolchain")

    flutter = os.environ.get("FLUTTER", "flutter")
    info = json.loads(
        subprocess.check_output([flutter, "--version", "--machine"], cwd=HERE, text=True)
    )
    version = info["frameworkVersion"]
    if version != SDK_VERSION:
        parser.error(f"Flutter {SDK_VERSION} is required; found {version}")
    print(f"Flutter {version} ({info['frameworkRevision']}); Dart {info['dartSdkVersion']}", flush=True)
    benchmark(flutter, args.platform)


if __name__ == "__main__":
    main()
