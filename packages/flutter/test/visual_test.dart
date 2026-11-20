import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fos_icons/fos_icons.dart';

import 'catalog.g.dart';

const referencePath = String.fromEnvironment('FOS_REFERENCE');
const tileSize = 96;

Color? color(Object? value) => value is String
    ? Color(0xFF000000 | int.parse(value.substring(1), radix: 16))
    : null;

void main() {
  testWidgets('exposes an optional semantic label and inherits icon size', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        const Directionality(
          textDirection: TextDirection.ltr,
          child: IconTheme(
            data: IconThemeData(size: 32, color: Color(0xFF613084)),
            child: Center(
              child: FosIcon(
                FosIcons.binocularsRegular,
                semanticLabel: 'Explore',
              ),
            ),
          ),
        ),
      );
      expect(tester.getSize(find.byType(FosIcon)), const Size(32, 32));
      expect(find.bySemanticsLabel('Explore'), findsOneWidget);
      await tester.pumpWidget(
        const Center(child: FosIcon(FosIcons.binocularsFilled)),
      );
      expect(
        tester.widget<SvgPicture>(find.byType(SvgPicture)).excludeFromSemantics,
        isTrue,
      );
    } finally {
      semantics.dispose();
    }
  });

  final cases = (jsonDecode(File('test/cases.json').readAsStringSync()) as List)
      .cast<Map<String, Object?>>();
  for (final (index, variant) in cases.indexed) {
    final name = '${variant['style']}/${variant['icon']}';
    testWidgets('matches browser SVG: $name (case $index)', (tester) async {
      await tester.pumpWidget(
        Center(
          child: FosIcon(
            catalog[name]!,
            size: tileSize.toDouble(),
            primaryColor: color(variant['primary']),
            secondaryColor: color(variant['secondary']),
            modifierColor: color(variant['modifier']),
            strokeWidth: (variant['stroke'] as num?)?.toDouble(),
          ),
        ),
      );
      final picture = find.byType(SvgPicture);
      final loader = tester.widget<SvgPicture>(picture).bytesLoader;
      final context = tester.element(picture);
      final result = await tester.runAsync(() async {
        final vector = await vg.loadPicture(loader, context);
        final recorder = ui.PictureRecorder();
        ui.Canvas(recorder)
          ..drawColor(const Color(0xFFFFFFFF), ui.BlendMode.src)
          ..scale(tileSize / vector.size.width, tileSize / vector.size.height)
          ..drawPicture(vector.picture);
        final frame = recorder.endRecording();
        final actual = await frame.toImage(tileSize, tileSize);
        vector.picture.dispose();
        frame.dispose();
        final codec = await ui.instantiateImageCodec(
          await File(referencePath).readAsBytes(),
        );
        final reference = (await codec.getNextFrame()).image;
        try {
          expect(actual.width, tileSize);
          expect(actual.height, tileSize);
          final pixels = (await actual.toByteData())!;
          final hole = switch (name) {
            'regular/credit-card-down' => (71, 71),
            'duocolor/calendar-check' => (68, 77),
            _ => null,
          };
          if (hole != null) {
            final (x, y) = hole;
            expect(
              pixels.getUint32(4 * (y * tileSize + x)),
              0xFFFFFFFF,
              reason: 'The badge cutout should reveal the background.',
            );
            expect(
              pixels.getUint32(4 * (y * tileSize + 58)),
              isNot(0xFFFFFFFF),
              reason: 'The adjacent badge fill should still be painted.',
            );
          }
          return compare(
            pixels,
            (await reference.toByteData())!,
            reference.width,
            index % 3 * tileSize,
            index ~/ 3 * tileSize,
          );
        } finally {
          actual.dispose();
          reference.dispose();
          codec.dispose();
        }
      });

      final (mean, severe) = result!;
      // Separate average edge antialiasing error from large pixel deviations.
      print(
        '$name case $index: mean=${mean.toStringAsFixed(3)}/255, '
        'severe=${(severe * 100).toStringAsFixed(2)}%',
      );
      expect(mean, lessThan(2.5));
      expect(severe, lessThan(0.01));
    }, skip: referencePath.isEmpty);
  }
}

(double, double) compare(
  ByteData actual,
  ByteData reference,
  int width,
  int left,
  int top,
) {
  var total = 0;
  var severe = 0;
  for (var y = 0; y < tileSize; y++) {
    for (var x = 0; x < tileSize; x++) {
      final a = 4 * (y * tileSize + x);
      final b = 4 * ((y + top) * width + x + left);
      var delta = 0;
      for (var c = 0; c < 3; c++) {
        final diff = (actual.getUint8(a + c) - reference.getUint8(b + c)).abs();
        total += diff;
        delta = math.max(delta, diff);
      }
      if (delta > 64) severe++;
    }
  }
  const pixels = tileSize * tileSize;
  return (total / (pixels * 3), severe / pixels);
}
