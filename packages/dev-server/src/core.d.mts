export const MODULE_PREFIX: string;
export const DEPS_PREFIX: string;
export const CSS_EXT: RegExp;
export const ASSET_EXT: RegExp;
export const SCRIPT_EXT: RegExp;
export const UNSUPPORTED_ISLAND_CALL_MESSAGE: string;
export interface UrlRoot { prefix: string; dir: string }
export interface ImportRef { start: number; end: number; specifier: string }
export function parseModule(code: string): any;
export function resolveFile(abs: string): Promise<string | undefined>;
export function urlForFile(file: string, roots: readonly UrlRoot[]): string | undefined;
export function findIslandCalls(program: any): { supported: any[]; unsupported: any[] };
export function applyEdits(code: string, edits: { start: number; end: number; text: string }[]): string;
export function islandEdits(program: any, resolveSpecifier: (spec: string) => Promise<string | undefined>, urlOf: (file: string) => string | undefined): Promise<{ start: number; end: number; text: string }[]>;
export function listImports(program: any): ImportRef[];
export function instrumentRefresh(code: string, program: any): { edits: { start: number; end: number; text: string }[]; head: string; tail: string; components: string[]; isBoundary: boolean };
export function splitSourceMap(code: string): { code: string; map: string };
export function scanImports(source: string): string[];
export function resolveFileSync(abs: string): string | undefined;
export function islandEditsSync(program: any, resolveSpecifier: (spec: string) => string | undefined, urlOf: (file: string) => string | undefined): { start: number; end: number; text: string }[];
export const CSS_MODULE_EXT: RegExp;
export interface PathAliases { baseUrl?: string; paths: { prefix: string; suffix: string; wildcard: boolean; targets: string[] }[] }
export function parseJsonc(text: string): any;
export function loadPathAliases(appRoot: string): PathAliases | undefined;
export function resolveAlias(spec: string, aliases: PathAliases | undefined): string | undefined;
export function globToRegExp(glob: string): RegExp;
export function matchGlob(patterns: string[], fromDir: string): string[];
export function expandGlobs(code: string, file: string): string;
export function compileCssModule(file: string): Promise<{ css: string; mapping: Record<string, string> }>;
export function compileCssModuleSync(file: string): { css: string; mapping: Record<string, string> };
