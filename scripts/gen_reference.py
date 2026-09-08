"""用原 fetch_docs.py 的 html_to_markdown 生成参考 Markdown（对比基线）。"""
import importlib.util, json, os, sys

# 动态加载原脚本（其 html_to_markdown 为纯函数）
SPEC = importlib.util.spec_from_file_location(
    "fetch_docs_ref",
    r"D:\A_yoprogram\Learn\yohu-harmonyos-docs\知识库\抓取脚本库\fetch_docs.py",
)
ref = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ref)

os.makedirs("testdata/real", exist_ok=True)
for name in sys.argv[1:] or ["introduction-to-arkts", "resource-categories-and-access", "js-apis-app-ability-uiability"]:
    html = open(f"testdata/real/{name}.html", encoding="utf-8").read()
    meta = json.load(open(f"testdata/real/{name}.meta.json", encoding="utf-8"))
    md = ref.html_to_markdown(html, meta["title"], meta["time"], meta["url"], meta["catalog"], {})
    out = f"testdata/real/{name}.ref.md"
    with open(out, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"{name}: ref md = {len(md)} chars -> {out}")