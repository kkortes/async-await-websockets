# async-await-websockets

## Contributing and versioning

- Every branch made for async-await-websockets includes a version bump. It is a patch bump (`3.8.0` → `3.8.1`) unless the developer names a minor or a major, and then it is that one.
- The version lives in `package.json`, and `package-lock.json` mirrors it, so bump with `npm version <version> --no-git-tag-version`, which updates both, and never write it anywhere else.
- The kinds of bump follow semver:
  - **patch** fixes a bug without changing what an app sees: the same `aaw()` call, events and client behave as documented.
  - **minor** adds something an app can use without changing anything it already has: a new trailing `aaw()` argument, a new field in a handler's context, a new client option or a new built-in event.
  - **major** breaks something an app depends on: the order or defaults of `aaw()`'s arguments, the `[event, body]` wire format, a handler's signature or context, the event folder convention or a reserved namespace (`auth/`, `aaw/`), or the client's API.
- Every change an app can see gets an entry in `CHANGELOG.md`, in the same commit, under the heading of the version it ships in.
- Publishing is done by the developer once the branch is merged to `main`, by pushing a version tag. An agent never publishes and never pushes a version tag.
- The developer tags the merged release with `git tag -a v<version>` and pushes it with `git push --follow-tags`, which only carries annotated tags. The tag push runs `.github/workflows/publish.yml`, which fails unless the tag is `v` plus the version in `package.json`, then publishes as public with `npm publish --provenance`, authenticated by npm trusted publishing, so no npm token is kept anywhere. Pushes to `main` publish nothing. `bun publish:async-await-websockets:check` runs `npm pack --dry-run` to list what the package will hold.
