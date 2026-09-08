"""全量对比：Rust 引擎输出 vs Python 参考输出，输出差异报告。"""
import json, os, subprocess, sys

# Windows GBK 控制台无法编码 ✓/✗ 等字符，统一 UTF-8 输出
sys.stdout.reconfigure(encoding="utf-8")

EXE = r"target\debug\examples\convert_file.exe"
DOCS = ["introduction-to-arkts", "resource-categories-and-access", "js-apis-app-ability-uiability"]

def norm(s):
    """规范化：去行尾空白、折叠连续空行，便于结构化 diff。"""
    lines = [l.rstrip() for l in s.splitlines()]
    out = []
    for l in lines:
        if l == "" and out and out[-1] == "":
            continue
        out.append(l)
    return "\n".join(out).strip()

def first_diff(a, b):
    la, lb = a.splitlines(), b.splitlines()
    for i in range(max(len(la), len(lb))):
        x = la[i] if i < len(la) else "<EOF>"
        y = lb[i] if i < len(lb) else "<EOF>"
        if x != y:
            return i + 1, x, y
    return None

for name in DOCS:
    meta = json.load(open(f"testdata/real/{name}.meta.json", encoding="utf-8"))
    rust_out = f"testdata/real/{name}.rust.md"
    subprocess.run([
        EXE, f"testdata/real/{name}.html", meta["title"], meta["time"],
        meta["url"], meta["catalog"], rust_out,
    ], check=True)
    ref = open(f"testdata/real/{name}.ref.md", encoding="utf-8").read()
    rust = open(rust_out, encoding="utf-8").read()
    nr, nu = norm(ref), norm(rust)
    same = nr == nu
    print(f"\n{'='*70}\n[{name}] ref={len(ref)} rust={len(rust)} chars | 规范化后 {'一致 ✓' if same else '不一致 ✗'}")
    if not same:
        d = first_diff(nr, nu)
        if d:
            ln, x, y = d
            print(f"  首个差异 @ 行 {ln}:")
            print(f"    REF : {x[:120]}")
            print(f"    RUST: {y[:120]}")
        # 统计差异行数
        import difflib
        diff = list(difflib.unified_diff(nr.splitlines(), nu.splitlines(), lineterm=""))
        changes = sum(1 for l in diff if l.startswith(("+", "-")) and not l.startswith(("+++", "---")))
        print(f"  差异行数（±合计）: {changes} / ref {len(nr.splitlines())} 行")
        with open(f"testdata/real/{name}.diff.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(diff))
        print(f"  完整 diff -> testdata/real/{name}.diff.txt")