"""Strip an HTML page to readable text (scripts/styles dropped). Usage: html2text.py in.html > out.txt"""
import html
import re
import sys
from html.parser import HTMLParser


class T(HTMLParser):
    BLOCK = {"p", "div", "li", "br", "h1", "h2", "h3", "h4", "h5", "tr", "section", "article", "td", "th", "ul", "ol"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self.skip += 1
        elif tag in self.BLOCK:
            self.out.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg"):
            self.skip = max(0, self.skip - 1)
        elif tag in self.BLOCK:
            self.out.append("\n")

    def handle_data(self, d):
        if not self.skip:
            self.out.append(d)


p = T()
p.feed(open(sys.argv[1], encoding="utf-8", errors="replace").read())
txt = html.unescape("".join(p.out))
txt = re.sub(r"[ \t ]+", " ", txt)
txt = re.sub(r"\n\s*\n+", "\n\n", txt)
sys.stdout.reconfigure(encoding="utf-8")
print(txt.strip())
