"""
generate-pdf.py
----------------
Build "Pitch Deck.pdf" from "Pitch Deck.md".

Pipeline:
    Pitch Deck.md  -->  Pitch Deck.html  -->  Pitch Deck.pdf

Renders the markdown into a self-contained HTML document with each slide
as a 16:9 page, using styles/deck.css. Then converts to PDF via Microsoft
Edge headless (works on Windows 10/11 out of the box).

Re-run any time Pitch Deck.md changes. PPTX and PDF are build artifacts.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import markdown

ROOT      = Path(__file__).resolve().parent
VAULT_DIR = ROOT.parent
DECK_MD   = VAULT_DIR / "Pitch Deck.md"
CSS_FILE  = ROOT / "styles" / "deck.css"
HTML_OUT  = ROOT / "Pitch Deck.html"
PDF_OUT   = ROOT / "Pitch Deck.pdf"

# Slide header looks like:
#     ---
#     slide: N
#     layout: xxx
#     theme: dark|light
#     ---
SLIDE_HEADER_RE = re.compile(
    r"^---\s*\nslide:\s*(\d+)\s*\n([\s\S]*?)^---\s*\n",
    re.MULTILINE,
)

# Allow `::: card title="..." accent="..."` blocks inside slide markdown.
CARD_OPEN_RE  = re.compile(r"^:::\s*card(.*)$", re.MULTILINE)
CARD_CLOSE_RE = re.compile(r"^:::\s*$",         re.MULTILINE)


def parse_attrs(line: str) -> dict[str, str]:
    """Pick out key="value" tokens from a card directive line."""
    return dict(re.findall(r'(\w+)="([^"]*)"', line))


def parse_frontmatter(block: str) -> dict[str, str]:
    """Tiny YAML-ish parser. One `key: value` per line."""
    out: dict[str, str] = {}
    for line in block.strip().splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def split_slides(text: str) -> list[tuple[dict[str, str], str]]:
    """Return [(frontmatter, body_md), ...] in document order."""
    slides: list[tuple[dict[str, str], str]] = []
    matches = list(SLIDE_HEADER_RE.finditer(text))

    for i, m in enumerate(matches):
        fm = parse_frontmatter(m.group(2))
        body_start = m.end()
        body_end   = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[body_start:body_end].strip()
        # Drop appendix / source-notes section if it leaked into the last slide.
        body = re.sub(r"^# Appendix.*$", "", body, flags=re.MULTILINE | re.DOTALL)
        slides.append((fm, body))

    return slides


def cards_to_html(md_body: str) -> str:
    """Translate `::: card ... :::` blocks into <div class="card"> wrapping
    a sub-grid. We collapse a run of card directives into a `.cards` flex grid.
    """
    lines = md_body.splitlines()
    out: list[str] = []
    in_card = False
    in_card_run = False
    card_buffer: list[str] = []
    card_meta: dict[str, str] = {}

    def flush_card() -> None:
        nonlocal in_card, card_buffer, card_meta
        if in_card:
            inner_html = markdown.markdown("\n".join(card_buffer), extensions=["tables", "extra"])
            cls = "card"
            accent = card_meta.get("accent")
            if accent:
                cls += f" accent-{accent}"
            title = card_meta.get("title", "")
            out.append(
                f'<div class="{cls}">'
                + (f"<h3>{title}</h3>" if title else "")
                + inner_html
                + "</div>"
            )
            card_buffer = []
            card_meta = {}
            in_card = False

    for line in lines:
        m_open  = CARD_OPEN_RE.match(line)
        m_close = CARD_CLOSE_RE.match(line)
        if m_open:
            if not in_card_run:
                out.append('<div class="cards">')
                in_card_run = True
            in_card = True
            card_meta = parse_attrs(m_open.group(1))
        elif m_close:
            flush_card()
        else:
            if in_card:
                card_buffer.append(line)
            else:
                if in_card_run and line.strip() == "":
                    continue  # let the cards block stay tight
                if in_card_run and line.strip() != "":
                    out.append("</div>")  # close .cards
                    in_card_run = False
                out.append(line)

    if in_card:
        flush_card()
    if in_card_run:
        out.append("</div>")
    return "\n".join(out)


def render_slide(idx: int, fm: dict[str, str], body_md: str) -> str:
    layout = fm.get("layout", "default")
    theme  = fm.get("theme", "light")
    slide_no = fm.get("slide", str(idx + 1))
    body_with_cards = cards_to_html(body_md)
    inner_html = markdown.markdown(body_with_cards, extensions=["tables", "extra"])
    return (
        f'<section class="slide layout-{layout} theme-{theme}" data-slide="{slide_no}">'
        f"{inner_html}"
        f"</section>"
    )


def build_html(slides: list[tuple[dict[str, str], str]], css: str) -> str:
    rendered = "\n".join(render_slide(i, fm, body) for i, (fm, body) in enumerate(slides))
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Pitch Deck — Manufacturing AI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>
{rendered}
</body>
</html>
"""


def find_edge() -> str | None:
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    return None


def html_to_pdf_via_edge(html_path: Path, pdf_path: Path) -> bool:
    browser = find_edge()
    if not browser:
        print("[!] Microsoft Edge / Chrome not found. Open the HTML in any browser and print to PDF.")
        return False
    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu",
        f"--print-to-pdf={pdf_path}",
        "--no-pdf-header-footer",
        f"file:///{html_path.as_posix()}",
    ]
    print(f"[*] Generating PDF via {Path(browser).name} ...")
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if res.returncode != 0:
        print(f"[!] Browser returned {res.returncode}\n{res.stderr}")
        return False
    return pdf_path.exists()


def main() -> int:
    if not DECK_MD.exists():
        sys.exit(f"[!] Source not found: {DECK_MD}")
    if not CSS_FILE.exists():
        sys.exit(f"[!] CSS not found: {CSS_FILE}")

    md_text = DECK_MD.read_text(encoding="utf-8")
    css     = CSS_FILE.read_text(encoding="utf-8")

    slides = split_slides(md_text)
    if not slides:
        sys.exit("[!] No slides parsed. Check the `---\\nslide: N\\n...\\n---` blocks.")

    print(f"[*] Parsed {len(slides)} slides")

    html = build_html(slides, css)
    HTML_OUT.write_text(html, encoding="utf-8")
    print(f"[+] Wrote {HTML_OUT}")

    ok = html_to_pdf_via_edge(HTML_OUT, PDF_OUT)
    if ok:
        print(f"[+] Wrote {PDF_OUT}")
        return 0
    print(f"[!] PDF generation failed. HTML is at {HTML_OUT} — open it in a browser and print to PDF manually.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
