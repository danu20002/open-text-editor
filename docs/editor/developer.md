**Developer Guide — Plugins & Extensibility**

This document explains the intended plugin contract and where built-in plugin placeholders live in the source tree.

Plugin contract
- A plugin should export a default function that accepts an `editorApi` object and returns an object with:
  - `name` — plugin id string
  - `install()` — called when the plugin is enabled; register commands, toolbar buttons, or event listeners here

Example plugin skeleton
```js
export default function myPlugin(editorApi) {
  return {
    name: 'my-plugin',
    install() {
      // Example: add a simple command that inserts a timestamp
      const insertTimestamp = () => editorApi.insertHtml(`<time>${new Date().toISOString()}</time>`)
      // Optionally expose commands or UI wiring via editorApi
      editorApi.registerCommand && editorApi.registerCommand('insert-timestamp', insertTimestamp)
    }
  }
}
```

Built-in plugins
- Built-in plugin placeholders are in the source at `src/editor/plugins/` (part of this repo). Consumers installing the package get the compiled library; to inspect or extend built-ins, open the repository and edit or copy the plugin files from that folder.

Registering plugins (current status)
- This release provides plugin scaffolding in source. Runtime plugin registration APIs (for consumer-supplied plugins) are planned; for now you can compose plugins in your app by importing their code or by modifying the source plugin folder when building from source.

Best practices
- Keep plugins small and focused.
- Prefer declarative UI for toolbar buttons (icon, tooltip, command).
- Clean up event listeners and DOM mutations during uninstall.

If you want, I can implement a runtime `editorApi.registerPlugin()` and `editorApi.addToolbarButton()` API in `src/editor/OpentextEditor.jsx` so consumers can register plugins dynamically. Say the word and I will wire it up and add examples.

