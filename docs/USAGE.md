Open Text Editor — Usage

Install

```bash
npm install open-text-editor-latest
```

Basic usage

```jsx
import React, { useRef } from 'react'
import OpenTextEditor from 'open-text-editor-latest'

export default function App(){
  const ref = useRef(null)

  return (
    <div style={{padding:20}}>
      <OpenTextEditor
        ref={ref}
        initialValue={`<p>Hello</p>`}
        onChange={(html) => console.log('changed', html)}
      />
    </div>
  )
}
```

Props
- `initialValue` (string): optional initial HTML content
- `onChange` (html: string) => void: optional change handler
- `className` (string): optional additional class names applied to the editor container

Peer dependencies

This package expects React as a peer dependency (supported ranges: `^18 || ^19`). Install them if your project doesn't already include React:

```bash
npm install react@^18 react-dom@^18
# or for React 19 consumers:
npm install react@^19 react-dom@^19
```

Imperative API (via `ref`)

When mounted with a `ref`, the editor exposes a small imperative API:

- `focus()` — focus the editor
- `getHtml()` — return current editor HTML
- `setHtml(html)` — replace editor content
- `insertHtml(html)` — insert HTML at the current selection
- `execCommand(command, value)` — run low-level `document.execCommand`
- `insertTable(rows, cols)` — insert a table programmatically
- `tableAction(action)` — run table actions when a table cell is active

Plugins

Built-in plugin placeholders live in the source at `src/editor/plugins`. See [docs/editor/developer.md](editor/developer.md) for the plugin contract and examples.

Building from source

```bash
git clone https://github.com/danu20002/open-text-editor.git
cd open-text-editor
npm install
npm run build:lib
```

Local test

```bash
npm pack
# install the generated tarball (replace <version> with the package version):
npm install ./open-text-editor-latest-<version>.tgz
```

Publishing

See [docs/PUBLISH.md](PUBLISH.md) for publish steps and notes about peer dependencies.

