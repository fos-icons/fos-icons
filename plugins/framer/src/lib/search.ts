import type { Icon } from "./catalog"

const normalize = (value: string) => value.toLowerCase().replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim()

// Same ranking as the Fos website: names, then aliases, tags, and categories.
export function createIndex(icons: Icon[]) {
  return icons.map(icon => ({
    icon, name: normalize(icon.name),
    aliases: icon.aliases.map(normalize), tags: icon.tags.map(normalize),
    category: normalize(icon.category),
  }))
}

export function search(index: ReturnType<typeof createIndex>, query: string, category = ""): Icon[] {
  const q = normalize(query)
  const terms = q.split(" ").filter(Boolean)
  return index.filter(entry => !category || entry.icon.category === category)
    .map(entry => {
      let score = entry.name === q ? 200 : 0
      for (const term of terms) {
        const weight = entry.name === term ? 100 : entry.name.startsWith(term) ? 60
          : entry.name.split(" ").includes(term) ? 50 : entry.name.includes(term) ? 40
          : entry.aliases.some(alias => alias === term || alias.split(" ").includes(term)) ? 30
          : entry.tags.includes(term) ? 25 : entry.aliases.some(alias => alias.includes(term)) ? 20
          : entry.tags.some(tag => tag.includes(term)) ? 15 : entry.category.includes(term) ? 10 : 0
        if (!weight) return { icon: entry.icon, score: -1 }
        score += weight
      }
      return { icon: entry.icon, score }
    }).filter(entry => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.icon.name.localeCompare(b.icon.name))
    .map(entry => entry.icon)
}
