**Live:** [corey.sciu.to/timeline-demo](https://corey.sciu.to/timeline-demo/)

How it's built: [ARCHITECTURE.md](ARCHITECTURE.md).

Built with Cursor and [Claude Code](https://claude.com/claude-code).

Timeline Demo

This project is an interactive, filterable timeline displaying cultural milestones, styled with a retro theme. Primarily a project to explore the abilities of Cursor.


## How It Was Made

*   **Development:** Pair-programmed with an AI assistant.
*   **Frontend:** Built with standard HTML, CSS, and vanilla JavaScript.
    *   HTML structures the content (header, timeline list, tile display area).
    *   CSS handles all styling, including the NES color palette, layout (using Flexbox), animations, and mobile responsiveness (`style.css`). The 'Press Start 2P' font is used for the retro feel.
    *   JavaScript (`script.js`) fetches data, builds the timeline and tile views dynamically, handles user interactions (hover/click), category filtering, connector line drawing, and mobile adjustments.
*   **Data:** Timeline events are stored in `data.json`.

## Adding Timeline Items

To add new items to the timeline:

1.  Open the `data.json` file.
2.  Find the desired year key (e.g., `"1996"`). If the year doesn't exist, add it as a new key with an empty array `[]` as its value.
3.  Add a new JSON object `{...}` to the array for that year.
4.  Each object *must* have a `year` (number) and `category` (string).
5.  Include a `caption` (string) to describe the event.
6.  Include a `photo` (string) which can be:
    *   A **local path** relative to the project root (e.g., `"images/1996/game_mk64.jpg"`). Every photo is a file in this repo; a test fails on a web URL.
    *   To add one from the web, put its URL in `photo` and run `python3 tools/localize_images.py` (needs Pillow): it downloads the image, shrinks it to the size cap, saves it under `images/<year>/` and rewrites `photo` to the local path.

**Example Entry in `data.json`:**

```json
  "1996": [
    {
      "year": 1996,
      "category": "game",
      "caption": "Mario Kart 64 released (Japan)",
      "photo": "images/1996/MarioKart64BoxArt.jpg"
    },
    {
      "year": 1996,
      "category": "film",
      "caption": "Space Jam released",
      "photo": "images/1996/film_spacejam.jpg" // Assumes you added this file manually
    }
    // ... more items for 1996
  ],
```

You can have multiple items for the same year, and multiple items with the same category within a year.

## Scripts

### `tools/localize_images.py`

*   **Purpose:** Finds items in `data.json` whose `photo` is a web URL, downloads each image, shrinks it to 0.1 megapixels or less, saves it in `images/YYYY/` and rewrites `photo` to the local path. `credit` is kept.
*   **Usage:** `pip install pillow`, then from the project root: `python3 tools/localize_images.py` (`--dry-run` lists the URLs without fetching).
*   **Note:** A photo that can't be fetched is left as a URL and listed at the end; `npm test` fails until it's fixed or removed. The older `download_images.py` and `fixed_dl_images.sh` don't shrink what they fetch.

## Running Locally

Simply open the `index.html` file in your web browser. For best results (especially avoiding potential CORS issues if you ever load data differently), using a simple local web server is recommended:

*   If you have Python 3: `python -m http.server`
*   Using Node.js `http-server`: `npx http-server`

Then navigate to the provided local address (e.g., `http://localhost:8000`).

## What's in the data

Every year from 1950 to 2025, about a dozen items each (1,012 in all): the year's Billboard No. 1 song and other big
music, TV, films, new cars, toys and gadgets, and the news. It's an American timeline of what people had in front
of them that year, so a car whose model year went on sale the previous fall counts.

Categories in use: Music, Television, Film, Automobiles, Toys & Gadgets, World Events, Tech, Gaming,
Science & Space, Sports. Each has at least 15 items (a test checks), so every filter is worth having. Adding a new one means adding it to `tests/data.test.js` too.

## Images and credits

`photo` is a file under `images/`; nothing is loaded from another site. Photos copied from Wikimedia keep a
`credit`, shown under the image and linking to the file's page there:

```json
"credit": { "text": "Alexander Migl · CC BY-SA 4.0", "url": "https://commons.wikimedia.org/wiki/File:..." }
```

Images in `images/` are kept at 0.1 megapixels or less (about 316×316), the size Wikipedia uses for copyrighted
images; a test enforces it. To shrink one on a Mac: `sips -Z 316 images/YYYY/file.jpg` (keeps the aspect ratio
within 316×316).

Free-licensed images name the author and license, as their licenses require. Copyrighted ones (album covers,
posters, logos) are the low-resolution copies Wikipedia keeps under fair use, credited "© rights holder, low
resolution"; they're shown small in a historical timeline, for reference.

## Tests

```bash
npm install && npx playwright install chromium   # first time only
npm test                 # data checks: every year 1950-2025 filled, known categories, no duplicates,
                         # every photo is a local file, credits link to a source
npm run test:e2e         # Playwright on desktop and a phone: years list, pin/unpin, filters, menu, flow view,
                         # broken images hidden, every year opens, no sideways scrolling, axe accessibility scan
npm run screenshot       # refreshes preview.png, used for link previews
```

Browser tests block Google Fonts so they don't depend on the network.

## Deploying

`.github/workflows/deploy.yml` runs both test suites on every push and pull request. Pushes to `main` that pass
are published to GitHub Pages with `v1.<commit count>` shown next to the name in the corner.
