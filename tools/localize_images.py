#!/usr/bin/env python3
"""Copy every remote photo in data.json into images/<year>/, shrunk to fair-use size.

    python3 tools/localize_images.py            # fetch, shrink, rewrite data.json
    python3 tools/localize_images.py --dry-run  # list what would be fetched

Needs Pillow. Each photo is scaled to at most 0.1 megapixels and saved as JPEG (PNG when it
has transparency). data.json's `photo` becomes the local path; `credit` is kept. A photo that
can't be fetched is left as it was and listed at the end.
"""
import io
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data.json')
MAX_PIXELS = 100_000
AGENT = 'timeline-image-fetch/1.0 (static site build; python-urllib)'


def fetch(url, tries=5):
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': AGENT})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and n < tries - 1:
                time.sleep(float(e.headers.get('Retry-After') or 0) or 5 * (n + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if n == tries - 1:
                raise
            time.sleep(3 * (n + 1))


def local_name(url):
    name = urllib.parse.unquote(url.rsplit('/', 1)[-1])
    name = re.sub(r'^\d+px-', '', name)                 # thumbnail prefix
    name = re.sub(r'\.(svg|gif|tiff?|webp|png|jpe?g)(\.(png|jpg))?$', '', name, flags=re.I)
    name = re.sub(r'[^A-Za-z0-9._-]+', '_', name).strip('._')[:80]
    return name or 'photo'


def shrink(raw):
    """Returns (bytes, extension)."""
    im = Image.open(io.BytesIO(raw))
    im.seek(0)
    alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    im = im.convert('RGBA' if alpha else 'RGB')
    if alpha and im.getchannel('A').getextrema()[0] == 255:
        im, alpha = im.convert('RGB'), False
    w, h = im.size
    if w * h > MAX_PIXELS:
        k = math.sqrt(MAX_PIXELS / (w * h))
        nw, nh = max(1, int(w * k)), max(1, int(h * k))
        im = im.resize((nw, nh), Image.LANCZOS)
    out = io.BytesIO()
    if alpha:
        im.save(out, 'PNG', optimize=True)
        return out.getvalue(), '.png'
    im.save(out, 'JPEG', quality=82, optimize=True, progressive=True)
    return out.getvalue(), '.jpg'


def main():
    dry = '--dry-run' in sys.argv
    with open(DATA, encoding='utf-8') as f:
        data = json.load(f)
    done, failed = {}, []
    todo = [(y, it) for y, items in data.items() for it in items
            if re.match(r'https?://', it.get('photo') or '')]
    print(f'{len(todo)} remote photos')
    for n, (year, item) in enumerate(todo, 1):
        url = item['photo']
        if url in done:
            item['photo'] = done[url]
            continue
        if dry:
            print(url)
            continue
        try:
            body, ext = shrink(fetch(url))
        except Exception as e:  # noqa: BLE001 - report and carry on
            failed.append((year, url, repr(e)))
            print(f'[{n}/{len(todo)}] FAILED {url}: {e!r}', flush=True)
            continue
        folder = os.path.join(ROOT, 'images', year)
        os.makedirs(folder, exist_ok=True)
        base, rel, k = local_name(url), None, 1
        while True:
            rel = f'images/{year}/{base}{"" if k == 1 else f"-{k}"}{ext}'
            if not os.path.exists(os.path.join(ROOT, rel)):
                break
            k += 1
        with open(os.path.join(ROOT, rel), 'wb') as f:
            f.write(body)
        done[url] = item['photo'] = rel
        if n % 25 == 0:
            print(f'[{n}/{len(todo)}]', flush=True)
            with open(DATA, 'w', encoding='utf-8') as f:   # checkpoint
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write('\n')
        time.sleep(0.25)
    if not dry:
        with open(DATA, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')
    print(f'{len(done)} copied, {len(failed)} failed')
    for year, url, why in failed:
        print(f'  {year} {url} {why}')


if __name__ == '__main__':
    main()
