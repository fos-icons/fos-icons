import * as Vue from 'vue';

const { defineComponent, h } = Vue;
// Vue 3.5+ provides SSR- and hydration-stable IDs. Older 3.x releases fall
// back to a per-runtime counter, which is unique but not hydration-stable.
const vueUseId = Vue.useId;
let fallbackId = 0;

function instanceId() {
  const id = vueUseId ? vueUseId() : undefined;
  return id ? `fos-${id}` : `fos-f${(fallbackId += 1).toString(36)}`;
}

function scopeProps(props, prefix) {
  const scoped = {};
  for (const [name, value] of Object.entries(props)) {
    if (name === 'id') {
      scoped.id = `${prefix}-${value}`;
    } else if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) {
      scoped[name] = `#${prefix}-${value.slice(1)}`;
    } else {
      scoped[name] = value.replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}-${id})`);
    }
  }
  return scoped;
}

function renderNode([tag, props, children], prefix) {
  return h(tag, scopeProps(props, prefix), children.map(child => renderNode(child, prefix)));
}

const iconProps = {
  size: { type: [Number, String], default: 24 },
  color: String,
  primaryColor: String,
  secondaryColor: String,
  modifierColor: String,
  title: String,
  titleId: String,
};

export function createIcon(name, rootProps, nodes) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: iconProps,
    setup(props, { attrs, slots }) {
      const prefix = instanceId();
      return () => {
        const label = attrs['aria-label'];
        const labelledBy = attrs['aria-labelledby'];
        const titleId = props.titleId ?? `${prefix}-title`;
        const hasName = Boolean(props.title || label || labelledBy);
        const variables = {};
        if (props.primaryColor != null) variables['--fos-primary'] = props.primaryColor;
        if (props.secondaryColor != null) variables['--fos-secondary'] = props.secondaryColor;
        if (props.modifierColor != null) variables['--fos-modifier'] = props.modifierColor;
        const color = props.color ?? props.primaryColor;

        return h(
          'svg',
          {
            ...scopeProps(rootProps, prefix),
            width: props.size,
            height: props.size,
            focusable: 'false',
            ...(hasName ? { role: 'img' } : { 'aria-hidden': 'true' }),
            ...attrs,
            ...(color != null ? { color } : {}),
            ...(props.title && !label && !labelledBy ? { 'aria-labelledby': titleId } : {}),
            // Caller styles follow, so they override the color-prop variables.
            ...(Object.keys(variables).length ? { style: [variables, attrs.style] } : {}),
          },
          [
            ...(props.title ? [h('title', { id: titleId }, props.title)] : []),
            ...nodes.map(node => renderNode(node, prefix)),
            ...(slots.default?.() ?? []),
          ],
        );
      };
    },
  });
}
