import { useState } from "react";
import { useLoaderData } from "react-router";
import { getItems } from "../data.js";

export function meta() {
  return [{ title: "Items" }];
}

export function loader() {
  return { items: getItems() };
}

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" id="counter" onClick={() => setCount((c) => c + 1)}>
      Count: {count}
    </button>
  );
}

export default function Items() {
  const { items } = useLoaderData();
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
