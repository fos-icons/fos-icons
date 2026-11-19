<script lang="ts">
  import type { IconNode, IconProps } from './types.js';
  import { scopeAttributes } from './attributes.js';

  interface Props {
    iconProps: IconProps;
    sourceColor: string | null;
    nodes: IconNode[];
  }

  let { iconProps, sourceColor, nodes }: Props = $props();
  let {
    size = 24,
    color,
    primaryColor,
    secondaryColor,
    modifierColor,
    strokeWidth,
    title,
    titleId,
    style,
    ...attributes
  } = $derived(iconProps);

  const instanceId = $props.id();
  const prefix = `fos-${instanceId}`;
  const resolvedTitleId = $derived(titleId ?? `${prefix}-title`);
  const hasName = $derived(Boolean(title || attributes['aria-label'] || attributes['aria-labelledby']));
  const resolvedStyle = $derived([
    primaryColor != null ? `--fos-primary:${primaryColor}` : '',
    secondaryColor != null ? `--fos-secondary:${secondaryColor}` : '',
    modifierColor != null ? `--fos-modifier:${modifierColor}` : '',
    style ?? '',
  ].filter(Boolean).join(';'));
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  color={color ?? primaryColor ?? sourceColor}
  focusable="false"
  role={hasName ? 'img' : undefined}
  aria-hidden={hasName ? undefined : true}
  aria-labelledby={title && !attributes['aria-label'] && !attributes['aria-labelledby'] ? resolvedTitleId : undefined}
  style={resolvedStyle || undefined}
  {...attributes}
>
  {#if title}<title id={resolvedTitleId}>{title}</title>{/if}
  {#snippet geometry(children: IconNode[])}
    {#each children as node}
      <svelte:element this={node.tag} {...scopeAttributes(node.attributes, prefix, strokeWidth)}>
        {@render geometry(node.children)}
      </svelte:element>
    {/each}
  {/snippet}
  {@render geometry(nodes)}
</svg>
