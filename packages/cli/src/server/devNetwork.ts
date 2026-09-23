import net from "node:net";
import os from "node:os";

/**
 * Default `devora dev` ports (devora-pre-v3-hotfixes.md #11): app N in
 * devora.config.ts's `apps` array gets 10000 + N unless it sets `devPort`.
 * High enough to stay clear of the usual suspects (3000, 5173, 8000/8080,
 * database ports). One known collision: Azurite (the Azure Storage
 * emulator) also defaults to 10000 — set `devPort` on the first app, or
 * move Azurite, if you run both.
 */
export const DEV_BASE_PORT = 10000;

/**
 * Whether something is already accepting connections on `port` at `host`.
 * A connect probe, not just a trial bind: on macOS/BSD, binding the
 * wildcard address can succeed even while another process holds
 * 127.0.0.1:<port>, which would silently split traffic between the two.
 */
function isAcceptingConnections(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(300, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

/** Whether this process could bind `port` on `host` right now. */
function canBind(port: number, host: string | undefined): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen({ port, host, exclusive: true }, () => server.close(() => resolve(true)));
  });
}

async function isPortFree(port: number, bindHost: string | undefined): Promise<boolean> {
  if ((await isAcceptingConnections(port, "127.0.0.1")) || (await isAcceptingConnections(port, "::1"))) return false;
  return canBind(port, bindHost);
}

/**
 * The first free port at or after `preferred`, skipping any in `claimed`
 * (ports already handed to an earlier app in this same `devora dev` run,
 * whose server may not be listening yet). `bindHost` is the address the
 * server will actually bind: undefined for all interfaces (`--host`),
 * "localhost" otherwise.
 */
export async function findFreePort(
  preferred: number,
  claimed: ReadonlySet<number>,
  bindHost: string | undefined,
  maxAttempts = 100
): Promise<number> {
  for (let port = preferred; port < preferred + maxAttempts && port <= 65535; port++) {
    if (claimed.has(port)) continue;
    if (await isPortFree(port, bindHost)) return port;
  }
  throw new Error(`[devora] no free port found in ${preferred}–${preferred + maxAttempts - 1}`);
}

/**
 * This machine's LAN-reachable IPv4 addresses — what another device on the
 * same network (e.g. a phone) should use. Skips loopback and link-local
 * (169.254.x.x, which only exists when DHCP failed). Can legitimately
 * return several (Wi-Fi + Ethernet, VPN, Docker bridge) — Vite prints all
 * of them too, since which one a given device can reach isn't knowable here.
 */
export function getLanAddresses(): string[] {
  const addresses: string[] = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const info of iface ?? []) {
      if (info.family !== "IPv4" || info.internal || info.address.startsWith("169.254.")) continue;
      addresses.push(info.address);
    }
  }
  return addresses;
}

export function isLoopbackAddress(address: string): boolean {
  return address === "::1" || address === "localhost" || address.startsWith("127.") || address === "::ffff:127.0.0.1";
}

/** Whether a bound address means "every interface". */
export function isWildcardAddress(address: string): boolean {
  return address === "::" || address === "0.0.0.0" || address === "";
}
