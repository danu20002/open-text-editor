// Plugin registry and loader for open-text-editor
// Plugins should export an `install(editor)` function which receives
// the editor instance or API and attaches behavior (commands, buttons, handlers).

import formattingPlugin from './formatting.js'
import imagePlugin from './image.js'
import tablePlugin from './table.js'
import historyPlugin from './history.js'

const builtInPlugins = {
  formatting: formattingPlugin,
  image: imagePlugin,
  table: tablePlugin,
  history: historyPlugin,
}

export function getPlugin(name) {
  return builtInPlugins[name]
}

export function listPlugins() {
  return Object.keys(builtInPlugins)
}

export default builtInPlugins
