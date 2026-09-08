"""拉取真实华为文档 HTML 保存到 testdata/real/，供对比分析。"""
import json, os, sys
import requests

API = "https://svc-drcn.developer.huawei.com/community/servlet/consumer/cn/documentPortal/getDocumentById"
HEADERS = {
    "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://developer.huawei.com",
    "Referer": "https://developer.huawei.com/consumer/cn/doc/",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
}

def fetch(slug, catalog):
    r = requests.post(API, json={"objectId": slug, "version": "", "catalogName": catalog, "language": "cn"}, headers=HEADERS, timeout=15)
    v = r.json().get("value", r.json().get("data", {}))
    return v

def main():
    docs = [
        ("introduction-to-arkts", "harmonyos-guides"),
        ("resource-categories-and-access", "harmonyos-guides"),
        ("js-apis-app-ability-uiability", "harmonyos-references"),
    ]
    os.makedirs("testdata/real", exist_ok=True)
    for slug, catalog in docs:
        v = fetch(slug, catalog)
        html = v.get("content", {}).get("content", "")
        meta = {"title": v.get("title"), "time": v.get("displayUpdateTime"),
                "url": f"https://developer.huawei.com/consumer/cn/doc/{catalog}/{slug}",
                "catalog": catalog, "slug": slug}
        base = f"testdata/real/{slug}"
        with open(base + ".html", "w", encoding="utf-8") as f:
            f.write(html)
        with open(base + ".meta.json", "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
        print(f"{slug}: title={meta['title']} html={len(html)} chars")

if __name__ == "__main__":
    main()