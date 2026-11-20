library;

import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

part 'src/glyphs.g.dart';

/// One icon and style from the Fos catalog.
final class FosGlyph {
  const FosGlyph._(this._svg, this._primary, this._secondary, this._modifier);

  final String _svg;
  final Color? _primary;
  final Color? _secondary;
  final Color? _modifier;
}

/// A 24-unit Fos vector icon with optional palette and stroke overrides.
///
/// Monochrome glyphs use [IconTheme] unless [primaryColor] is provided.
/// Multicolor glyphs retain the artwork's palette unless overridden.
/// Omit [semanticLabel] for a decorative icon.
class FosIcon extends StatelessWidget {
  /// Draws [glyph]. Supply a label only when the icon conveys meaning on its own.
  const FosIcon(
    this.glyph, {
    super.key,
    this.size,
    this.primaryColor,
    this.secondaryColor,
    this.modifierColor,
    this.strokeWidth,
    this.semanticLabel,
  }) : assert(size == null || (size >= 0 && size < double.infinity)),
       assert(
         strokeWidth == null ||
             (strokeWidth >= 0 && strokeWidth < double.infinity),
       );

  /// The icon and style to draw.
  final FosGlyph glyph;

  /// Side length in logical pixels; defaults to the ambient icon size.
  final double? size;

  /// Overrides the primary color without changing the authored accent colors.
  final Color? primaryColor;

  /// Overrides the secondary role used by Duocolor glyphs.
  final Color? secondaryColor;

  /// Overrides the independently tintable modifier badge, if present.
  final Color? modifierColor;

  /// Replaces explicit stroke widths in the 24-unit artwork.
  final double? strokeWidth;

  /// The localized label announced by assistive technology, or null if decorative.
  final String? semanticLabel;

  static final _stroke = RegExp(r'stroke-width="[^"]+"');

  @override
  Widget build(BuildContext context) {
    final theme = IconTheme.of(context);
    final dimension = size ?? theme.size ?? 24;
    final primary =
        primaryColor ??
        glyph._primary ??
        theme.color ??
        const Color(0xFF000000);
    final data = strokeWidth == null
        ? glyph._svg
        : glyph._svg.replaceAll(_stroke, 'stroke-width="$strokeWidth"');
    return SvgPicture.string(
      data,
      width: dimension,
      height: dimension,
      semanticsLabel: semanticLabel,
      excludeFromSemantics: semanticLabel == null,
      colorMapper: _Palette(
        primary,
        secondaryColor ?? glyph._secondary ?? primary,
        modifierColor ?? glyph._modifier ?? primary,
      ),
    );
  }
}

final class _Palette extends ColorMapper {
  const _Palette(this.primary, this.secondary, this.modifier);

  final Color primary;
  final Color secondary;
  final Color modifier;

  @override
  Color substitute(
    String? id,
    String elementName,
    String attributeName,
    Color color,
  ) {
    return switch (color.toARGB32()) {
      0xFF0102A1 => primary,
      0xFF0102A2 => secondary,
      0xFF0102A3 => modifier,
      _ => color,
    };
  }

  @override
  bool operator ==(Object other) =>
      other is _Palette &&
      other.primary == primary &&
      other.secondary == secondary &&
      other.modifier == modifier;

  @override
  int get hashCode => Object.hash(primary, secondary, modifier);
}
