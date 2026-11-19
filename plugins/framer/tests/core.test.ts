import { describe, expect, it } from "vitest"
import { createIndex, search } from "../src/lib/search"
import { buildSvg } from "../src/lib/svg"
import { icons, styles } from "../src/lib/catalog"
import { readFileSync, readdirSync } from "node:fs"

const options = { size: 32, primary: "#123456", secondary: "#ABCDEF", prefix: "test" }

describe("search", () => {
  const index = createIndex(icons)
  it("finds exact, case-insensitive, spaced, and multi-term names", () => {
    expect(search(index, "ACTIVITY")[0].name).toBe("activity")
    const hyphenated = icons.find(icon => icon.name.includes("-"))!
    expect(search(index, hyphenated.name.replaceAll("-", " "))[0].name).toBe(hyphenated.name)
    expect(search(index, "not-a-real-icon-qxyz")).toEqual([])
  })
  it("searches aliases and tags and respects categories", () => {
    const icon = icons.find(icon => icon.tags.length)!
    expect(search(index, icon.tags[0]).some(result => result.name === icon.name)).toBe(true)
    expect(search(index, "", icon.category).every(result => result.category === icon.category)).toBe(true)
  })
})

describe("standalone SVG", () => {
  it("resolves paint, scales proportional strokes, preserves masks and namespaces references", () => {
    const svg = buildSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><mask id="cut"><path fill="white" d="M0 0h24v24H0z"/></mask></defs><g opacity="0.16" color="var(--fos-secondary, #000000)"><path mask="url(#cut)" stroke="currentColor" stroke-width="2.5" fill="var(--fos-primary, #000000)" d="M1 1h2"/></g></svg>', { ...options, strokeWidth: 0.625 })
    expect(svg).toContain('stroke="#ABCDEF"')
    expect(svg).toContain('fill="#123456"')
    expect(svg).toContain('stroke-width="1.25"')
    expect(svg).toContain('opacity="0.16"')
    expect(svg).toContain('mask="url(#test-2)"')
    expect(svg).toContain('width="32"')
    expect(svg).not.toContain("currentColor")
    expect(svg).not.toContain("var(")
  })
  it("rejects malformed sources and invalid settings", () => {
    expect(() => buildSvg("<bad/>", options)).toThrow("Invalid SVG")
    expect(() => buildSvg("<svg/>", { ...options, size: 0 })).toThrow("size")
    expect(() => buildSvg("<svg/>", { ...options, primary: "red" })).toThrow("hex")
  })
  it("exports every bundled SVG with geometry and opacity unchanged", () => {
    let count = 0
    for (const style of styles) {
      for (const file of readdirSync(`public/icons/${style}`)) {
        const chunk: Record<string, string> = JSON.parse(readFileSync(`public/icons/${style}/${file}`, "utf8"))
        for (const [name, source] of Object.entries(chunk)) {
          const output = buildSvg(source, { ...options, prefix: `f-${name}`, strokeWidth: style === "filled" ? undefined : 1.25 })
          expect(output, `${style}/${name}`).not.toMatch(/currentColor|var\(/)
          const before = new DOMParser().parseFromString(source, "image/svg+xml")
          const after = new DOMParser().parseFromString(output, "image/svg+xml")
          for (const attr of ["d", "points", "opacity", "fill-opacity", "viewBox", "stroke-width"]) {
            const values = (doc: Document) => [...doc.querySelectorAll(`[${attr}]`)].map(node => node.getAttribute(attr))
            expect(values(after), `${style}/${name} ${attr}`).toEqual(values(before))
          }
          count++
        }
      }
    }
    expect(count).toBe(icons.length * 4)
  }, 120_000)
})
