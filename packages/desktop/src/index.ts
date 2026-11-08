export {
  generateLaunchToken,
  isWellFormedToken,
  tokensMatch,
  guardDesktopRequest,
  DESKTOP_TOKEN_HEADER,
  DESKTOP_TOKEN_COOKIE,
  DESKTOP_LAUNCH_PATH,
  DESKTOP_TOKEN_ENV,
  type GuardOutcome,
} from "./token.js";
export { pickLoopbackPort, assertLoopbackHost, isDesktopHostHeader, startDesktopServer, DESKTOP_HOST, type DesktopServer, type DesktopHandler } from "./server.js";
export { isAllowedNavigation, mayOpenExternally, parseIpcAllowlist } from "./policy.js";
export { generateTauriProject, generateTauriBinaryFiles, DESKTOP_CSP, HARDEN_SCRIPT, type TauriProjectOptions } from "./tauri.js";
export { checkDesktopPrerequisites, describeMissing, systemRunner, type Prerequisite, type PrerequisiteReport, type Runner, type RunResult } from "./prereqs.js";
export { watchParent, isProcessAlive, parseParentPid, DESKTOP_PARENT_PID_ENV } from "./parent.js";
export { placeholderIconPng } from "./icon.js";
