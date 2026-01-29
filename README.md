# Open Text Editor

A lightweight, pluggable React contentEditable rich text editor.

Quick start and full usage are in `docs/USAGE.md`. Short summary:

# Open Text Editor

A lightweight, pluggable React contentEditable rich text editor.

Quick start and full usage are in [docs/USAGE.md](docs/USAGE.md). Below is a concise summary for using the `OpenTextEditor` component exported by this package.

**Install**

```bash
npm install open-text-editor-latest
```

**Peer dependencies**

This package requires React as a peer dependency (supported: `^18 || ^19`). Install them if your project doesn't already include React:

```bash
npm install react@^18 react-dom@^18
# or for React 19 consumers:
npm install react@^19 react-dom@^19
```

**Basic usage**

```jsx
import React, { useRef } from 'react'
import OpenTextEditor from 'open-text-editor-latest'

function App(){
	const editorRef = useRef(null)

	return (
		<OpenTextEditor
			ref={editorRef}
			initialValue={`<p>Hello from OpenTextEditor</p>`}
			onChange={(html) => console.log('content changed', html)}
			placeholder="Start typing..."
		/>
	)
}

export default App
```

**Imperative API (via `ref`)**

The editor exposes useful helpers when mounted with `ref`:

- `focus()` — focus the editor
- `getHtml()` — return current editor HTML
- `setHtml(html)` — replace editor content
- `insertHtml(html)` — insert HTML at the current selection
- `execCommand(command, value)` — run low-level `document.execCommand`
- `insertTable(rows, cols)` — insert a table programmatically
- `tableAction(action)` — run table actions when a table cell is active

**Build and publish**

To build the library bundles (ESM/CJS/UMD):

```bash
npm run build:lib
```

Create a local package tarball for testing:

```bash
npm pack
```

Publish to npm (when ready):

```bash
npm publish --access public
```

See [docs/USAGE.md](docs/USAGE.md) and [docs/PUBLISH.md](docs/PUBLISH.md) for more details on configuration, plugins and publishing.

---

Project files of interest:

- `src/editor/OpentextEditor.jsx` — main editor component (default export `OpenTextEditor`).
- `src/editor/plugins/` — plugin scaffolding and built-in plugin placeholders.
- `build/vite.lib.config.js` — library build configuration used by `npm run build:lib`.

If you'd like, I can wire the plugin registration API into the editor so built-in plugins are auto-registered.
