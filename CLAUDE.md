# timeline-demo

Static site: index.html + app.js + style.css (flow.html only redirects there). Data is data.json:
`{ "YYYY": [ { year, category, caption, photo, credit? } ] }`. Keep the retro look: the NES/SNES grays and purple and
the pixel font are deliberate (it began as a timeline of Corey's lifetime, from 1983).

Follows the app standards in [csciuto/app-template STANDARDS.md](https://github.com/csciuto/app-template/blob/main/STANDARDS.md).
Commit and push freely once tests pass.

- Local images stay ≤0.1 megapixels (fair-use size; tests enforce it).
- Scope: American, 1950-2025, "what was in the room that year". Photos are local files (never hotlinked; `tools/localize_images.py` copies one from a URL); those from Wikimedia keep `credit {text, url}`.
- Tests: `npm test` (node --test tests/*.test.js, data checks) and `npm run test:e2e` (Playwright, desktop + Pixel 7,
  axe scan; fonts blocked). CI runs both before deploying. Node needs PATH=/opt/homebrew/bin.
- Version: deploy stamps `>dev<` in the `.version` span of index.html.
- `preview.png` (`npm run screenshot`) is the link preview and the card on corey.sciu.to/projects/; regenerate it
  after a visible UI change.
