import { Component, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import CameraRegular from '@fos-icons/angular/regular/camera';
import CameraFilled from '@fos-icons/angular/filled/camera';
import CalendarAddDuocolor from '@fos-icons/angular/duocolor/calendar-add';
import CameraDuotone from '@fos-icons/angular/duotone/camera';

@Component({
  selector: 'icon-test',
  imports: [CameraRegular, CameraFilled, CalendarAddDuocolor, CameraDuotone],
  template: `
    <svg fos-camera-regular class="camera"></svg>
    <svg fos-camera-regular [size]="32" title="Camera &amp; lens" [strokeWidth]="2" color="red"></svg>
    <svg fos-camera-filled label="Record" [strokeWidth]="3"></svg>
    <svg fos-calendar-add-duocolor iconId="calendar" primaryColor="navy" secondaryColor="skyblue"></svg>
    <svg fos-calendar-add-duocolor></svg>
    <svg fos-calendar-add-duocolor></svg>
    <svg fos-camera-duotone></svg>
  `,
})
class Consumer {}

export function render() {
  return renderApplication(
    () => bootstrapApplication(Consumer, {
      providers: [provideServerRendering(), provideZonelessChangeDetection()],
    }),
    { document: '<icon-test></icon-test>', url: 'http://localhost/' },
  );
}
