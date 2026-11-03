# timeline-demo

Static site (index.html + script.js + style.css, and flow.html/flow.js/flow.css). Data is data.json:
`{ "YYYY": [ { year, category, caption, photo, credit? } ] }`. Keep the original look and feel; extend, don't rewrite.

- Local images stay ≤0.1 megapixels (fair-use size; tests enforce it).
- Scope: American, 1950-2025, "what was in the room that year". Wikimedia photos need `credit {text, url}`.
- Tests: `npm test` (node --test tests/*.test.js, data checks) and `npm run test:e2e` (Playwright, desktop + Pixel 7,
  axe scan; Wikimedia and fonts blocked). CI runs both before deploying. Node needs PATH=/opt/homebrew/bin.
- Version: deploy stamps `>dev<` in the `.version` span of index.html and flow.html.
