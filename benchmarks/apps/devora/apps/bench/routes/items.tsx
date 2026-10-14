import { Island, island } from "@devorajs/core";
import { getItems } from "../data.js";

export const renderMode = "ssr";

export function meta() {
  return { title: "Items" };
}

export async function loader() {
  return { items: getItems() };
}

const Counter = island(() => import("../components/Counter"));

export default function Items({ data }: { data?: { items: { id: number; name: string; price: number }[] } }) {
  return (
    <main>
      <h1>Items</h1>
      <Island component={Counter} props={{}} />
      <ul>
        {data!.items.map((item) => (
          <li key={item.id}>
            {item.name} — ${item.price.toFixed(2)}
          </li>
        ))}
      </ul>
    </main>
  );
}
