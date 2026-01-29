# Developer Guide — Plugins & Extensibility

This document explains how to create and register plugins for `open-text-editor`.

Plugin contract
- Export a default function that receives an `editorApi` and returns an object with:
  - `name` — plugin id string
  - `install(editor)` — called when plugin is enabled; attach commands, buttons, event listeners here

Example plugin skeleton
```js
export default function myPlugin(editorApi) {
  return {
    name: 'my-plugin',
    install(editor) {
      // add command
      editor.execCommand = editor.execCommand || editorApi.execCommand
      // add toolbar button by calling editorApi.addToolbarButton(...)
    }
  }
}
```

Registering plugins
- Built-in plugins live in `src/editor/plugins` and are available through the registry `import plugins from 'open-text-editor/src/editor/plugins'`.
- Consumers can supply plugins by passing them to the editor constructor or mounting API (future API plans). For now, import and compose in your app.

Best practices
- Keep plugins small and focused.
- Prefer declarative UI for toolbar buttons (icon, tooltip, command).
- Clean up event listeners and DOM mutations during uninstall.
