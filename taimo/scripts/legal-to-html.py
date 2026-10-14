#!/usr/bin/env python3
"""Convierte los textos legales (launch/*.md) en páginas HTML sencillas para
publicarlas junto a la web (las tiendas piden una URL de privacidad).
No publica un texto que aún tenga huecos por rellenar ([NOMBRE…], [NIF…])."""
import html, pathlib, re, sys

SRC = pathlib.Path(__file__).resolve().parent.parent / 'launch'
OUT = pathlib.Path(sys.argv[1])
PAGES = {'privacy-policy-es.md': 'privacidad.html', 'privacy-policy-en.md': 'privacy.html', 'terms-es.md': 'terminos.html'}
PLACEHOLDER = re.compile(r'\[(NOMBRE|NIF|DIRECCI|CORREO|FECHA)', re.I)

def inline(t: str) -> str:
    t = html.escape(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'`(.+?)`', r'<code>\1</code>', t)
    return re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', r'<a href="\2">\1</a>', t)

def convert(md: str) -> tuple[str, str]:
    out, title, in_list = [], 'Taimo', False
    for line in md.splitlines():
        s = line.rstrip()
        if s.startswith('> '):  # notas internas del borrador
            continue
        if re.match(r'^\s*[-*] ', s):
            if not in_list:
                out.append('<ul>'); in_list = True
            out.append(f'<li>{inline(re.sub(r"^\s*[-*] ", "", s))}</li>'); continue
        if in_list:
            out.append('</ul>'); in_list = False
        m = re.match(r'^(#{1,3}) (.*)', s)
        if m:
            level = len(m.group(1))
            if level == 1: title = m.group(2)
            out.append(f'<h{level}>{inline(m.group(2))}</h{level}>')
        elif s:
            out.append(f'<p>{inline(s)}</p>')
    if in_list: out.append('</ul>')
    return title, '\n'.join(out)

OUT.mkdir(parents=True, exist_ok=True)
for src, dst in PAGES.items():
    md = (SRC / src).read_text(encoding='utf-8')
    if PLACEHOLDER.search(md):
        print(f'· {src}: tiene huecos por rellenar ([…]); no se publica todavía')
        continue
    title, body = convert(md)
    (OUT / dst).write_text(f'''<!doctype html><html lang="{'en' if src.endswith('-en.md') else 'es'}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title>
<style>body{{font:17px/1.6 system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px 16px;color:#0B1F17;background:#F5F7F6}}
h1,h2,h3{{line-height:1.25}}a{{color:#077A51}}@media(prefers-color-scheme:dark){{body{{color:#E7F0EC;background:#0A0F0D}}a{{color:#2EE59D}}}}</style>
</head><body>{body}</body></html>''', encoding='utf-8')
    print(f'· {src} → legal/{dst}')
