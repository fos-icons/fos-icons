import { createUniqueId, omit } from 'solid-js';
import { dynamic } from '@solidjs/web';

function scopeAttributes(attributes, prefix, strokeWidth) {
  return Object.fromEntries(Object.entries(attributes).map(([name, value]) => {
    if (name === 'id') return [name, `${prefix}-${value}`];
    if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) {
      return [name, `#${prefix}-${value.slice(1)}`];
    }
    if (name === 'stroke-width') return [name, strokeWidth ?? value];
    return [name, value.replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}-${id})`)];
  }));
}

function renderNode(node, prefix, props) {
  const Tag = dynamic(() => node.tag, { static: true });
  return (
    <Tag {...scopeAttributes(node.attributes, prefix, props.strokeWidth)}>
      {node.children.map(child => renderNode(child, prefix, props))}
    </Tag>
  );
}

function iconStyle(props) {
  const colors = {};
  if (props.primaryColor != null) colors['--fos-primary'] = props.primaryColor;
  if (props.secondaryColor != null) colors['--fos-secondary'] = props.secondaryColor;
  if (props.modifierColor != null) colors['--fos-modifier'] = props.modifierColor;
  if (!Object.keys(colors).length) return props.style;
  if (typeof props.style !== 'string') return { ...colors, ...props.style };
  return [...Object.entries(colors).map(([key, value]) => `${key}:${value}`), props.style].join(';');
}

export function createIcon(nodes, sourceColor) {
  return function FosIcon(local) {
    const attributes = omit(local,
      'size', 'color', 'primaryColor', 'secondaryColor', 'modifierColor', 'strokeWidth',
      'title', 'titleId', 'style', 'aria-label', 'aria-labelledby', 'children',
    );
    const id = `fos-${createUniqueId()}`;
    const titleId = () => local.titleId ?? `${id}-title`;
    const named = () => Boolean(local.title || local['aria-label'] || local['aria-labelledby']);

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={local.size ?? 24}
        height={local.size ?? 24}
        viewBox="0 0 24 24"
        fill="none"
        color={local.color ?? local.primaryColor ?? sourceColor}
        focusable="false"
        role={named() ? 'img' : undefined}
        aria-hidden={named() ? undefined : 'true'}
        aria-label={local['aria-label']}
        aria-labelledby={local['aria-labelledby'] ?? (local.title && !local['aria-label'] ? titleId() : undefined)}
        style={iconStyle(local)}
        {...attributes}
      >
        {local.title ? <title id={titleId()}>{local.title}</title> : undefined}
        {nodes.map(node => renderNode(node, id, local))}
      </svg>
    );
  };
}
