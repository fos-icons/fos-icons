export function iconAliasEntries(manifest) {
  const aliases = manifest.iconAliases;
  if (aliases === undefined) return [];
  if (!aliases || typeof aliases !== 'object' || Array.isArray(aliases)) {
    throw new Error('iconAliases must map legacy names to canonical names');
  }
  const canonical = new Map(manifest.icons.map(icon => [icon.name, icon]));
  const excluded = manifest.excludedBrands ?? manifest.source?.excludedBrands ?? [];
  return Object.entries(aliases).map(([alias, target]) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(alias) || canonical.has(alias)
      || excluded.includes(alias) || !canonical.has(target)) {
      throw new Error(`Invalid icon alias: ${alias} → ${target}`);
    }
    return [alias, target];
  });
}

export function iconAliasExports(manifest, style, componentName, names) {
  return iconAliasEntries(manifest).map(([alias, target]) => {
    const name = componentName(alias, style);
    if (names.has(name)) throw new Error(`Component name collision: ${name}`);
    names.add(name);
    return { alias, target, name, original: componentName(target, style) };
  });
}

export function aliasModule(target, original, name, extension = 'js') {
  return `export { ${original} as ${name}, ${original} as default } from './${target}.${extension}';\n`;
}
