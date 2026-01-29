# Publishing to npm

Steps to publish a new version of `open-text-editor`:

1. Update version in `package.json` (semver).
2. Commit your changes and push to the repository.
3. Ensure you are logged in to npm: `npm login`.
4. Run the build script (prepare runs automatically for `npm publish`):

```bash
npm run build:lib
```

5. Publish:

```bash
npm publish --access public
```

Notes:
- The library build externalizes `react` and `react-dom` so they are peer dependencies. Consumers must install React separately.
- If you want to test a local tarball before publishing:

```bash
npm pack
npm install -g ./open-text-editor-0.1.0.tgz
```
