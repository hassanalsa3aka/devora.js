import { Body, Controller, Get, Headers, Header, HttpCode, Post, UnauthorizedException, UnprocessableEntityException, BadRequestException } from "@nestjs/common";
import { randomBytes } from "node:crypto";

const ITEMS = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, price: ((i * 37) % 1000) / 10 }));
const sessions = new Map<string, { username: string; created: number }>();
let nextId = 1000;

function validate(b: any): string[] {
  const fields: string[] = [];
  if (!b || typeof b.name !== "string" || b.name.length < 1 || b.name.length > 50) fields.push("name");
  if (!b || typeof b.price !== "number" || !(b.price >= 0)) fields.push("price");
  return fields;
}

@Controller()
export class BenchController {
  @Get("static")
  @Header("content-type", "text/html; charset=utf-8")
  page() {
    return "<!doctype html><title>static</title><p>static</p>";
  }

  @Get("api/items")
  list() {
    return { items: ITEMS };
  }

  @Post("api/items")
  @HttpCode(201)
  create(@Body() body: any) {
    const fields = validate(body);
    if (fields.length) throw new UnprocessableEntityException({ error: "validation", fields });
    return { id: nextId++, name: body.name, price: body.price };
  }

  @Post("api/session")
  @HttpCode(201)
  login(@Body() body: any) {
    const username = body?.username;
    if (typeof username !== "string" || !username) throw new BadRequestException({ error: "username required" });
    const token = randomBytes(24).toString("base64url");
    sessions.set(token, { username, created: Date.now() });
    return { token };
  }

  @Get("api/me")
  me(@Headers("authorization") auth?: string) {
    const m = /^Bearer (.+)$/.exec(auth ?? "");
    const s = m && sessions.get(m[1]);
    if (!s) throw new UnauthorizedException({ error: "unauthorized" });
    return { user: s.username };
  }

  @Get("api/slow")
  async slow() {
    await new Promise((r) => setTimeout(r, 2));
    return { item: ITEMS[0] };
  }
}
