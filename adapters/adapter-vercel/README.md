# @devorajs/adapter-vercel

Packages a [devora.js](https://github.com/hassanalsa3aka/devora.js) app's build output for
Vercel, targeting Vercel's [Build Output API](https://vercel.com/docs/build-output-api/v3)
(`.vercel/output`) — one deployable function per app, plus static assets served directly.

This is used automatically when you run `devora build --adapter=vercel` (or `devora deploy
--adapter=vercel`) inside a devora.js project — there's nothing to install or configure here
directly. See the main repo's
**[Deploying to Vercel or Netlify](https://github.com/hassanalsa3aka/devora.js#deploying-to-vercel-or-netlify)**
guide for the actual setup steps (project settings, environment variables, and the one-time
`vercel.json` that's already generated for you).
