import { afterEach, expect, it, vi } from "vitest"

afterEach(() => vi.unstubAllGlobals())

it("requests bundled padded chunk paths and permits retry after a load failure", async () => {
  vi.resetModules()
  const fetcher = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ accordion: "<svg/>" }) })
  vi.stubGlobal("fetch", fetcher)
  const { loadChunk } = await import("../src/lib/catalog")
  await expect(loadChunk("regular", 0)).rejects.toThrow("503")
  await expect(loadChunk("regular", 0)).resolves.toEqual({ accordion: "<svg/>" })
  expect(fetcher).toHaveBeenLastCalledWith("/icons/regular/000.json")
  await loadChunk("regular", 0)
  expect(fetcher).toHaveBeenCalledTimes(2)
})
