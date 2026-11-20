import 'package:flutter/widgets.dart';
import 'package:fos_icons/fos_icons.dart';

void main() {
  runApp(
    const Directionality(
      textDirection: TextDirection.ltr,
      child: Center(
        child: FosIcon(
          FosIcons.calendarCheckDuocolor,
          size: 32,
          semanticLabel: 'Calendar confirmed',
        ),
      ),
    ),
  );
}
