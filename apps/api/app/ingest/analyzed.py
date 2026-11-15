"""PSI "Analyzed Data" files and adjacent PSI records, turned into seed data.

Sources (all saved unchanged under data/sources/psi/, SHA-256 in data/sources/official/MANIFEST.md):
- PSI-39 (CFI): one-page Igor summary plots per FLEX test. Their text is extracted once with `pdftotext -raw`
  into analyzed_text/<file>.txt (committed, so the seed build needs no poppler) and the labelled values
  (P, YO2, YN2, ..., D0, Dext, kavg, ...) are read from it.
- PSI-47 (DAFT): Excel workbooks with P-Trak / DustTrak instrument logs, bag summaries and a crew-day note.
- adjacent/PSI-108.json, adjacent/PSI-181.json: the two non-Combustion-Science hits of the official PSI search
  link. Listed as related records only; never seeded as investigations, counted, ranked or indexed.

Everything here is analyzed / derived data as listed by PSI. It is kept apart from experimental-table test runs.

Run `python -m app.ingest.analyzed --extract-text` to (re)write analyzed_text/ from the PDFs.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import statistics
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

from app.units import MMHG_KPA

STATUS = "psi_analyzed_data"
ANALYZED_PREFIX = "_Analyzed Data_"
MONTHS = {m: i for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}
# Free-text observations written on some CFI plots (matched verbatim; line breaks in the PDF are allowed).
CFI_OBSERVATIONS = [r"Visible hot-flame oscillations", r"Heavy soot\s+near droplet", r"Manual Cool Flame Extinction Measurement"]


def _sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def download_url(acc: str, file_name: str) -> str:
    return f"https://psi.nasa.gov/geode-py/ws/studies/{acc}/download?file={quote(file_name)}"


def _files(acc: str, src_dir: Path, suffixes: tuple[str, ...]) -> list[Path]:
    return sorted(p for p in (src_dir / "psi" / "analyzed").glob(f"{acc}{ANALYZED_PREFIX}*") if p.suffix.lower() in suffixes)


def _short(p: Path) -> str:
    return p.name.split(ANALYZED_PREFIX, 1)[1]


def _file_entry(acc: str, p: Path, status: str = "parsed", note: str | None = None) -> dict:
    return {"file_name": p.name, "short_name": _short(p), "local_path": f"data/sources/psi/analyzed/{p.name}",
            "url": download_url(acc, p.name), "sha256": _sha(p), "size_bytes": p.stat().st_size, "status": status,
            "note": note}


# ── PSI-39 CFI run summaries ──────────────────────────────────────────────────────────────────────────

def extract_text(src_dir: Path) -> list[str]:
    """Write analyzed_text/<pdf stem>.txt for every analyzed PDF. Returns the files that could not be read."""
    out_dir = src_dir / "psi" / "analyzed_text"
    out_dir.mkdir(exist_ok=True)
    failed = []
    for pdf in sorted((src_dir / "psi" / "analyzed").glob("*.pdf")):
        r = subprocess.run(["pdftotext", "-raw", str(pdf), str(out_dir / f"{pdf.stem}.txt")], capture_output=True)
        if r.returncode != 0:
            failed.append(pdf.name)
    return failed


def _num(pattern: str, text: str) -> str | None:
    m = re.search(pattern, text, flags=re.M)
    return m.group(1) if m else None


def _f(s: str | None) -> float | None:
    return float(s) if s is not None else None


def _cfi_table(src_dir: Path) -> dict[str, list[dict]]:
    """Flex Number -> CFI experimental-table records (CSV record numbers as used for test runs; record 1 = header)."""
    path = src_dir / "psi" / "experimental_tables" / "PSI-39_Experimental table_CFI.csv"
    rows = list(csv.reader(io.StringIO(path.read_bytes().decode("utf-8-sig"))))
    header = [h.strip() for h in rows[0]]
    out: dict[str, list[dict]] = {}
    for i, r in enumerate(rows[1:], start=2):
        if not any(c.strip() for c in r):
            continue
        row = dict(zip(header, (c.strip() for c in r)))
        out.setdefault(row.get("Flex Number", ""), []).append({"csv_record": i, "pressure": row.get("Pressure"),
                                                              "oxygen": row.get("Oxygen"), "fuel": row.get("Fuel")})
    return out


def parse_cfi_summary(text: str) -> dict:
    """Labelled values from one CFI summary plot. Values stay as printed (strings) next to parsed numbers."""
    date = re.search(r"\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})\b", text)
    fuel = re.search(r"^([A-Z][a-z]+ane)$", text, flags=re.M)
    vals = {
        "pressure_mmhg": _num(r"^P = ([\d.]+) mmHg", text),
        "y_o2": _num(r"^YO2 = ([\d.]+)", text), "y_n2": _num(r"^YN2 = ([\d.]+)", text),
        "y_co2": _num(r"^YCO2 = ([\d.]+)", text), "y_he": _num(r"^YHe = ([\d.]+)", text),
        "d0_mm": _num(r"^D0 = ([\d.]+) mm", text), "dext_mm": _num(r"^Dext = ([\d.]+) mm", text),
        "kavg_mm2_s": _num(r"^kavg = ([\d.]+) mm", text), "kavg_cool_mm2_s": _num(r"^kavg, cool = ([\d.]+) mm", text),
        "dext_cool_mm": _num(r"^Dext, cool = ([\d.]+) mm", text),
    }
    p = _f(vals["pressure_mmhg"])
    return {
        "flex_number": _num(r"\bFLEX-(\d{3,5})\b", text),
        "cir_point": _num(r"^(F\d{3}A\d{2})$", text),
        "test_date": f"{date.group(3)}-{MONTHS[date.group(1)]:02d}-{int(date.group(2)):02d}" if date else None,
        "fuel": fuel.group(1) if fuel else None,
        "values_as_printed": {k: v for k, v in vals.items() if v is not None},
        "pressure_kpa": round(p * MMHG_KPA, 2) if p is not None else None,
        "oxygen_pct": round(float(vals["y_o2"]) * 100, 1) if vals["y_o2"] else None,
        "observations": [re.sub(r"\s+", " ", m.group(0)) for pat in CFI_OBSERVATIONS for m in [re.search(pat, text)] if m],
    }


def cfi_summaries(src_dir: Path) -> tuple[list[dict], list[dict]]:
    table = _cfi_table(src_dir)
    summaries, files = [], []
    for pdf in _files("PSI-39", src_dir, (".pdf",)):
        txt_path = src_dir / "psi" / "analyzed_text" / f"{pdf.stem}.txt"
        text = txt_path.read_text(errors="replace") if txt_path.exists() else ""
        s = parse_cfi_summary(text) if text.strip() else None
        if not s or not s["flex_number"]:
            files.append(_file_entry("PSI-39", pdf, "unreadable", "The file stored in PSI is not a readable PDF "
                                     "(its size matches the PSI listing). Open it on PSI to check."))
            continue
        files.append(_file_entry("PSI-39", pdf))
        name = _short(pdf)
        kind = "preliminary" if re.search(r"prelim", name, flags=re.I) else "summary"
        s.update({"id": pdf.stem.split(ANALYZED_PREFIX)[1].replace(" ", "_"), "file_name": pdf.name, "kind": kind,
                  "url": download_url("PSI-39", pdf.name), "local_text_path": f"data/sources/psi/analyzed_text/{txt_path.name}",
                  "cfi_table_records": table.get(s["flex_number"], [])})
        summaries.append(s)
    summaries.sort(key=lambda s: (int(s["flex_number"]), s["file_name"]))
    return summaries, files


# ── PSI-47 DAFT workbooks ─────────────────────────────────────────────────────────────────────────────

_HDR = re.compile(r"^(Instrument|SerialNumber|TestID|GMT|StartDate|StartTime|Units|Number of points):\s*(.*?)\s*$")


def _logs_in_sheet(sh) -> list[dict]:
    """Instrument logs: a column holding 'Instrument: ...' followed by header cells, then the readings below."""
    out = []
    for c in range(sh.ncols):
        for r in range(sh.nrows):
            v = sh.cell_value(r, c)
            if not (isinstance(v, str) and v.startswith("Instrument:")):
                continue
            hdr, rr = {}, r
            while rr < sh.nrows:
                cell = sh.cell_value(rr, c)
                m = _HDR.match(cell) if isinstance(cell, str) else None
                if not m:
                    break
                hdr[m.group(1)] = m.group(2)
                rr += 1
            vals = []
            while rr < sh.nrows and isinstance(sh.cell_value(rr, c), float):
                vals.append(sh.cell_value(rr, c))
                rr += 1
            if vals:
                out.append({**hdr, "values": vals, "sheet": sh.name})
    return out


def _daft_log(entry: dict, files: list[str]) -> dict:
    v = entry["values"]
    return {"instrument": entry.get("Instrument"), "serial_number": entry.get("SerialNumber"), "test_id": entry.get("TestID"),
            "gmt": entry.get("GMT"), "start_date": entry.get("StartDate"), "start_time": entry.get("StartTime"),
            "units": entry.get("Units"), "points_listed": entry.get("Number of points"), "n_values": len(v),
            "min": min(v), "median": statistics.median(v), "mean": round(statistics.fmean(v), 4), "max": max(v),
            "sheet": entry["sheet"], "files": files}


def _bag_summary(sh) -> list[dict]:
    """'Logged Data Summary' sheet: per-bag averages and the derived particle diameter, as labelled in the sheet."""
    bags = [str(sh.cell_value(0, c)).strip() for c in range(sh.ncols) if str(sh.cell_value(0, c)).strip()]
    rows = {str(sh.cell_value(r, 0)).strip(): [sh.cell_value(r, c) for c in range(1, sh.ncols)] for r in range(sh.nrows)}
    avg = [x for x in rows.get("average**", []) if isinstance(x, float)]
    diam = [x for x in rows.get("D (micon)", []) if isinstance(x, float)]
    out = []
    for i, bag in enumerate(bags):
        out.append({"bag": bag, "ptrak_avg_n_cm3": round(avg[2 * i], 1) if len(avg) > 2 * i else None,
                    "dusttrak_avg_mg_m3": round(avg[2 * i + 1], 2) if len(avg) > 2 * i + 1 else None,
                    "derived_diameter_um": round(diam[i], 3) if len(diam) > i else None})
    return out


def daft_data(src_dir: Path) -> tuple[dict, list[dict]]:
    import xlrd

    logs: dict[tuple, dict] = {}
    files, notes, bags, extra = [], [], [], {}
    for p in _files("PSI-47", src_dir, (".xls",)):
        try:
            book = xlrd.open_workbook(str(p))
        except Exception as e:  # noqa: BLE001 - report, never guess
            files.append(_file_entry("PSI-47", p, "unreadable", f"Could not open workbook: {type(e).__name__}"))
            continue
        files.append(_file_entry("PSI-47", p))
        for sh in book.sheets():
            for e in _logs_in_sheet(sh):
                key = (e.get("Instrument"), e.get("SerialNumber"), e.get("TestID"), e.get("GMT"), len(e["values"]))
                logs.setdefault(key, {**e, "files": []})["files"].append(p.name)
            if sh.name == "text" and sh.nrows and isinstance(sh.cell_value(0, 0), str):
                notes.append({"text": re.sub(r"\s+", " ", sh.cell_value(0, 0)).strip(), "file": p.name, "sheet": sh.name,
                              "url": download_url("PSI-47", p.name)})
            if sh.name == "Logged Data Summary" and not bags:
                bags = _bag_summary(sh)
                rows = {str(sh.cell_value(r, 0)).strip(): sh.cell_value(r, 1) for r in range(sh.nrows)}
                extra = {"average_diameter_um": rows.get("Average D (micron)"), "ratio_0g_to_1g_diameter": rows.get("0gD/1gD"),
                         "source_file": p.name, "url": download_url("PSI-47", p.name), "sheet": sh.name}
            if sh.name in ("Headers", "P-Trak vs. DustTrak Data"):  # analyst comments written in the sheet
                for r in range(sh.nrows):
                    for c in range(sh.ncols):
                        v = sh.cell_value(r, c)
                        if isinstance(v, str) and len(v.strip()) >= 25:
                            notes.append({"text": re.sub(r"\s+", " ", v.strip(" *")), "file": p.name, "sheet": sh.name,
                                          "url": download_url("PSI-47", p.name)})
            if sh.name == "Data" and sh.nrows > 1 and str(sh.cell_value(0, 0)).startswith("DAFT"):
                notes.append({"text": " ".join(str(sh.cell_value(r, 0)).strip() for r in range(2) if sh.cell_value(r, 0)),
                              "file": p.name, "sheet": sh.name, "url": download_url("PSI-47", p.name)})
    out_logs = sorted((_daft_log(e, sorted(set(e["files"]))) for e in logs.values()),
                      key=lambda x: (x["start_date"] or "", x["start_time"] or "", x["instrument"] or ""))
    return {"instrument_logs": out_logs, "bag_summary": bags,
            "bag_summary_derived": {k: (round(v, 3) if isinstance(v, float) else v) for k, v in extra.items()},
            "notes": notes}, files


# ── seed blocks ───────────────────────────────────────────────────────────────────────────────────────

ANALYZED_NOTE = ("Analyzed / derived data files as stored in PSI, kept separate from the experimental-table test runs. "
                 "Values are shown as printed in the file.")


def analyzed_block(acc: str, src_dir: Path) -> dict | None:
    if acc == "PSI-39":
        summaries, files = cfi_summaries(src_dir)
        return {"kind": "cfi_run_summaries", "label": "CFI run summary plots (PSI Analyzed Data)", "note": ANALYZED_NOTE +
                " Each file is a one-page plot for one FLEX test number; the numbers come from the plot's legend. "
                "kavg is the average burning-rate constant (mm²/s). Preliminary versions are kept and marked.",
                "cfi_run_summaries": summaries, "files": files, "verification_status": STATUS}
    if acc == "PSI-47":
        data, files = daft_data(src_dir)
        return {"kind": "daft_logs", "label": "DAFT instrument logs (PSI Analyzed Data)", "note": ANALYZED_NOTE +
                " DAFT tested particle counters (TSI P-Trak, DustTrak) aboard the ISS for the SAME smoke experiment. "
                "These are air-sampling readings, not fire tests. Logs repeated across workbooks are listed once.",
                **data, "files": files, "verification_status": STATUS}
    return None


_CFI_LEGEND = [("pressure_mmhg", "P", "mmHg"), ("y_o2", "YO2", ""), ("y_n2", "YN2", ""), ("y_co2", "YCO2", ""),
               ("y_he", "YHe", ""), ("d0_mm", "D0", "mm"), ("dext_mm", "Dext", "mm"), ("kavg_mm2_s", "kavg", "mm²/s"),
               ("kavg_cool_mm2_s", "kavg, cool", "mm²/s"), ("dext_cool_mm", "Dext, cool", "mm")]


def _g(x: float) -> str:
    return f"{x:g}"


def chunk_specs(acronym: str, block: dict | None) -> list[dict]:
    """Search-index chunks for one investigation's analyzed data: {file_name, text, section, locator, url}."""
    if not block:
        return []
    out = []
    for s in block.get("cfi_run_summaries", []):
        v = s["values_as_printed"]
        legend = "; ".join(f"{lab} = {v[k]}{(' ' + u) if u else ''}" for k, lab, u in _CFI_LEGEND if k in v)
        rec = s["cfi_table_records"]
        match = (f" Same FLEX number as CFI experimental table CSV record(s) {', '.join(str(r['csv_record']) for r in rec)}."
                 if rec else " This FLEX number is not in the PSI CFI experimental table.")
        obs = f" Note on plot: {'; '.join(s['observations'])}." if s["observations"] else ""
        kind = " Preliminary version." if s["kind"] == "preliminary" else ""
        out.append({"file_name": s["file_name"], "section": f"Analyzed data: run summary FLEX-{s['flex_number']}",
                    "locator": f"{s['file_name'].split(ANALYZED_PREFIX)[1]}, plot legend", "url": s["url"],
                    "text": (f"[{acronym} analyzed run summary, FLEX-{s['flex_number']}, {s['test_date']}] "
                             f"{s['fuel']} droplet. {legend}"
                             + (f" (pressure ≈ {_g(s['pressure_kpa'])} kPa)" if s.get("pressure_kpa") else "")
                             + f".{match}{obs}{kind}")})
    for lg in block.get("instrument_logs", []):
        out.append({"file_name": lg["files"][0], "section": f"Analyzed data: {lg['instrument']} log, test {lg['test_id']}",
                    "locator": f"sheet {lg['sheet']}", "url": download_url("PSI-47", lg["files"][0]),
                    "text": (f"[{acronym} analyzed data, {lg['instrument']} test {lg['test_id']}, GMT {lg['gmt']}] "
                             f"{lg['n_values']} readings in {lg['units']}: min {_g(lg['min'])}, median {_g(lg['median'])}, "
                             f"mean {_g(lg['mean'])}, max {_g(lg['max'])}. Instrument serial {lg['serial_number']}; "
                             f"logger start {lg['start_date']} {lg['start_time']}.")})
    bags = block.get("bag_summary") or []
    if bags:
        der = block.get("bag_summary_derived") or {}
        parts = [f"{b['bag']}: P-Trak average {_g(b['ptrak_avg_n_cm3'])} n/cm3, DustTrak average {_g(b['dusttrak_avg_mg_m3'])} mg/m3, "
                 f"derived diameter {_g(b['derived_diameter_um'])} µm" for b in bags]
        extra = (f" Average D (micron) = {_g(der['average_diameter_um'])}; 0gD/1gD = {_g(der['ratio_0g_to_1g_diameter'])}."
                 if der.get("average_diameter_um") else "")
        out.append({"file_name": der.get("source_file") or block["files"][0]["file_name"],
                    "section": "Analyzed data: DAFT bag summary", "locator": f"sheet {der.get('sheet', 'Logged Data Summary')}",
                    "url": der.get("url") or block["files"][0]["url"],
                    "text": f"[{acronym} analyzed data, logged bag summary] " + "; ".join(parts) + "." + extra})
    for n in block.get("notes", []):
        out.append({"file_name": n["file"], "section": "Analyzed data: note in workbook", "locator": f"sheet {n['sheet']}",
                    "url": n["url"], "text": f"[{acronym} analyzed data, note] {n['text']}"})
    return out


def adjacent_records(src_dir: Path) -> list[dict]:
    out = []
    for p in sorted((src_dir / "psi" / "adjacent").glob("PSI-*.json")):
        d = json.loads(p.read_text())
        impacts = re.sub(r"\s+", " ", d.get("researchImpacts") or "")
        why = next((s.strip() for s in re.split(r"(?<=[.;])\s+|,\s+(?=\((?:i{1,3}|iv|v)\)\s)", impacts) if re.search(r"combustion", s, flags=re.I)), None)
        acc = d.get("accession") or p.stem
        out.append({"accession": acc, "acronym": d.get("investigationAcronym") or None,
                    "title": re.sub(r"\s+", " ", d.get("title") or "").strip(), "research_area": d.get("researchArea"),
                    "project_type": d.get("projectType"), "release_date": d.get("releaseDate"),
                    "why_listed": why, "why_field": "researchImpacts",
                    "url": f"https://psi.nasa.gov/physci/repo/data/investigations/{acc}",
                    "raw_source_path": f"data/sources/psi/adjacent/{p.name}", "raw_source_sha256": _sha(p)})
    return out


if __name__ == "__main__":
    from app.config import settings

    if "--extract-text" in sys.argv:
        bad = extract_text(settings.data_dir / "sources")
        print("unreadable:", bad or "none")
