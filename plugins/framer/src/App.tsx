import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { initialCanvas, type Host } from "./host"
import { categories, chunksFor, icons, loadChunk, styleLabels, styles, type Style } from "./lib/catalog"
import { createIndex, search } from "./lib/search"
import { buildSvg, isColor } from "./lib/svg"
import paletteData from "./data/palettes.json"
import "./App.css"

const index = createIndex(icons)
const PAGE = 96
const messageOf = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Try again."

function Artwork({ source, name, primary, secondary, stroke, large = false }: {
  source: string; name: string; primary: string; secondary: string; stroke?: number; large?: boolean
}) {
  const svg = useMemo(() => buildSvg(source, {
    size: large ? 48 : 24, primary, secondary, strokeWidth: stroke,
    prefix: `${large ? "detail" : "grid"}-${name}`,
  }), [source, name, primary, secondary, stroke, large])
  return <span aria-hidden="true" className="artwork" dangerouslySetInnerHTML={{ __html: svg }} />
}

export function App({ host }: { host: Host }) {
  const [canvas, setCanvas] = useState(initialCanvas)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [style, setStyle] = useState<Style>("regular")
  const [selected, setSelected] = useState(icons[0].name)
  const [limit, setLimit] = useState(PAGE)
  const [art, setArt] = useState<{ style: Style; data: Record<string, string> }>({ style, data: {} })
  const [loadError, setLoadError] = useState("")
  const [retry, setRetry] = useState(0)
  const [actionError, setActionError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [size, setSize] = useState("24")
  const [weight, setWeight] = useState(1.25)
  const [primaryOverride, setPrimary] = useState<string | null>(null)
  const [secondary, setSecondary] = useState("#5B87B7")
  const [theme, setTheme] = useState(document.body.dataset.framerTheme ?? "light")
  const primary = primaryOverride ?? (theme === "dark" ? "#F2F2F2" : "#212121")
  const searchRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const results = useMemo(() => search(index, query, category), [query, category])
  const visible = results.slice(0, limit)
  const wanted = [...new Set([...visible.map(icon => icon.name), selected])]
  const chunkKey = chunksFor(wanted).join(",")
  const currentArt = art.style === style ? art.data : {}
  const source = currentArt[selected]
  const selectedIcon = icons.find(icon => icon.name === selected)!
  const duo = style === "duocolor" || style === "duotone"
  const valid = isColor(primary) && isColor(secondary) && Number.isInteger(Number(size)) && Number(size) >= 8 && Number(size) <= 512
  const stroke = style === "filled" ? undefined : weight
  const previewPrimary = isColor(primary) ? primary : "#212121"
  const previewSecondary = isColor(secondary) ? secondary : "#5B87B7"

  useEffect(() => host.subscribe(setCanvas), [host])
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.body.dataset.framerTheme ?? "light"))
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-framer-theme"] })
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target
      if (event.key === "/" && target instanceof HTMLElement &&
        !target.closest("input, select, textarea, [contenteditable=true]")) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])
  useEffect(() => {
    let active = true
    setLoadError("")
    const chunks = chunkKey.split(",").filter(Boolean).map(Number)
    void Promise.all(chunks.map(chunk => loadChunk(style, chunk))).then(parts => {
      if (active) setArt(previous => ({
        style, data: Object.assign({}, previous.style === style ? previous.data : {}, ...parts),
      }))
    }).catch((error: unknown) => { if (active) setLoadError(messageOf(error)) })
    return () => { active = false }
  }, [style, chunkKey, retry])

  const resetResults = () => {
    setLimit(PAGE)
    gridRef.current?.scrollTo?.(0, 0)
  }
  const selectIcon = (name: string) => { setSelected(name); setNotice(""); setActionError("") }
  const onGridKey = (event: KeyboardEvent<HTMLButtonElement>, position: number) => {
    const gridWidth = gridRef.current?.querySelector(".icon-grid")?.clientWidth ?? 320
    const columns = Math.max(1, Math.floor((gridWidth + 6) / 58))
    const offset = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[event.key]
    let next = position
    if (offset !== undefined) next = Math.max(0, Math.min(visible.length - 1, position + offset))
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = visible.length - 1
    else return
    event.preventDefault()
    selectIcon(visible[next].name)
    gridRef.current?.querySelectorAll<HTMLButtonElement>(".icon-cell")[next]?.focus()
  }
  const insert = async () => {
    if (busyRef.current || !source || !valid) return
    busyRef.current = true
    setBusy(true); setActionError(""); setNotice("")
    try {
      await host.insert(buildSvg(source, {
        size: Number(size), primary, secondary, strokeWidth: stroke,
        prefix: `fos-${selected}-${crypto.randomUUID()}`,
      }), `Fos / ${selected} / ${styleLabels[style]}`, canvas)
      setNotice(canvas.replaces ? "Selected SVG replaced." : "Icon inserted.")
    } catch (error) {
      setActionError(messageOf(error))
    } finally { busyRef.current = false; setBusy(false) }
  }
  const insertionDisabled = host.preview || !canvas.ready || !canvas.allowed || canvas.ambiguous || !source || !valid || busy
  const selectedVisible = visible.some(icon => icon.name === selected)
  return <main className="plugin">
    <header className="header">
      <div className="brand"><img src="/fos-mark.svg" width="24" height="24" alt="" /><h1>Fos Icons</h1></div>
      <a href="https://www.fosicons.com" target="_blank" rel="noreferrer" aria-label="Visit the Fos Icons website">Website <span aria-hidden="true">↗</span></a>
    </header>
    {host.preview && <p className="preview-banner">Browser preview · insertion is available in Framer.</p>}
    <section className="browse-controls" aria-label="Find icons">
      <div className="search-field">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
        <input ref={searchRef} aria-label="Search icons" placeholder="Search icons..." value={query} onChange={event => { setQuery(event.target.value); resetResults() }} onKeyDown={event => { if (event.key === "Escape") { setQuery(""); resetResults() } }} />
        {query ? <button className="clear-search" aria-label="Clear search" onClick={() => { setQuery(""); resetResults(); searchRef.current?.focus() }}>×</button> : <kbd>/</kbd>}
      </div>
      <div className="style-switch" role="group" aria-label="Icon style">
        {styles.map(value => <button key={value} aria-pressed={style === value} onClick={() => { setStyle(value); setNotice(""); setActionError("") }}>{styleLabels[value]}</button>)}
      </div>
      <div className="catalog-line">
        <select aria-label="Category" value={category} onChange={event => { setCategory(event.target.value); resetResults() }}>
          <option value="">All categories</option>
          {categories.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
        <span role="status">{results.length.toLocaleString()} icons</span>
      </div>
    </section>
    <div className="icon-scroll" ref={gridRef} aria-label="Icon library" onScroll={event => {
      const element = event.currentTarget
      if (element.scrollHeight - element.scrollTop - element.clientHeight < 120) setLimit(value => Math.min(results.length, value + PAGE))
    }}>
      {loadError && <div className="load-error" role="alert"><p>{loadError}</p><button onClick={() => setRetry(value => value + 1)}>Retry loading</button></div>}
      {!results.length ? <div className="empty"><h2>No icons found</h2><p>Try a different name, tag, or category.</p><button onClick={() => { setQuery(""); setCategory(""); resetResults() }}>Clear filters</button></div>
        : <div className="icon-grid" aria-label="Choose an icon" aria-busy={!loadError && visible.some(icon => !currentArt[icon.name])}>
          {visible.map((icon, position) => <button key={icon.name} className="icon-cell" title={icon.name}
            aria-label={icon.name} aria-pressed={selected === icon.name}
            tabIndex={selectedVisible ? (selected === icon.name ? 0 : -1) : (position === 0 ? 0 : -1)}
            onClick={() => selectIcon(icon.name)} onKeyDown={event => onGridKey(event, position)}>
            {currentArt[icon.name] ? <Artwork source={currentArt[icon.name]} name={icon.name} primary={previewPrimary} secondary={previewSecondary} stroke={stroke} /> : <span className="placeholder" aria-hidden="true" />}
          </button>)}
        </div>}
      {visible.length < results.length && <button className="load-more" onClick={() => setLimit(value => value + PAGE)}>Show more icons</button>}
    </div>
    <section className="inspector" aria-label="Customize selected icon">
      <div className="selected-icon">
        <div className="selected-art" style={{ background: parseInt(previewPrimary.slice(1, 3), 16) > 160 ? "#303030" : "#ffffff" }}>
          {source && <Artwork source={source} name={selected} primary={previewPrimary} secondary={previewSecondary} stroke={stroke} large />}
        </div>
        <div className="selected-name"><h2>{selected}</h2><p>{selectedIcon.category}</p></div>
      </div>
      <div className="settings-row">
        <label>Size <span className="number-field"><input aria-label="Icon size" type="number" min="8" max="512" step="1" value={size} onChange={event => { setSize(event.target.value); setNotice("") }} /><span>px</span></span></label>
        <label>Stroke <select aria-label="Stroke weight" disabled={style === "filled"} value={weight} onChange={event => { setWeight(Number(event.target.value)); setNotice("") }}>
          {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5].map(value => <option key={value} value={value}>{style === "filled" ? "Not applicable" : value}</option>)}
        </select></label>
      </div>
      {duo && <label className="palette-row">Palette <select aria-label="Duo palette" value="" onChange={event => {
        const palette = paletteData.palettes.find(item => item.name === event.target.value)
        if (palette) {
          const colors = theme === "dark" ? palette.dark : palette.light
          setPrimary(colors.primary); setSecondary(colors.secondary); setNotice("")
        }
      }}><option value="" disabled>Choose palette</option>{paletteData.palettes.map(palette => <option key={palette.name}>{palette.name}</option>)}</select></label>}
      <div className="settings-row colors">
        <ColorField label={duo ? "Primary" : "Color"} value={primary} onChange={value => { setPrimary(value); setNotice("") }} />
        {duo && <ColorField label="Secondary" value={secondary} onChange={value => { setSecondary(value); setNotice("") }} />}
      </div>
      {!valid && <p className="error" role="alert">Use a size from 8–512 px and six-digit hex colors.</p>}
      {actionError && <p className="error" role="alert">{actionError}</p>}
      <div className="canvas-status" role="status">
        {notice || (host.preview ? "Preview only — open in Framer to insert." : !canvas.ready ? "Connecting to the canvas..."
          : !canvas.allowed ? "Canvas editing permission is required." : canvas.ambiguous ? "Select one SVG, or clear the canvas selection."
            : canvas.replaces ? "Replaces the selected SVG on the canvas." : "Adds an SVG to your canvas.")}
      </div>
      <button className="insert-button" disabled={insertionDisabled} onClick={() => { void insert() }}>
        {busy ? "Inserting..." : canvas.replaces ? "Replace selected SVG" : "Insert icon"}
      </button>
    </section>
  </main>
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="color-label">{label}<span className="color-field">
    <input type="color" aria-label={`${label} picker`} value={isColor(value) ? value : "#212121"} onChange={event => onChange(event.target.value.toUpperCase())} />
    <input type="text" aria-label={`${label} hex`} spellCheck={false} value={value} maxLength={7} onChange={event => onChange(event.target.value)} />
  </span></label>
}
