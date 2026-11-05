/**
 * App names and domains are written into generated source (devora.config.ts, routes), into paths (`apps/<name>`)
 * and into platform build commands that a shell runs (netlify.toml `command`). Red team 2026-11-05, finding H29:
 * none of them was checked, so a name with a quote, a `;` or `../` produced broken or injected code, a shell
 * command, or files outside the project. Checked once here, for create-devora and `devora new`.
 */
const APP_NAME = /^[a-z0-9][a-z0-9_-]{0,49}$/;
const DOMAIN = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

/** The reason an app name is refused, or undefined when it is fine. */
export function appNameProblem(name: string): string | undefined {
  if (APP_NAME.test(name)) return undefined;
  return `app name "${name}" must be lowercase letters, digits, "-" or "_", start with a letter or digit, and be at most 50 characters`;
}

/** The reason a domain is refused, or undefined when it is fine. */
export function domainProblem(domain: string): string | undefined {
  if (DOMAIN.test(domain)) return undefined;
  return `domain "${domain}" must be a host name such as "app.example.com"`;
}

/** Throws a clear error for a name or domain that cannot be written safely into generated files. */
export function assertScaffoldNames(name: string, domain?: string): void {
  const problem = appNameProblem(name) ?? (domain === undefined ? undefined : domainProblem(domain));
  if (problem) throw new Error(`[devora] ${problem}`);
}
