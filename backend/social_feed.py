"""Read-only Reddit search feed adapter for the HYROX Pulse tab."""

from html import unescape
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ATOM = "{http://www.w3.org/2005/Atom}"
REDDIT_HOSTS = {"reddit.com", "www.reddit.com", "redd.it", "www.redd.it"}


class SocialFeedError(RuntimeError):
    """Raised when the upstream community feed cannot be fetched or parsed."""


def _text(value: str | None, max_length: int = 280) -> str:
    if not value:
        return ""
    plain = re.sub(r"<[^>]*>", " ", unescape(value))
    return re.sub(r"\s+", " ", plain).strip()[:max_length]


def parse_reddit_atom(payload: bytes, limit: int = 20) -> list[dict[str, str]]:
    """Parse Reddit's public Atom search feed without rendering embedded HTML."""
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as error:
        raise SocialFeedError("Reddit returned an unreadable feed.") from error

    posts: list[dict[str, str]] = []
    for entry in root.findall(f"{ATOM}entry")[:limit]:
        link_element = entry.find(f"{ATOM}link")
        link = link_element.get("href", "") if link_element is not None else ""
        if urlsplit(link).hostname not in REDDIT_HOSTS:
            continue
        author_element = entry.find(f"{ATOM}author/{ATOM}name")
        posts.append({
            "id": _text((entry.findtext(f"{ATOM}id") or link), 300),
            "title": _text(entry.findtext(f"{ATOM}title"), 180) or "HYROX community post",
            "url": link,
            "published": _text(entry.findtext(f"{ATOM}updated") or entry.findtext(f"{ATOM}published"), 40),
            "author": _text(author_element.text if author_element is not None else "Reddit community", 80),
            "summary": _text(entry.findtext(f"{ATOM}content") or entry.findtext(f"{ATOM}summary"), 280),
            "source": "Reddit",
        })
    return posts


def fetch_reddit_feed(query: str, limit: int = 20) -> list[dict[str, str]]:
    """Fetch a small page from Reddit's public search feed with a fixed upstream host."""
    params = urlencode({"q": query[:120], "sort": "new", "limit": max(1, min(limit, 25))})
    request = Request(
        f"https://www.reddit.com/search.rss?{params}",
        headers={"User-Agent": "PACECheck/0.1 (read-only HYROX community feed)"},
    )
    try:
        with urlopen(request, timeout=8) as response:
            return parse_reddit_atom(response.read(2_000_000), limit=limit)
    except (HTTPError, URLError, TimeoutError) as error:
        raise SocialFeedError("Reddit's public feed is temporarily unavailable.") from error