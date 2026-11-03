import { describe, expect, it } from "vitest";
import { FormLimitError, MAX_FORM_FIELDS, MAX_FORM_FILES, parseFormBody } from "../readBody.js";

/** A real multipart body, encoded by the platform's own Request. */
async function multipart(fields: number, files: number): Promise<{ body: Buffer; type: string }> {
  const form = new FormData();
  for (let i = 0; i < fields; i++) form.append(`field${i}`, `value ${i}`);
  for (let i = 0; i < files; i++) form.append(`file${i}`, new File([`contents ${i}`], `file${i}.txt`, { type: "text/plain" }));
  const request = new Request("http://localhost/", { method: "POST", body: form });
  return { body: Buffer.from(await request.arrayBuffer()), type: request.headers.get("content-type")! };
}
const urlencoded = (fields: number) => Buffer.from(Array.from({ length: fields }, (_, i) => `f${i}=${i}`).join("&"));
const URLENCODED = "application/x-www-form-urlencoded";

describe("form limits", () => {
  it("defaults: 1000 fields and 20 files", () => {
    expect([MAX_FORM_FIELDS, MAX_FORM_FILES]).toEqual([1000, 20]);
  });

  it("multipart: exactly the limits parse; one more field or one more file is a 413 FormLimitError", async () => {
    const ok = await multipart(5, 2);
    const parsed = await parseFormBody(ok.body, ok.type, { maxFields: 5, maxFiles: 2 });
    expect([...parsed.keys()]).toHaveLength(7);
    expect(parsed.get("file1")).toBeInstanceOf(File);

    const tooManyFields = await multipart(6, 0);
    const fieldsError = await parseFormBody(tooManyFields.body, tooManyFields.type, { maxFields: 5 }).catch((e) => e);
    expect(fieldsError).toBeInstanceOf(FormLimitError);
    expect(fieldsError.status).toBe(413);
    expect(fieldsError.message).toBe("Too many form fields (the limit is 5)");

    const tooManyFiles = await multipart(0, 3);
    const filesError = await parseFormBody(tooManyFiles.body, tooManyFiles.type, { maxFiles: 2 }).catch((e) => e);
    expect(filesError).toBeInstanceOf(FormLimitError);
    expect(filesError.message).toBe("Too many form files (the limit is 2)");
  });

  it("files and fields are counted separately: many fields do not use up the file allowance", async () => {
    const mixed = await multipart(30, 20);
    expect([...(await parseFormBody(mixed.body, mixed.type)).keys()]).toHaveLength(50);
    const overDefault = await multipart(0, 21);
    await expect(parseFormBody(overDefault.body, overDefault.type)).rejects.toThrow(/Too many form files \(the limit is 20\)/);
  });

  it("URL-encoded: the field limit applies; an empty body is fine", async () => {
    expect([...(await parseFormBody(urlencoded(5), URLENCODED, { maxFields: 5 })).keys()]).toHaveLength(5);
    await expect(parseFormBody(urlencoded(6), URLENCODED, { maxFields: 5 })).rejects.toBeInstanceOf(FormLimitError);
    await expect(parseFormBody(urlencoded(1001), URLENCODED)).rejects.toThrow(/the limit is 1000/);
    expect([...(await parseFormBody(Buffer.from(""), URLENCODED)).keys()]).toHaveLength(0);
  });
});
