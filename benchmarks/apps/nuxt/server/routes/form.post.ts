// POST /form: a name redirects (303) to the page with ?sent=1, no name is a 400 that says so.
export default defineEventHandler(async (event) => {
  const body = await readFormData(event);
  const name = String(body.get("name") ?? "").trim();
  if (!name) {
    setResponseStatus(event, 400);
    setResponseHeader(event, "content-type", "text/html; charset=utf-8");
    return `<!doctype html><html><head><title>Form</title></head><body><main><h1>Form</h1><p role="alert">Name is required</p><form method="post" action="/form"><label for="name">Name</label><input id="name" name="name" /><button type="submit">Send</button></form></main></body></html>`;
  }
  return sendRedirect(event, "/form?sent=1", 303);
});
