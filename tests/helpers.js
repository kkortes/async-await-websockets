import { unlinkSync } from "node:fs";

import client from "../client.js";

export const root = () => process.chdir(import.meta.dir.replace(/\/tests$/, ""));

export const connect = (port, options) => {
  const ws = client(`ws://localhost:${port}`, options);
  return new Promise((resolve) => ws.addEventListener("open", () => resolve(ws)));
};

export const rejection = (promise) => promise.then(() => null).catch(({ error }) => error);

export const awaited = (ws, event, timeout = 1000) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`No "${event}" within ${timeout}ms`)), timeout);
    ws.on(event, (detail) => {
      clearTimeout(id);
      resolve(detail);
    });
  });

export const clearDatabase = (file) =>
  [file, `${file}-wal`, `${file}-shm`].forEach((path) => {
    try {
      unlinkSync(path);
    } catch {}
  });
