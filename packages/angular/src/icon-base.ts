import { APP_ID, Directive, inject, Injectable, input } from '@angular/core';

@Injectable({ providedIn: 'root' })
class IconIds {
  private readonly appId = inject(APP_ID);
  private next = 0;

  allocate(): string {
    return `fos-${this.appId}-${++this.next}`;
  }
}

@Directive({
  host: {
    '[attr.width]': 'size()',
    '[attr.height]': 'size()',
    '[style.--fos-primary]': 'primaryColor()',
    '[style.--fos-secondary]': 'secondaryColor()',
    '[style.--fos-modifier]': 'modifierColor()',
    '[attr.aria-label]': 'label() || title() || null',
    '[attr.aria-hidden]': 'label() || title() ? null : "true"',
    '[attr.role]': 'label() || title() ? "img" : null',
  },
})
export abstract class IconBase {
  readonly size = input<number | string>(24);
  readonly color = input<string>();
  readonly primaryColor = input<string>();
  readonly secondaryColor = input<string>();
  readonly modifierColor = input<string>();
  readonly strokeWidth = input<number | string>();
  readonly title = input<string>();
  readonly label = input<string>();
  readonly iconId = input<string>();

  private readonly ids = inject(IconIds);
  private generatedId?: string;

  protected fragmentId(suffix: string): string {
    const prefix = this.iconId() || (this.generatedId ??= this.ids.allocate());
    return `${prefix}-${suffix}`;
  }
}
