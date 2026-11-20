import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fos_icons/fos_icons.dart';

import 'catalog.g.dart';

void main() {
  final manifest =
      jsonDecode(File('../../manifest.json').readAsStringSync())
          as Map<String, dynamic>;
  final styles = (manifest['styles'] as List).cast<String>();

  test('has a typed constant for every canonical name and style', () {
    final expected = <String>{
      for (final icon in manifest['icons'] as List)
        for (final style in styles) '$style/${icon['name']}',
    };
    expect(catalog.keys.toSet(), expected);
  });

  for (final style in styles) {
    testWidgets('decodes every $style glyph with the Flutter renderer', (
      tester,
    ) async {
      final entries = catalog.entries
          .where((entry) => entry.key.startsWith('$style/'))
          .toList();
      late BuildContext context;
      await tester.pumpWidget(
        Builder(
          builder: (value) {
            context = value;
            return const SizedBox.shrink();
          },
        ),
      );
      final decoded = await tester.runAsync(() async {
        var count = 0;
        for (final entry in entries) {
          final widget = FosIcon(entry.value).build(context) as SvgPicture;
          final picture = await vg.loadPicture(widget.bytesLoader, context);
          try {
            expect(picture.size, const Size(24, 24), reason: entry.key);
          } finally {
            picture.picture.dispose();
          }
          count++;
        }
        return count;
      });
      expect(decoded, entries.length);
    }, timeout: const Timeout(Duration(minutes: 3)));
  }
}
