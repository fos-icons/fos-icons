import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { App } from "../src/App"
import { initialCanvas, type Host, type CanvasState } from "../src/host"
import { readFileSync } from "node:fs"

const current = { ...initialCanvas, ready: true, allowed: true }
function createHost(state: CanvasState = current, preview = false) {
  const insert = vi.fn<Host["insert"]>().mockResolvedValue(undefined)
  const host: Host = { preview, insert, subscribe(listener) { listener(state); return () => {} } }
  return { host, insert }
}
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
    ok: true, json: async () => JSON.parse(readFileSync(`public${url}`, "utf8")) as unknown,
  })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe("picker", () => {
  it("searches, customizes and inserts the exact chosen SVG", async () => {
    const { host, insert } = createHost()
    render(<App host={host} />)
    fireEvent.change(screen.getByLabelText("Search icons"), { target: { value: "activity" } })
    fireEvent.click(await screen.findByRole("button", { name: "activity" }))
    fireEvent.change(screen.getByLabelText("Icon size"), { target: { value: "48" } })
    fireEvent.change(screen.getByLabelText("Color hex"), { target: { value: "#FF5500" } })
    const button = screen.getByRole("button", { name: "Insert icon" })
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(button)
    await waitFor(() => expect(insert).toHaveBeenCalledOnce())
    const [svg, name] = insert.mock.calls[0]
    expect(svg).toContain('width="48"')
    expect(svg).toContain("#FF5500")
    expect(name).toBe("Fos / activity / Regular")
    expect(await screen.findByText("Icon inserted.")).toBeTruthy()
  })
  it("labels replacement explicitly and reports insertion failures", async () => {
    const { host, insert } = createHost({ ...current, replaces: true })
    insert.mockRejectedValue(new Error("Canvas is locked."))
    render(<App host={host} />)
    const button = screen.getByRole("button", { name: "Replace selected SVG" })
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(button)
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Canvas is locked.")
    expect(screen.queryByText("Selected SVG replaced.")).toBeNull()
  })
  it("supports empty state recovery, style switching and invalid settings", async () => {
    const { host } = createHost()
    render(<App host={host} />)
    fireEvent.change(screen.getByLabelText("Search icons"), { target: { value: "qxyzzzz" } })
    expect(screen.getByText("No icons found")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    fireEvent.click(screen.getByRole("button", { name: "Duocolor", exact: true }))
    expect(screen.getByLabelText("Duo palette")).toBeTruthy()
    expect(screen.getByLabelText("Secondary hex")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Solid", exact: true }))
    expect((screen.getByLabelText("Stroke weight") as HTMLSelectElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText("Icon size"), { target: { value: "0" } })
    expect((screen.getByRole("button", { name: "Insert icon" }) as HTMLButtonElement).disabled).toBe(true)
  })
  it.each([
    ["read-only", { ...current, allowed: false }, false],
    ["ambiguous selection", { ...current, ambiguous: true }, false],
    ["browser preview", current, true],
  ])("blocks insertion in %s", async (_label, state, preview) => {
    const { host } = createHost(state, preview)
    render(<App host={host} />)
    await waitFor(() => expect((screen.getByRole("button", { name: "Insert icon" }) as HTMLButtonElement).disabled).toBe(true))
  })
  it("moves focus through icons with arrow keys", async () => {
    const { host } = createHost()
    render(<App host={host} />)
    const first = await screen.findByRole("button", { name: "accordion", exact: true })
    first.focus()
    fireEvent.keyDown(first, { key: "ArrowRight" })
    expect(document.activeElement?.getAttribute("aria-label")).toBe("activity")
  })
})
