import type { CSSProperties, DefineComponent, StyleValue, SVGAttributes } from 'vue';

export interface IconStyle extends CSSProperties {
  '--fos-primary'?: string;
  '--fos-secondary'?: string;
  '--fos-modifier'?: string;
}

/** Props declared by every Fos icon component. */
export interface IconOwnProps {
  /** Width and height. Defaults to 24; explicit `width` and `height` win. */
  size?: number | string;
  /** Sets the SVG `color`; takes precedence over `primaryColor`. */
  color?: string;
  /** Sets `--fos-primary` (and the SVG `color` when `color` is absent). */
  primaryColor?: string;
  /** Sets `--fos-secondary` for duo accents. */
  secondaryColor?: string;
  /** Sets `--fos-modifier` for presets with an independent glyph color. */
  modifierColor?: string;
  /** Accessible name. Adds `<title>`, `role="img"`, and `aria-labelledby`. */
  title?: string;
  /** Explicit ID for the generated `<title>`; must be unique on the page. */
  titleId?: string;
}

/** Icon props plus native SVG attributes and listeners, which fall through to `<svg>`. */
export interface IconProps
  extends IconOwnProps,
    Omit<SVGAttributes, keyof IconOwnProps | 'style'> {
  style?: IconStyle | StyleValue;
}

export type FosIcon = DefineComponent<IconProps>;
