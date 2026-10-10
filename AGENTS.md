# async-await-websockets

## Versioning and publishing

- The version lives only in `package.json`. `package-lock.json` mirrors it, so bump with `npm version <version> --no-git-tag-version`, which updates both, and never write it anywhere else.
- async-await-websockets follows semver:
  - **patch** fixes a bug without changing what an app sees: the same `aaw()` call, events and client behave as documented.
  - **minor** adds something an app can use without changing anything it already has: a new trailing `aaw()` argument, a new field in a handler's context, a new client option or a new built-in event.
  - **major** breaks something an app depends on: the order or defaults of `aaw()`'s arguments, the `[event, body]` wire format, a handler's signature or context, the event folder convention or a reserved namespace (`auth/`, `aaw/`), or the client's API.
- Every change an app can see gets an entry in `CHANGELOG.md`, in the same commit, under the heading of the version it ships in.
- Bump when a change is ready to reach the apps that use async-await-websockets, not on every commit. Several changes can ride one release, which takes the largest bump among them.
- `bun run release` runs `npm pack --dry-run` to list what the package will hold, then `scripts/publish.sh`. It checks the npm login, shows the current version and asks for the new one (an exact version, or `patch`, `minor` or `major`; enter keeps the current one), then publishes as public. npm may ask for a one-time password.
- Commit the bump as `release <version>`. Once it is published, tag that commit with `git tag -a v<version>` and push with `git push --follow-tags`, which only carries annotated tags.
- Ask the developer before publishing.
