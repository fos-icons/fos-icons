import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const names = new Set(manifest.icons.map((icon) => icon.name));
const MATCHES = new Set(['exact', 'alias', 'curated', 'normalized', 'reordered', 'suggested']);

test('every skill has valid frontmatter', async () => {
  const dirs = await readdir(new URL('skills/', root));
  assert.ok(dirs.length >= 2);
  for (const dir of dirs) {
    const text = await readFile(new URL(`skills/${dir}/SKILL.md`, root), 'utf8');
    const front = /^---\n([\s\S]+?)\n---\n/.exec(text);
    assert.ok(front, `${dir}: missing frontmatter`);
    const name = /^name: (.+)$/m.exec(front[1])?.[1];
    const description = /^description: (.+)$/m.exec(front[1])?.[1];
    assert.equal(name, dir, `${dir}: name must match the folder`);
    assert.match(name, /^[a-z0-9-]{1,64}$/);
    assert.ok(description && description.length <= 1024, `${dir}: description missing or over 1024 characters`);
  }
});

for (const library of ['lucide', 'heroicons']) {
  test(`${library} migration map points only at real icons`, async () => {
    const data = JSON.parse(await readFile(new URL(`skills/fos-icons-migrate/maps/${library}.json`, root), 'utf8'));
    assert.equal(data.library, library);
    const entries = Object.entries(data.map);
    assert.ok(entries.length > 100);
    for (const [from, entry] of entries) {
      assert.ok(names.has(entry.to), `${library} ${from} → ${entry.to} is not a Fos icon (renamed or removed? rerun scripts/migration-maps.mjs)`);
      assert.ok(MATCHES.has(entry.match), `${library} ${from}: unknown match ${entry.match}`);
      assert.ok(!data.unmapped.includes(from));
      if (entry.match === 'exact') assert.equal(entry.to, from);
    }
    const counted = Object.values(data.counts).reduce((a, b) => a + b, 0);
    assert.equal(counted, entries.length + data.unmapped.length);
  });
}
