import type { Component } from 'svelte';
import type { SVGAttributes } from 'svelte/elements';

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'color' | 'children'> {
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

export interface IconNode {
  tag: string;
  attributes: Record<string, string>;
  children: IconNode[];
}
