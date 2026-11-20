import 'package:flutter/widgets.dart';
import 'package:fos_icons/fos_icons.dart';

const iconCount = int.fromEnvironment('FOS_BENCHMARK_ICON_COUNT');

void main() {
  runApp(
    const Directionality(
      textDirection: TextDirection.ltr,
      child: Center(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (iconCount >= 1) FosIcon(FosIcons.binocularsRegular),
            if (iconCount == 6) ...[
              FosIcon(FosIcons.binocularsFilled),
              FosIcon(FosIcons.telescopeDuocolor),
              FosIcon(FosIcons.telescopeDuotone),
              FosIcon(FosIcons.creditCardDownRegular),
              FosIcon(FosIcons.calendarCheckDuocolor),
            ],
          ],
        ),
      ),
    ),
  );
}
