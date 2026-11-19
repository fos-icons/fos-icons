/**
 * @param {Record<string, string>} attributes
 * @param {string} prefix
 * @param {number | string | undefined} strokeWidth
 * @returns {Record<string, string | number>}
 */
export function scopeAttributes(attributes, prefix, strokeWidth) {
  /** @type {Record<string, string | number>} */
  const scoped = {};
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'id') {
      scoped[name] = `${prefix}-${value}`;
    } else if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) {
      scoped[name] = `#${prefix}-${value.slice(1)}`;
    } else if (name === 'stroke-width') {
      scoped[name] = strokeWidth ?? value;
    } else {
      scoped[name] = value.replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}-${id})`);
    }
  }
  return scoped;
}
