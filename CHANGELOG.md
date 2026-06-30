# Changelog

All notable changes to this project are documented here. This project adheres to [Semantic Versioning](https://semver.org/).

## [3.1.0]

### Added

- **Rooms** — a `room` API exposed in every event handler's context for targeted multicast to named subsets of connections. Membership is per-connection and clears automatically on disconnect.
  - `room.join(name)` / `room.leave(name)` — manage membership.
  - `room.emit(name, event, data, except?)` — multicast to a room, optionally excluding one connection; returns the number of clients sent to.
  - `room.size(name)` — current member count.

## [3.0.7]

### Changed

- Scoped the package as `@ape-egg/async-await-websockets`.

## [3.0.0]

### Changed

- Now running on [Bun](https://bun.sh/) instead of Node.
