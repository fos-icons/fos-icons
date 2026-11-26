import data from "../data/catalog.json"

export const styles = ["regular", "filled", "duocolor", "duotone"] as const
export type Style = typeof styles[number]
export const styleLabels: Record<Style, string> = {
  regular: "Regular", filled: "Filled", duocolor: "Duocolor", duotone: "Duotone",
}
export interface Icon {
  name: string
  category: string
  tags: string[]
  aliases: string[]
}
export const icons: Icon[] = data.icons
export const categories = data.categories
export const CHUNK_SIZE = 96
const positions = new Map(icons.map((icon, index) => [icon.name, index]))
const cache = new Map<string, Promise<Record<string, string>>>()

export function chunksFor(names: string[]) {
  return [...new Set(names.map(name => {
    const position = positions.get(name)
    if (position === undefined) throw new Error(`Unknown icon: ${name}`)
    return Math.floor(position / CHUNK_SIZE)
  }))]
}

export function loadChunk(style: Style, chunk: number): Promise<Record<string, string>> {
  const key = `${style}/${chunk}`
  let pending = cache.get(key)
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}icons/${style}/${String(chunk).padStart(3, "0")}.json`).then(async response => {
      if (!response.ok) throw new Error(`Couldn't load ${styleLabels[style]} icons (${response.status}). Try again.`)
      const value: unknown = await response.json()
      if (!value || typeof value !== "object" || Array.isArray(value) ||
        !Object.values(value).every(svg => typeof svg === "string" && svg.includes("<svg"))) {
        throw new Error("The bundled icon data is invalid. Reinstall the plugin.")
      }
      return value as Record<string, string>
    }).catch((error: unknown) => { cache.delete(key); throw error })
    cache.set(key, pending)
  }
  return pending
}
