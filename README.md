# The Year Room

Walk into any year from 1950 to 2025 and see what's in the room: what's on the radio, on TV and at the movies,
what's new in the driveway and on the shelf, what's in the paper, and what a stamp, an hour at minimum wage and a
dollar were worth. Each decade restyles the room.

**Live:** [corey.sciu.to/timeline-demo](https://corey.sciu.to/timeline-demo/) (link straight to a year with
`#1969`; ← → change the year, R picks one at random).

It's an American room, picked for what people had in front of them that year: Billboard's year-end No. 1 song,
the year's big TV, films and headlines, the cars in showrooms (a model year often goes on sale the fall before).

## How it works

```
data/items.txt        the content, one line per item: year | kind | text | Wikipedia article | note
data/checked.txt      items checked by hand whose Wikipedia intro doesn't mention the year
data/cpi.csv          BLS consumer price index (FRED series CPIAUCNS), for "what $1 was worth"
scripts/build_data.py items.txt + Wikipedia + price tables -> data/years.json
index.html, css/, js/ the page (no build step, no framework); js/lib.js holds the testable logic
```

`build_data.py` looks up every item's Wikipedia article, keeps the first sentence of its intro and its main image
with license and author, and checks that the intro mentions the item's year (or the year either side). It stops
on missing articles, disambiguation pages, years missing a station, and duplicates. Wikipedia answers are cached
in `data/.cache/`; `--refresh` asks again.

### Adding or fixing items

1. Edit `data/items.txt`. Kinds: `hit` (the year's No. 1 song, at most one a year), `radio`, `tv`, `film`, `car`,
   `shelf`, `news`. Leave the article blank if it's the same as the text.
2. `npm run build`. If an item fails the year check and you've confirmed it, add `year|Article title  # why` to
   `data/checked.txt`.
3. `npm test`, commit `data/items.txt` and `data/years.json`, push.

### Images

Pictures load from Wikimedia, not from this repo. Free-licensed ones are credited with author and license.
Copyrighted ones (album covers, posters, logos) are the low-resolution copies Wikipedia keeps under fair use,
shown small with a © note and a link to their file page, for reference and commentary. A card whose image fails
to load shows as text.

## Tests

```bash
npm install && npx playwright install chromium   # first time only
npm test            # helpers, the built data (every year furnished, known prices), the build script
npm run test:e2e    # the page: navigation, keys, URL, every year renders, phone width, error state
npm run screenshot  # refresh preview.png
```

## Deploying

Pushing to `main` runs the data tests and publishes through `.github/workflows/deploy.yml`, which stamps
`v1.<commit count>` into the footer.

## History

Started in 2025 as a Cursor experiment ("Timeline Demo"); rebuilt in November 2026 with complete data for every
year from 1950. The old version is in the git history.
