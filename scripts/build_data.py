#!/usr/bin/env python3
"""Build data/years.json from data/items.txt, Wikipedia, and the price tables below.

    python3 scripts/build_data.py            # uses cached Wikipedia answers in data/.cache
    python3 scripts/build_data.py --refresh  # asks Wikipedia again

For every item it looks up the Wikipedia article (following redirects), keeps the
first sentence of its intro, the article's main image and that image's license and
author, and checks that the intro mentions the item's year (or the year either side,
since a car's model year or a song's chart run straddles New Year). Items that fail
are listed; fix the line in items.txt, or, after checking by hand, add "year|article"
to data/checked.txt. The run fails while any item is unresolved.
"""
import csv
import hashlib
import html
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CACHE = DATA / ".cache"
API = "https://en.wikipedia.org/w/api.php"
UA = "timeline-demo-build/1.0 (https://corey.sciu.to/timeline-demo/)"
KINDS = ["hit", "radio", "tv", "film", "car", "shelf", "news"]
FIRST, LAST = 1950, 2025

# US first-class stamp (cents), effective date -> rate. USPS rate history.
STAMP = [("1932-07-06", 3), ("1958-08-01", 4), ("1963-01-07", 5), ("1968-01-07", 6), ("1971-05-16", 8),
         ("1974-03-02", 10), ("1975-12-31", 13), ("1978-05-29", 15), ("1981-03-22", 18), ("1981-11-01", 20),
         ("1985-02-17", 22), ("1988-04-03", 25), ("1991-02-03", 29), ("1995-01-01", 32), ("1999-01-10", 33),
         ("2001-01-07", 34), ("2002-06-30", 37), ("2006-01-08", 39), ("2007-05-14", 41), ("2008-05-12", 42),
         ("2009-05-11", 44), ("2012-01-22", 45), ("2013-01-27", 46), ("2014-01-26", 49), ("2016-04-10", 47),
         ("2017-01-22", 49), ("2018-01-21", 50), ("2019-01-27", 55), ("2021-08-29", 58), ("2022-07-10", 60),
         ("2023-01-22", 63), ("2023-07-09", 66), ("2024-01-21", 68), ("2024-07-14", 73), ("2025-07-13", 78)]
# Federal minimum wage (dollars/hour), effective date -> rate. US Department of Labor.
MIN_WAGE = [("1950-01-25", 0.75), ("1956-03-01", 1.00), ("1961-09-03", 1.15), ("1963-09-03", 1.25),
            ("1967-02-01", 1.40), ("1968-02-01", 1.60), ("1974-05-01", 2.00), ("1975-01-01", 2.10),
            ("1976-01-01", 2.30), ("1978-01-01", 2.65), ("1979-01-01", 2.90), ("1980-01-01", 3.10),
            ("1981-01-01", 3.35), ("1990-04-01", 3.80), ("1991-04-01", 4.25), ("1996-10-01", 4.75),
            ("1997-09-01", 5.15), ("2007-07-24", 5.85), ("2008-07-24", 6.55), ("2009-07-24", 7.25)]


def parse_items(path):
    items = []
    for n, line in enumerate(path.read_text().splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 3 or len(parts) > 5:
            sys.exit(f"items.txt:{n}: expected 3-5 fields, got {len(parts)}")
        parts += [""] * (5 - len(parts))
        year, kind, text, wiki, note = parts
        if kind not in KINDS:
            sys.exit(f"items.txt:{n}: unknown kind {kind!r}")
        if not (FIRST <= int(year) <= LAST):
            sys.exit(f"items.txt:{n}: year {year} outside {FIRST}-{LAST}")
        items.append(dict(year=int(year), kind=kind, text=text, wiki=wiki or text, note=note, line=n))
    return items


def api(params, refresh):
    params = dict(params, format="json", formatversion="2")
    key = hashlib.sha1(json.dumps(params, sort_keys=True).encode()).hexdigest()
    f = CACHE / (key + ".json")
    if f.exists() and not refresh:
        return json.loads(f.read_text())
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
                out = json.load(r)
            break
        except Exception as e:  # noqa: BLE001
            if attempt == 3:
                raise
            time.sleep(2 + attempt * 3)
    CACHE.mkdir(exist_ok=True)
    f.write_text(json.dumps(out))
    time.sleep(0.6)
    return out


def chunks(xs, n):
    for i in range(0, len(xs), n):
        yield xs[i:i + n]


def lookup_pages(titles, refresh):
    """title as written -> page dict (title, extract, image name, thumbnail), or None if missing."""
    out = {}
    for batch in chunks(sorted(set(titles)), 20):  # extracts allows 20 pages per request
        r = api(dict(action="query", titles="|".join(batch), redirects=1, prop="extracts|pageimages|pageprops", ppprop="disambiguation", pilicense="any",
                     exintro=1, explaintext=1, exlimit=20, piprop="thumbnail|name", pithumbsize=360,
                     pilimit=20), refresh)
        q = r.get("query", {})
        alias = {}
        for kind in ("normalized", "redirects"):
            for m in q.get(kind, []):
                alias[m["from"]] = m["to"]
        pages = {p["title"]: p for p in q.get("pages", [])}
        for t in batch:
            final = t
            for _ in range(3):
                final = alias.get(final, final)
            p = pages.get(final)
            out[t] = None if (p is None or p.get("missing") or p.get("invalid")) else p
    return out


def lookup_images(names, refresh):
    out = {}
    for batch in chunks(sorted(set(names)), 50):
        r = api(dict(action="query", titles="|".join("File:" + n for n in batch), prop="imageinfo",
                     iiprop="extmetadata|url", iiextmetadatafilter="LicenseShortName|Artist|NonFree|Credit",
                     ), refresh)
        for p in r.get("query", {}).get("pages", []):
            info = (p.get("imageinfo") or [{}])[0]
            meta = info.get("extmetadata", {})
            val = lambda k: strip_html(meta.get(k, {}).get("value", ""))
            out[p["title"].removeprefix("File:").replace(" ", "_")] = dict(
                license=val("LicenseShortName"), artist=val("Artist")[:120],
                nonfree=val("NonFree").lower() == "true" or "non-free" in val("LicenseShortName").lower()
                or val("LicenseShortName") == "",
                page=info.get("descriptionurl", ""))
    return out


def strip_html(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


ABBREV = {"Mr", "Mrs", "Ms", "Dr", "Sgt", "St", "Jr", "Sr", "vs", "No", "Inc", "Co", "Lt", "Gen", "Capt", "Mt", "Ft"}


def first_sentence(text, limit=240):
    text = re.sub(r"\s*\([^()]*\)", "", text.split("\n")[0]).strip()  # drop parentheticals (pronunciations)
    end = len(text)
    for m in re.finditer(r"[.!?]+[\"”]?(?=\s+[A-Z\"“])", text):
        word = re.findall(r"[\w.]+$", text[:m.start()])
        word = word[0] if word else ""
        if "..." in m.group(0) or "." in word or word in ABBREV or len(word) == 1:
            continue  # an ellipsis, an initial ("B."), "U.S." or "Dr."
        end = m.end()
        break
    s = text[:end]
    if len(s) > limit:
        s = s[:limit].rsplit(" ", 1)[0] + "…"
    return s


def year_value(table, year):
    """The rate in effect for most of the year (on July 1)."""
    v = None
    for d, x in table:
        if d <= f"{year}-07-01":
            v = x
    return v


def cpi_annual():
    by_year = {}
    with open(DATA / "cpi.csv") as f:
        for row in csv.DictReader(f):
            y = int(row["observation_date"][:4])
            if row["CPIAUCNS"]:  # October 2025 was never published (government shutdown)
                by_year.setdefault(y, []).append(float(row["CPIAUCNS"]))
    return {y: sum(v) / len(v) for y, v in by_year.items() if len(v) >= 11}


def main():
    refresh = "--refresh" in sys.argv
    items = parse_items(DATA / "items.txt")
    checked = set()
    if (DATA / "checked.txt").exists():
        for line in (DATA / "checked.txt").read_text().splitlines():
            if line.strip() and not line.startswith("#"):
                checked.add(line.split("#")[0].strip())

    pages = lookup_pages([i["wiki"] for i in items], refresh)
    names = [p["pageimage"] for p in pages.values() if p and p.get("pageimage")]
    images = lookup_images(names, refresh)

    problems, unused_checks = [], set(checked)
    seen = set()
    for it in items:
        key = (it["year"], it["kind"], it["wiki"])
        if key in seen:
            problems.append(f"line {it['line']}: duplicate {it['year']} {it['kind']} {it['wiki']}")
        seen.add(key)
        p = pages.get(it["wiki"])
        ck = f"{it['year']}|{it['wiki']}"
        unused_checks.discard(ck)
        if p is not None and f"{it['year']}|{p['title']}" in checked:
            ck = f"{it['year']}|{p['title']}"
            unused_checks.discard(ck)
        if p is None:
            problems.append(f"line {it['line']}: no Wikipedia article {it['wiki']!r}")
            continue
        if "disambiguation" in p.get("pageprops", {}) or "may refer to" in p.get("extract", "")[:300]:
            problems.append(f"line {it['line']}: {p['title']!r} is a disambiguation page")
            continue
        it["title"] = p["title"]
        intro = p.get("extract", "")
        it["about"] = first_sentence(intro)
        years = {str(it["year"] + d) for d in (-1, 0, 1)}
        if not any(y in intro for y in years) and ck not in checked:
            problems.append(f"line {it['line']}: intro of {p['title']!r} doesn't mention {it['year']}±1"
                            f"  [{intro[:160]!r}]")
        name = p.get("pageimage")
        th = p.get("thumbnail")
        if name and th:
            meta = images.get(name, {})
            it["img"] = dict(src=th["source"].split("?")[0], w=th["width"], h=th["height"],
                             page=meta.get("page") or f"https://en.wikipedia.org/wiki/File:{name}",
                             license=meta.get("license", ""), artist=meta.get("artist", ""),
                             nonfree=meta.get("nonfree", True))

    for y in range(FIRST, LAST + 1):
        kinds = {i["kind"] for i in items if i["year"] == y}
        for k in ("radio", "tv", "film", "car", "shelf", "news"):
            if k not in kinds and not (k == "radio" and "hit" in kinds):
                problems.append(f"{y}: nothing of kind {k}")
        if y < LAST and "hit" not in kinds:
            problems.append(f"{y}: no No. 1 song")
    if unused_checks:
        print("checked.txt entries that match nothing (remove them):", *sorted(unused_checks), sep="\n  ")

    cpi = cpi_annual()
    base_year = max(y for y in cpi if y <= LAST)
    prices = {str(y): dict(stamp=year_value(STAMP, y), min_wage=year_value(MIN_WAGE, y),
                           dollar=round(cpi[base_year] / cpi[y], 2))
              for y in range(FIRST, LAST + 1) if y in cpi}

    out = dict(first=FIRST, last=LAST, dollar_year=base_year, years={})
    for it in items:
        if "title" not in it:
            continue
        rec = {k: it[k] for k in ("kind", "text", "title", "about") if it.get(k)}
        if it["note"]:
            rec["note"] = it["note"]
        if it.get("img"):
            rec["img"] = it["img"]
        out["years"].setdefault(str(it["year"]), []).append(rec)
    out["prices"] = prices
    (DATA / "years.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))

    n_img = sum(1 for i in items if i.get("img"))
    n_free = sum(1 for i in items if i.get("img") and not i["img"]["nonfree"])
    print(f"{len(items)} items, {len(out['years'])} years, {n_img} with images ({n_free} free-licensed)")
    if problems:
        print(f"\n{len(problems)} problems:", *problems, sep="\n  ")
        sys.exit(1)


if __name__ == "__main__":
    main()
