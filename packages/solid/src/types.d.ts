import type { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';

export interface IconProps extends Omit<JSX.IntrinsicElements['svg'], 'children' | 'color'> {
  size?: number | string;
  color?: string;
  primaryColor?: string;
  secondaryColor?: string;
  modifierColor?: string;
  strokeWidth?: number | string;
  title?: string;
  titleId?: string;
}

export type FosIcon = Component<IconProps>;
