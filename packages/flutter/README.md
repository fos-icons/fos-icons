# Fos Icons for Flutter

Fos Icons for Flutter provides 1,508 icons in Regular, Filled, Duocolor, and
Duotone styles, for 6,032 glyphs. It requires Flutter 3.44 or later and is not
published to pub.dev yet.

Add a path dependency in your Flutter app's `pubspec.yaml`:

```yaml
dependencies:
  fos_icons:
    path: ../fos-icons/packages/flutter
```

Use `FosIcon` with a constant from `FosIcons`. Names are lower camel case with
the style suffix: `binocularsRegular`, `binocularsFilled`, `telescopeDuocolor`,
or `telescopeDuotone`.

```dart
import 'package:flutter/widgets.dart';
import 'package:fos_icons/fos_icons.dart';

Widget confirmedCalendar() => const FosIcon(
  FosIcons.calendarCheckDuocolor,
  size: 32,
  primaryColor: Color(0xFF245B9E),
  secondaryColor: Color(0xFF5B87B7),
  modifierColor: Color(0xFF0F7B0F),
  strokeWidth: 1.5,
  semanticLabel: 'Calendar confirmed',
);
```

By default, monochrome glyphs use `IconTheme.color`, while multicolor glyphs
retain their authored colors. Omit `semanticLabel` when nearby text or a
button already provides an accessible name. Stroke overrides apply to explicit
SVG strokes; they do not expand filled shapes or change badge cutouts.

Each glyph is a separate Dart constant, not a Flutter asset. Release compilers
can discard unused constants; the renderer is shared. See the [usage example](example/fos_icons_example.dart).

## Contributing

From `packages/flutter`, with Python 3, Flutter and Chrome installed:

```sh
python3 tool/generate.py --check
flutter pub get
flutter analyze lib test example
python3 tool/compare.py
```

Run `python3 tool/generate.py` after canonical SVG changes. The generator
validates manifest digests, then resolves SVG color inheritance and lowers
nested viewports to transformed, clipped groups for `flutter_svg`. It does not
rewrite source artwork.

`tool/compare.py` checks that all glyphs decode and compares representative
Flutter output against Chrome at 96 x 96 pixels. Cases include palette and
stroke overrides, Duotone opacity, transparent cutouts, and scaled viewports.
Use `--chrome PATH` or `--flutter PATH` to override the executables. See
[benchmark](benchmark/) for release footprint and unused-glyph checks.
