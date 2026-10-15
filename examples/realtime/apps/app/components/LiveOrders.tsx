import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

interface Order {
  id: number;
  user: string;
  item: string;
  at: string;
}

type Status = "connecting" | "live" | "polling";

const POLL_MS = 5000;

// Hydrated in the browser (island). Live updates come from the realtime
// server over Socket.IO; if the connection can't be made or drops, the list
// is refreshed by polling /api/orders instead, so the page never goes stale.
export default function LiveOrders({ csrfToken }: { csrfToken: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<Status>("connecting");
  const [item, setItem] = useState("");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let stopped = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const refresh = async () => {
      const res = await fetch("/api/orders", { headers: { accept: "application/json" } });
      if (res.ok && !stopped) setOrders(((await res.json()) as { orders: Order[] }).orders);
    };
    const startPolling = () => {
      if (pollTimer || stopped) return;
      setStatus("polling");
      void refresh();
      pollTimer = setInterval(() => void refresh(), POLL_MS);
    };
    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = undefined;
    };

    void (async () => {
      await refresh();
      try {
        const res = await fetch("/api/realtime-token", { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`token ${res.status}`);
        const { url } = (await res.json()) as { url: string };
        const socket = io(url, {
          // A fresh token for every (re)connect: they only live 60 seconds.
          auth: (cb) => {
            fetch("/api/realtime-token")
              .then((r) => r.json())
              .then((body: { token: string }) => cb({ token: body.token }))
              .catch(() => cb({ token: "" }));
          },
          reconnectionAttempts: 3,
        });
        socketRef.current = socket;
        socket.on("connect", () => {
          stopPolling();
          setStatus("live");
          void refresh(); // anything missed while disconnected
        });
        socket.on("order", (order: Order) => setOrders((list) => [...list.filter((o) => o.id !== order.id), order].slice(-20)));
        socket.on("connect_error", startPolling);
        socket.on("disconnect", startPolling);
      } catch {
        startPolling();
      }
    })();

    return () => {
      stopped = true;
      stopPolling();
      socketRef.current?.close();
    };
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!item.trim()) return;
    await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json", "x-devora-csrf": csrfToken },
      body: JSON.stringify({ item }),
    });
    setItem("");
  }

  return (
    <section aria-live="polite">
      <p data-testid="status">
        Updates: <strong>{status === "live" ? "live" : status === "polling" ? `polling every ${POLL_MS / 1000} s` : "connecting…"}</strong>
      </p>
      <form onSubmit={add}>
        <label htmlFor="item">New order</label>
        <input id="item" value={item} onChange={(e) => setItem(e.target.value)} />
        <button type="submit">Place order</button>
      </form>
      <ul data-testid="orders">
        {orders.map((o) => (
          <li key={o.id}>
            #{o.id} {o.item}
          </li>
        ))}
      </ul>
    </section>
  );
}
