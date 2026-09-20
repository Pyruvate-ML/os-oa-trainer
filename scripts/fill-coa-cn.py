#!/usr/bin/env python3
import json
import os
import re
import ssl
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHAPTER_DIR = ROOT / "data" / "chapters"
CACHE_FILE = ROOT / ".cache" / "coa_translate_cache.json"

TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
SSL_CONTEXT = ssl._create_unverified_context()

TERM_REPLACEMENTS = [
    (r"\bComputer organization\b", "计算机组成"),
    (r"\bcomputer organization\b", "计算机组成"),
    (r"\bComputer architecture\b", "计算机体系结构"),
    (r"\bcomputer architecture\b", "计算机体系结构"),
    (r"\bCPU\b", "CPU"),
    (r"\bALU\b", "ALU"),
    (r"\bControl Unit\b", "控制单元"),
    (r"\bcontrol unit\b", "控制单元"),
    (r"\bmain memory\b", "主存储器"),
    (r"\bMain memory\b", "主存储器"),
    (r"\binstruction cycle\b", "指令周期"),
    (r"\bInstruction cycle\b", "指令周期"),
    (r"\beffective address\b", "有效地址"),
    (r"\bEffective address\b", "有效地址"),
    (r"\barithmetic logic unit\b", "算术逻辑单元"),
    (r"\bArithmetic logic unit\b", "算术逻辑单元"),
    (r"\bprogram counter\b", "程序计数器"),
    (r"\bProgram Counter\b", "程序计数器"),
    (r"\binstruction register\b", "指令寄存器"),
    (r"\bInstruction Register\b", "指令寄存器"),
    (r"\bmemory address register\b", "存储器地址寄存器"),
    (r"\bMemory Address Register\b", "存储器地址寄存器"),
    (r"\bflag register\b", "标志寄存器"),
    (r"\bFlag Register\b", "标志寄存器"),
    (r"\bcontrol storage\b", "控制存储器"),
    (r"\bControl storage\b", "控制存储器"),
    (r"\bCache\b", "Cache"),
    (r"\bcache\b", "Cache"),
    (r"\bbus\b", "总线"),
    (r"\bBus\b", "总线"),
    (r"\bword length\b", "字长"),
    (r"\bWord length\b", "字长"),
]


def load_cache():
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    return {}


def save_cache(cache):
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize_spaces(text):
    return re.sub(r"\s+", " ", str(text or "")).strip()


def fix_terms(text):
    result = normalize_spaces(text)
    result = result.replace("以下哪项陈述", "下列说法")
    result = result.replace("以下哪项说法", "下列说法")
    result = result.replace("正确吗？", "是否正确？")
    result = result.replace("真/假", "判断")
    for pattern, repl in TERM_REPLACEMENTS:
        result = re.sub(pattern, repl, result)
    return result


def translate_text(text, cache):
    source = normalize_spaces(text)
    if not source:
        return ""
    if source in cache:
        return cache[source]

    params = {
        "client": "gtx",
        "sl": "en",
        "tl": "zh-CN",
        "dt": "t",
        "q": source,
    }
    url = f"{TRANSLATE_URL}?{urllib.parse.urlencode(params)}"
    last_error = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, context=SSL_CONTEXT, timeout=20) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            translated = "".join(part[0] for part in payload[0] if part and part[0])
            translated = fix_terms(translated)
            cache[source] = translated
            time.sleep(0.08)
            return translated
        except urllib.error.HTTPError as err:
            last_error = err
            time.sleep(1.5 * (attempt + 1))
        except Exception as err:
            last_error = err
            time.sleep(1.5 * (attempt + 1))
    raise last_error


def process_file(path, cache):
    data = json.loads(path.read_text(encoding="utf-8"))
    changed = False

    for q in data.get("mcq", []):
        if not q.get("stemCn") and q.get("stemEn"):
            q["stemCn"] = translate_text(q["stemEn"], cache)
            changed = True
        for opt in q.get("options", []):
            if not opt.get("textCn") and opt.get("textEn"):
                opt["textCn"] = translate_text(opt["textEn"], cache)
                changed = True

    for q in data.get("tf", []):
        if not q.get("stemCn") and q.get("stemEn"):
            q["stemCn"] = translate_text(q["stemEn"], cache)
            changed = True

    if changed:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed, len(data.get("mcq", [])), len(data.get("tf", []))


def main():
    cache = load_cache()
    files = sorted(CHAPTER_DIR.glob("coa-ch*-oa.json"))
    changed_files = 0
    mcq_total = 0
    tf_total = 0

    for path in files:
        changed, mcq_count, tf_count = process_file(path, cache)
        mcq_total += mcq_count
        tf_total += tf_count
        if changed:
            changed_files += 1
            print(f"{path.name}: updated")
            save_cache(cache)
        else:
            print(f"{path.name}: no change")

    save_cache(cache)
    print(f"done: files={len(files)}, changed={changed_files}, mcq={mcq_total}, tf={tf_total}, cache={len(cache)}")


if __name__ == "__main__":
    main()
