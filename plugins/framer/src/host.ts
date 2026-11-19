export interface CanvasState {
  key: string
  ready: boolean
  allowed: boolean
  replaces: boolean
  ambiguous: boolean
}

export interface Host {
  preview: boolean
  subscribe: (listener: (state: CanvasState) => void) => () => void
  insert: (svg: string, name: string, expected: CanvasState) => Promise<void>
}

export const initialCanvas: CanvasState = {
  key: "", ready: false, allowed: false, replaces: false, ambiguous: false,
}

export async function connectHost(): Promise<Host> {
  if (import.meta.env.DEV && new URLSearchParams(location.search).get("preview") === "1") {
    return {
      preview: true,
      subscribe(listener) {
        listener({ ...initialCanvas, ready: true })
        return () => {}
      },
      async insert() { throw new Error("Open this plugin in Framer to insert icons.") },
    }
  }
  const { framer, isSVGNode } = await import("@framer/plugin")
  await framer.showUI({ position: "top right", width: 360, height: 680, resizable: true })
  type Selection = Awaited<ReturnType<typeof framer.getSelection>>
  const stateOf = (selection: Selection): CanvasState => ({
    key: selection.map(node => node.id).sort().join(","),
    ready: true,
    allowed: framer.isAllowedTo("addSVG"),
    replaces: selection.length === 1 && isSVGNode(selection[0]),
    ambiguous: selection.length > 1 && selection.some(isSVGNode),
  })
  return {
    preview: false,
    subscribe(listener) {
      let selection: Selection | null = null
      const publish = () => { if (selection) listener(stateOf(selection)) }
      const unsubscribeSelection = framer.subscribeToSelection(nodes => { selection = nodes; publish() })
      const unsubscribePermission = framer.subscribeToIsAllowedTo("addSVG", publish)
      return () => { unsubscribeSelection(); unsubscribePermission() }
    },
    async insert(svg, name, expected) {
      const current = stateOf(await framer.getSelection())
      if (!current.allowed) throw new Error("You need canvas editing permission to insert icons.")
      if (current.key !== expected.key || current.ambiguous) {
        throw new Error("Your canvas selection changed. Review the selection and try again.")
      }
      await framer.addSVG({ svg, name })
    },
  }
}
