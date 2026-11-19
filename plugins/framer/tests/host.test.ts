import { beforeEach, describe, expect, it, vi } from "vitest"
import { connectHost, type CanvasState } from "../src/host"

const sdk = vi.hoisted(() => ({
  selection: [] as { id: string; type: string }[],
  allowed: true,
  addSVG: vi.fn(),
  showUI: vi.fn().mockResolvedValue(undefined),
  selectionListener: undefined as ((nodes: { id: string; type: string }[]) => void) | undefined,
  permissionListener: undefined as (() => void) | undefined,
}))
vi.mock("@framer/plugin", () => ({
  isSVGNode: (node: { type: string }) => node.type === "SVG",
  framer: {
    showUI: sdk.showUI,
    isAllowedTo: () => sdk.allowed,
    getSelection: async () => sdk.selection,
    addSVG: sdk.addSVG,
    subscribeToSelection: (listener: typeof sdk.selectionListener) => {
      sdk.selectionListener = listener
      listener?.(sdk.selection)
      return () => { sdk.selectionListener = undefined }
    },
    subscribeToIsAllowedTo: (_method: string, listener: typeof sdk.permissionListener) => {
      sdk.permissionListener = listener
      return () => { sdk.permissionListener = undefined }
    },
  },
}))
beforeEach(() => {
  sdk.selection = []
  sdk.allowed = true
  sdk.addSVG.mockReset().mockResolvedValue(undefined)
})
async function connection() {
  const host = await connectHost()
  let state: CanvasState | undefined
  const unsubscribe = host.subscribe(value => { state = value })
  expect(state).toBeDefined()
  return { host, get state() { return state! }, unsubscribe }
}
describe("Framer host bridge", () => {
  it("passes SVGData to the real SDK contract and unsubscribes", async () => {
    const connectionState = await connection()
    await connectionState.host.insert("<svg/>", "Fos / test / Regular", connectionState.state)
    expect(sdk.addSVG).toHaveBeenCalledWith({ svg: "<svg/>", name: "Fos / test / Regular" })
    connectionState.unsubscribe()
    expect(sdk.selectionListener).toBeUndefined()
    expect(sdk.permissionListener).toBeUndefined()
  })
  it("reports selected SVG replacement and ambiguous multi-selection", async () => {
    sdk.selection = [{ id: "a", type: "SVG" }]
    const c = await connection()
    expect(c.state.replaces).toBe(true)
    sdk.selection = [...sdk.selection, { id: "b", type: "Frame" }]
    sdk.selectionListener?.(sdk.selection)
    expect(c.state.ambiguous).toBe(true)
    await expect(c.host.insert("<svg/>", "test", c.state)).rejects.toThrow("selection changed")
    expect(sdk.addSVG).not.toHaveBeenCalled()
    c.unsubscribe()
  })
  it("rejects stale selection and revoked permissions without writing", async () => {
    const c = await connection()
    const previous = c.state
    sdk.selection = [{ id: "new", type: "SVG" }]
    await expect(c.host.insert("<svg/>", "test", previous)).rejects.toThrow("selection changed")
    sdk.allowed = false
    sdk.permissionListener?.()
    expect(c.state.allowed).toBe(false)
    await expect(c.host.insert("<svg/>", "test", c.state)).rejects.toThrow("permission")
    expect(sdk.addSVG).not.toHaveBeenCalled()
    c.unsubscribe()
  })
})
