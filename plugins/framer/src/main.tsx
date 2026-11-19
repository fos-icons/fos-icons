import "./framer.css"

import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./App.tsx"
import { connectHost } from "./host"

const root = document.getElementById("root")
if (!root) throw new Error("Root element not found")

const reactRoot = ReactDOM.createRoot(root)
void connectHost().then(host => {
  reactRoot.render(<React.StrictMode><App host={host} /></React.StrictMode>)
}).catch((error: unknown) => {
  reactRoot.render(<main role="alert" style={{ padding: 16 }}>
    <h1>Couldn't connect to Framer</h1>
    <p>{error instanceof Error ? error.message : "Open the plugin again from Framer."}</p>
  </main>)
})
