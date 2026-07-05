#!/usr/bin/env python3
"""
Build data/pairs.json for the 2AFC game from the generation project's cached output.
Each pair = one (case, model) with its TRIZ-on and TRIZ-off solution.

Run:  python scripts/build_pairs.py
"""
import json
import glob
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
# generation project sits next to this one
SRC = os.path.join(APP, "..", "triz-on-vs-off-agent")


def read_cfg(src):
    """Minimal read of `run` + `casebase` from the generator's config.yaml (no yaml dep)
    so we pair the right run's generations into pairs_<run>.json."""
    run, casebase = "main", "casebase.json"
    try:
        for line in open(os.path.join(src, "config.yaml")):
            line = line.split("#", 1)[0].strip()
            if line.startswith("run:"):
                run = line.split(":", 1)[1].strip()
            elif line.startswith("casebase:"):
                casebase = line.split(":", 1)[1].strip()
    except FileNotFoundError:
        pass
    return run, casebase

# "FINAL SOLUTION:" header, tolerating markdown heading (#) / bold (*) prefixes.
_FINAL_HEADER = re.compile(r"^[ \t#*>]*final\s+solution[ \t#*]*:?[ \t]*", re.IGNORECASE | re.MULTILINE)


def final_solution(text):
    """Extract only the FINAL SOLUTION section from a full generation output.
    Falls back to the whole text if the header is absent (empty -> empty)."""
    if not text:
        return ""
    m = _FINAL_HEADER.search(text)
    if not m:
        return text.strip()
    return re.sub(r"^[\s:*#>\-]+", "", text[m.end():]).strip()


def main():
    run, casebase = read_cfg(SRC)
    gen_paths = glob.glob(os.path.join(SRC, "data", run, "generations", "*.json"))
    if not gen_paths:
        raise SystemExit(f"No generations under {SRC}/data/{run}/generations/. Run the generator first.")

    cases = {c["id"]: c["problem_description"]
             for c in json.load(open(os.path.join(SRC, casebase)))["cases"]}

    groups = {}
    for p in gen_paths:
        g = json.load(open(p))
        # Re-extract the FINAL SOLUTION from the raw output (don't trust stored display).
        text = final_solution(g.get("output") or "")
        # Key by sample_idx too, so k>1 yields k matched pairs per (case, model)
        # instead of overwriting down to one. TRIZ sample i is matched to control
        # sample i (same stochastic slot).
        sidx = g.get("sample_idx", 0)
        groups.setdefault((g["case_id"], g["model"], sidx), {})[g["mode"]] = text

    pairs = []
    for (cid, model, sidx), modes in sorted(groups.items()):
        triz, control = modes.get("triz"), modes.get("control")
        if triz and control:
            pairs.append({
                "id": f"{cid}__{model.replace('/', '-')}__s{sidx}",
                "case_id": cid,
                "model": model,
                "sample_idx": sidx,
                "problem": cases[cid],
                "triz": triz.strip(),
                "control": control.strip(),
            })

    clean, dropped = [], []
    for p in pairs:
        issues = pair_issues(p)
        (dropped if issues else clean).append((p, issues))

    out = os.path.join(APP, "data", f"pairs_{run}.json")
    json.dump({"pairs": [p for p, _ in clean]}, open(out, "w"), indent=2, ensure_ascii=False)
    print(f"wrote {len(clean)} pairs -> {out}  (dropped {len(dropped)} on quality)")
    by_model = {}
    for p, _ in clean:
        by_model[p["model"]] = by_model.get(p["model"], 0) + 1
    for m, n in sorted(by_model.items()):
        print(f"  {m}: {n}")
    if dropped:
        print("\ndropped:")
        for p, issues in dropped:
            print(f"  - {p['id']}: {', '.join(issues)}")


def pair_issues(p):
    """Reasons a pair shouldn't be shown to raters: TRIZ jargon leaking into the
    visible solution, truncated (mid-sentence) text, or a too-short fragment."""
    import re
    jargon = re.compile(r"\b(contradiction|principle\s*\d|TRIZ|ideality|parameter\s*#?\d)\b", re.I)
    issues = []
    for arm in ("triz", "control"):
        t = p[arm]
        m = jargon.search(t)
        if m:
            issues.append(f"{arm}:jargon({m.group(0)})")
        if len(t.split()) < 50:
            issues.append(f"{arm}:short({len(t.split())}w)")
        if t.rstrip()[-1:] not in '.!?")':
            issues.append(f"{arm}:truncated")
    return issues


if __name__ == "__main__":
    main()
