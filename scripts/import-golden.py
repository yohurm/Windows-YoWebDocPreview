"""黄金样本导入（v1 G2 / v2 R4 门禁的种子工具）。

流程：
1. 种子 slug → 华为开发者文档 API 抓取 HTML；
2. 从已抓 HTML 中 BFS 发现更多真实文档链接 `/consumer/cn/doc/<catalog>/<slug>`，凑够目标篇数；
3. 冻结 `testdata/golden/<sample>/{input.html, meta.json}`；
4. 生成基线 `expected.md`：
   - 有 Python 参考输出（testdata/real/<slug>.ref.md）→ 用它（与 Python 行为对齐的 parity 门禁）；
   - 否则 → 调 Rust 引擎 `convert_file` 生成冻结基线（回归门禁，锁定当前输出）。

用法：python scripts/import-golden.py [N]      # N 默认 50
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
from collections import deque
from pathlib import Path

API = "https://svc-drcn.developer.huawei.com/community/servlet/consumer/cn/documentPortal/getDocumentById"
HEADERS = {
    "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://developer.huawei.com",
    "Referer": "https://developer.huawei.com/consumer/cn/doc/",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
}

ROOT = Path(__file__).resolve().parent.parent
GOLDEN = ROOT / "testdata" / "golden"
REAL = ROOT / "testdata" / "real"
CONVERTER = ROOT / "target" / "debug" / "examples" / "convert_file.exe"

# 真实样本中已有 Python 参考输出 → 作为 parity 门禁基线
SEEDS = [
    ("introduction-to-arkts", "harmonyos-guides"),
    ("resource-categories-and-access", "harmonyos-guides"),
    ("js-apis-app-ability-uiability", "harmonyos-references"),
]

# 仅收小写 slug（中文文档路径统一为英文 slug）
DISCOVER_RE = re.compile(r"/consumer/cn/doc/([a-z0-9][a-z0-9-]{2,40})/([a-z0-9][a-z0-9-]{2,60})")
MIN_HTML_CHARS = 2000
DELAY_SEC = 0.2


def fetch(slug: str, catalog: str) -> dict | None:
    import requests

    try:
        r = requests.post(
            API,
            json={"objectId": slug, "version": "", "catalogName": catalog, "language": "cn"},
            headers=HEADERS,
            timeout=25,
        )
        r.raise_for_status()
        body = r.json()
    except Exception as e:  # 网络抖动直接跳过该样本
        print(f"  ! {catalog}/{slug}: {type(e).__name__} {str(e)[:80]}")
        return None
    v = body.get("value") or body.get("data") or {}
    html = ((v.get("content") or {}).get("content") or "").strip()
    if len(html) < MIN_HTML_CHARS:
        print(f"  ! {catalog}/{slug}: 正文过短（{len(html)} 字符），跳过")
        return None
    return {
        "html": html,
        "title": v.get("title") or slug,
        "time": v.get("displayUpdateTime") or "",
        "catalog": catalog,
        "slug": slug,
        "url": f"https://developer.huawei.com/consumer/cn/doc/{catalog}/{slug}",
    }


def discover(html: str) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for m in DISCOVER_RE.finditer(html):
        out.append((m.group(2), m.group(1)))
    return out


def sample_dir_name(used: set[str], slug: str, catalog: str) -> str:
    """目录名唯一化：slug 冲突时追加 catalog。"""
    name = slug
    if name in used:
        name = f"{slug}--{catalog}"
    used.add(name)
    return name


def build_golden_set(target: int) -> list[dict]:
    """BFS 收集样本：种子优先，其后由链接发现扩表。"""
    samples: list[dict] = []
    seen: set[tuple[str, str]] = set()
    queue: deque[tuple[str, str]] = deque(SEEDS)

    while queue and len(samples) < target:
        slug, catalog = queue.popleft()
        if (slug, catalog) in seen:
            continue
        seen.add((slug, catalog))
        doc = fetch(slug, catalog)
        if doc is None:
            continue
        samples.append(doc)
        print(f"[{len(samples)}/{target}] {catalog}/{slug}  title={doc['title'][:28]}  html={len(doc['html'])}")
        time.sleep(DELAY_SEC)
        for nxt in discover(doc["html"]):
            if nxt not in seen and nxt not in queue:
                queue.append(nxt)
    return samples


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    target = int(sys.argv[1]) if len(sys.argv) > 1 else 50

    if not CONVERTER.exists():
        print(f"缺少转换器 {CONVERTER}，先执行: cargo build --example convert_file -p yohu-md-convert")
        return 1

    GOLDEN.mkdir(parents=True, exist_ok=True)
    samples = build_golden_set(target)
    print(f"\n共 {len(samples)} 篇样本，写入 {GOLDEN}")

    used: set[str] = set()
    parity = baseline = 0
    for doc in samples:
        name = sample_dir_name(used, doc["slug"], doc["catalog"])
        d = GOLDEN / name
        d.mkdir(parents=True, exist_ok=True)
        (d / "input.html").write_text(doc["html"], encoding="utf-8")
        meta = {k: doc[k] for k in ("title", "time", "url", "catalog", "slug")}
        (d / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

        ref = REAL / f"{doc['slug']}.ref.md"
        ref_html = REAL / f"{doc['slug']}.html"
        ref_meta = REAL / f"{doc['slug']}.meta.json"
        if ref.exists() and ref_html.exists() and ref_meta.exists():
            # 使用与 ref.md 同步的离线 html 和 meta，避免远程更新导致时间戳及内容漂移
            (d / "input.html").write_text(ref_html.read_text(encoding="utf-8"), encoding="utf-8")
            (d / "meta.json").write_text(ref_meta.read_text(encoding="utf-8"), encoding="utf-8")
            shutil.copyfile(ref, d / "expected.md")
            parity += 1
            note = "Python parity 基线（同步离线固定快照）"
        else:
            subprocess.run(
                [
                    str(CONVERTER),
                    str(d / "input.html"),
                    doc["title"],
                    doc["time"],
                    doc["url"],
                    doc["catalog"],
                    str(d / "expected.md"),
                ],
                check=True,
                capture_output=True,
            )
            baseline += 1
            note = "Rust 冻结基线"
        print(f"  {name:<46} expected.md = {note}")

    print(
        f"\n完成：{len(samples)} 篇（Python parity {parity}，Rust 冻结 {baseline}）"
        f"\n门禁：cargo test -p yohu-md-convert --test golden"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
