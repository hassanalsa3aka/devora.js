/**
 * The sidecar must not outlive the window. The shell kills it on exit; this is the safety net for a shell that is killed
 * without the chance to (a crash, `kill -9`, Ctrl+C of the process that started it): the sidecar checks once a second that
 * the process that started it is still there, and stops when it is not.
 */
export const DESKTOP_PARENT_PID_ENV = "DEVORA_DESKTOP_PARENT_PID";

export function isProcessAlive(pid: number, kill: (pid: number, signal: 0) => unknown = process.kill): boolean {
  try {
    kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM"; // exists, but not ours to signal
  }
}

export function parseParentPid(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d{1,10}$/.test(value)) return undefined;
  const pid = Number(value);
  return pid > 1 ? pid : undefined;
}

/** Calls `onGone` once when `pid` no longer exists. Returns a function that stops watching. */
export function watchParent(pid: number, onGone: () => void, intervalMs = 1000, alive: (pid: number) => boolean = isProcessAlive): () => void {
  const timer = setInterval(() => {
    if (!alive(pid)) {
      clearInterval(timer);
      onGone();
    }
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
