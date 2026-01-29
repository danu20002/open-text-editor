// formatting plugin: wires basic format commands into toolbar or shortcuts
export default function formattingPlugin(editorApi) {
  // editorApi is expected to expose `execCommand` or similar
  return {
    name: 'formatting',
    install(ed) {
      // noop placeholder: real implementation can add buttons or keybindings
    }
  }
}
