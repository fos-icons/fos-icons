export interface SvgOptions {
  size: number
  primary: string
  secondary: string
  strokeWidth?: number
  prefix: string
}

const paintAttributes = ["fill", "stroke", "color", "stop-color", "flood-color", "lighting-color"]
export const isColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value)

// Adapted from fosicons.com/src/lib/svg.ts. Keep geometry and authored masks intact.
export function buildSvg(source: string, options: SvgOptions): string {
  if (!Number.isFinite(options.size) || options.size < 8 || options.size > 512) {
    throw new Error("Choose an icon size between 8 and 512 px.")
  }
  if (!isColor(options.primary) || !isColor(options.secondary)) {
    throw new Error("Enter colors as six-digit hex values, such as #245B9E.")
  }
  if (options.strokeWidth !== undefined &&
    (!Number.isFinite(options.strokeWidth) || options.strokeWidth < 0.5 || options.strokeWidth > 2.5)) {
    throw new Error("Choose a stroke weight between 0.5 and 2.5.")
  }
  const document = new DOMParser().parseFromString(source, "image/svg+xml")
  const root = document.documentElement
  if (root.localName !== "svg" || document.querySelector("parsererror")) throw new Error("Invalid SVG artwork.")
  const all = [root, ...root.querySelectorAll("*")]
  const ids = new Map<string, string>()
  for (const [index, node] of all.entries()) {
    const id = node.getAttribute("id")
    if (id) {
      const next = `${options.prefix}-${index}`
      ids.set(id, next)
      node.setAttribute("id", next)
    }
  }
  const resolve = (value: string): string => {
    const match = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+?)\s*)?\)$/.exec(value.trim())
    if (!match) return value
    if (match[1] === "--fos-primary") return options.primary
    if (match[1] === "--fos-secondary") return options.secondary
    return match[2] ? resolve(match[2]) : options.primary
  }
  for (const node of all) {
    for (const attribute of paintAttributes) {
      const value = node.getAttribute(attribute)
      if (value?.includes("var(")) node.setAttribute(attribute, resolve(value))
    }
    for (const attribute of [...node.attributes]) {
      const value = attribute.value.replace(/url\(#([^)]+)\)/g, (original, id: string) =>
        ids.has(id) ? `url(#${ids.get(id)})` : original)
      node.setAttribute(attribute.name, value)
      if ((attribute.name === "href" || attribute.name === "xlink:href") && value.startsWith("#") && ids.has(value.slice(1))) {
        node.setAttribute(attribute.name, `#${ids.get(value.slice(1))}`)
      }
    }
    const stroke = node.getAttribute("stroke-width")
    if (stroke && options.strokeWidth !== undefined && options.strokeWidth !== 1.25 && Number.isFinite(Number(stroke))) {
      node.setAttribute("stroke-width", String(Math.round(Number(stroke) * options.strokeWidth / 1.25 * 1000) / 1000))
    }
  }
  root.setAttribute("color", options.primary)
  const walk = (node: Element, inherited: string) => {
    const own = node.getAttribute("color")
    const color = own && own !== "currentColor" && own !== "inherit" ? own : inherited
    if (own) node.setAttribute("color", color)
    for (const attribute of paintAttributes) {
      if (node.getAttribute(attribute) === "currentColor") node.setAttribute(attribute, color)
    }
    for (const child of node.children) walk(child, color)
  }
  walk(root, options.primary)
  root.setAttribute("width", String(options.size))
  root.setAttribute("height", String(options.size))
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  return new XMLSerializer().serializeToString(root)
}
