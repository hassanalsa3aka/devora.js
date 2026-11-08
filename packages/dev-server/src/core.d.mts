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
