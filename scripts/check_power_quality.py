"""Reporte de calidad de las celdas NASA POWER en caché (repo y carpeta temporal).

Uso: python scripts/check_power_quality.py [--json]
Sale con código 1 si alguna celda falla la validación o tiene años excluidos.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from engine.power import CACHE_DIR, TMP_DIR  # noqa: E402
from engine.quality import DataFormatError, clean_power  # noqa: E402

COLUMNS = ("non_numeric", "missing", "out_of_range", "inconsistent", "stuck", "outliers", "interpolated", "climatology_filled")


def main() -> int:
    as_json = "--json" in sys.argv
    files = sorted(CACHE_DIR.glob("*.json")) + sorted(TMP_DIR.glob("*.json"))
    problems, out = 0, []
    for path in files:
        try:
            report = clean_power(json.loads(path.read_text(encoding="utf-8"))).report
        except (DataFormatError, ValueError) as e:
            problems += 1
            out.append({"file": path.name, "error": str(e)})
            if not as_json:
                print(f"✗ {path.name}: {e}")
            continue
        problems += bool(report.bad_years)
        out.append({"file": path.name, **report.summary()})
        if as_json:
            continue
        status = "✓" if report.ok else "!"
        print(f"{status} {path.name}  {report.first} → {report.last}  ({report.days} días, {report.missing_dates} fechas faltantes)")
        print("   " + "".join(f"{c[:12]:>13}" for c in COLUMNS) + "   variable")
        for var, r in report.variables.items():
            print("   " + "".join(f"{getattr(r, c):>13}" for c in COLUMNS) + f"   {var}")
        if report.absent_optional:
            print(f"   ausentes (opcionales): {', '.join(report.absent_optional)}")
        if report.bad_years:
            print(f"   años excluidos: {report.bad_years}")
        for w in report.warnings:
            print(f"   aviso: {w}")
    if as_json:
        print(json.dumps(out, ensure_ascii=False, indent=1))
    else:
        print(f"\n{len(files)} celdas revisadas, {problems} con problemas")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
