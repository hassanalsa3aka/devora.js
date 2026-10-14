"use client";
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" id="counter" onClick={() => setCount((c) => c + 1)}>
      Count: {count}
    </button>
  );
}
