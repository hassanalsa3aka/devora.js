import { getItems } from "../../lib/data.js";

export function load() {
  return { items: getItems() };
}
