import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { serverFn } from "@devorajs/core";

export interface Note {
  author: string;
  text: string;
}

// A JSON file in the project root stands in for your database. Each app
// loads this module separately (a variable here would NOT be shared between
// apps), but they all read and write the same file. Use a real database
// before deploying: serverless platforms can't write to their filesystem.
const FILE = join(process.cwd(), "notes.json");

function readAll(): Note[] {
  return existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf-8")) : [];
}

export const listNotes = serverFn(async () => readAll());

export const addNote = serverFn(async (input: { text: string }, ctx) => {
  ctx.requireAuth();
  const author = (ctx.session as { username: string }).username;
  const note = { author, text: input.text };
  writeFileSync(FILE, JSON.stringify([...readAll(), note], null, 2));
  return note;
});
