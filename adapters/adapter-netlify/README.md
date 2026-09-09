<img src="https://raw.githubusercontent.com/hassanalsa3aka/devora.js/main/assets/icons/devorajs-logo-withoutbg.png" alt="Devora.js" width="64" />

# @devorajs/adapter-netlify

Packages a [devora.js](https://github.com/hassanalsa3aka/devora.js) app's build output for
Netlify, targeting Netlify's Frameworks API / Netlify Functions format — one function per app,
with static assets served from the publish directory.

This is used automatically when you run `devora build --adapter=netlify` (or `devora deploy
--adapter=netlify`) inside a devora.js project — there's nothing to install or configure here
directly. See the main repo's
**[Deploying](https://github.com/hassanalsa3aka/devora.js/blob/main/DEPLOYING.md)** guide for
the actual setup steps (site settings, environment variables, and the one-time `netlify.toml`
that's already generated for you).
