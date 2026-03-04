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
    *   A **web URL** (e.g., `"https://upload.wikimedia.org/wikipedia/en/0/05/MarioKart64BoxArt.jpg"`). The `download_images.py` script can fetch these.
    *   A **local path** relative to the project root (e.g., `"images/1996/game_mk64.jpg"`). You'll need to place the image file there manually *before* loading the page.

**Example Entry in `data.json`:**

```json
  "1996": [
    {
      "year": 1996,
      "category": "game",
      "caption": "Mario Kart 64 released (Japan)",
      "photo": "https://upload.wikimedia.org/wikipedia/en/0/05/MarioKart64BoxArt.jpg"
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

### `download_images.py`

*   **Purpose:** Reads `data.json`, finds items with web URLs in the `photo` field, downloads the images, and saves them locally into the `images/YYYY/` directory structure (where `YYYY` is the year). It then **updates** `data.json` to replace the original web URLs with the new local file paths.
*   **Usage:**
    1.  Make sure you have Python installed.
    2.  Install the necessary library: `pip install requests`
    3.  Run the script from the project's root directory: `python download_images.py`
*   **Note:** The script automatically decodes URL-encoded characters (like `%28` for `(`) in filenames to prevent issues with file serving. It will skip downloading files that already exist locally or entries that already use a local `images/...` path.

## Running Locally

Simply open the `index.html` file in your web browser. For best results (especially avoiding potential CORS issues if you ever load data differently), using a simple local web server is recommended:

*   If you have Python 3: `python -m http.server`
*   Using Node.js `http-server`: `npx http-server`

Then navigate to the provided local address (e.g., `http://localhost:8000`). 
