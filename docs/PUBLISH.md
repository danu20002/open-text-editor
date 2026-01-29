# Publishing to npm

Steps to publish a new version of `open-text-editor-latest`:

1. Update `version` in `package.json` (follow semver).
2. Commit your changes and push to your git repository.
3. Ensure you are logged in to npm: `npm login`.
4. Build the library (the `prepare` step is run automatically by `npm publish`, but you can run it manually to verify):

```bash
npm run build:lib
```

5. Publish to npm (public package):

```bash
npm publish --access public
```

Notes
- The library build externalizes `react` and `react-dom`; they are declared as peer dependencies. Consumers must install React separately.
- To test a local tarball before publishing, run:

```bash
npm pack
# then install the produced tarball in another project (replace <version>):
npm install ./open-text-editor-latest-<version>.tgz
```

- If you encounter npm tag/version errors (for example when attempting to publish a lower version than already published), either bump the package version in `package.json` or publish with an explicit tag: `npm publish --tag next --access public`.

