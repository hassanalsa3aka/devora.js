import { serverFn } from "@devorajs/core";
import { db } from "../db/index.js";

export interface SettingsInput {
  key: string;
  value: string;
}

export const updateSettings = serverFn(async (input: SettingsInput, ctx) => {
  ctx.requireAuth(); // throws if not authenticated
  // dev brings their own DB client here
  return db.settings.update(input);
});
