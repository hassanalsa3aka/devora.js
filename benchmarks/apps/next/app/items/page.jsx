import Counter from "./Counter";
import { getItems } from "../data";

// Rendered on every request, like the other frameworks' SSR page.
export const dynamic = "force-dynamic";
export const metadata = { title: "Items" };

export default async function Items() {
  const items = getItems();
  return (
    <main>
      <h1>Items</h1>
      <Counter />
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name} — ${item.price.toFixed(2)}
          </li>
        ))}
      </ul>
    </main>
  );
}
