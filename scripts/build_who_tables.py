"""
Descarga y convierte las tablas oficiales LMS de los Patrones de Crecimiento
Infantil de la OMS (2006) desde el repositorio oficial worldhealthorganization/anthro
a estructuras JSON indexadas en O(1) para src/assets/who/.

Uso:
    python scripts/build_who_tables.py
"""

from __future__ import annotations

import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE_URL = (
    "https://raw.githubusercontent.com/worldhealthorganization/anthro/"
    "master/data-raw/growthstandards/"
)

FILES = {
    "weianthro": "weianthro.txt",
    "lenanthro": "lenanthro.txt",
    "wflanthro": "wflanthro.txt",
    "wfhanthro": "wfhanthro.txt",
    "hcanthro": "hcanthro.txt",
    "bmianthro": "bmianthro.txt",
}

ROOT_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT_DIR / "src" / "assets" / "who"


def fetch_file(filename: str) -> bytes:
    url = BASE_URL + filename
    req = urllib.request.Request(url, headers={"User-Agent": "ESCOM-Anthro-Builder/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def parse_age_table(raw_text: str) -> dict[str, list[list[float]]]:
    """Devuelve { 'M': [[l,m,s], ...], 'F': [[l,m,s], ...] } indexado por día 0..1826."""
    lines = raw_text.strip().splitlines()
    rows_by_sex: dict[str, dict[int, list[float]]] = {"M": {}, "F": {}}

    for line in lines[1:]:
        parts = line.split("\t")
        sex_code = "M" if parts[0] == "1" else "F"
        age_days = int(parts[1])
        l_val = float(parts[2])
        m_val = float(parts[3])
        s_val = float(parts[4])
        rows_by_sex[sex_code][age_days] = [l_val, m_val, s_val]

    result: dict[str, list[list[float]]] = {}
    for sex_code in ("M", "F"):
        max_day = max(rows_by_sex[sex_code].keys())
        expected = list(range(0, max_day + 1))
        if sorted(rows_by_sex[sex_code].keys()) != expected:
            raise ValueError(f"Días faltantes en tabla para sexo {sex_code}")
        result[sex_code] = [rows_by_sex[sex_code][d] for d in expected]
    return result


def parse_lenhei_table(
    raw_text: str, min_cm: float, max_cm: float
) -> dict[str, list[list[float]]]:
    """Devuelve { 'M': [[l,m,s], ...], 'F': [[l,m,s], ...] } indexado por paso 0.1 cm."""
    lines = raw_text.strip().splitlines()
    rows_by_sex: dict[str, dict[int, list[float]]] = {"M": {}, "F": {}}

    for line in lines[1:]:
        parts = line.split("\t")
        sex_code = "M" if parts[0] == "1" else "F"
        axis_tenths = round(float(parts[1]) * 10)
        l_val = float(parts[2])
        m_val = float(parts[3])
        s_val = float(parts[4])
        rows_by_sex[sex_code][axis_tenths] = [l_val, m_val, s_val]

    start_tenths = round(min_cm * 10)
    end_tenths = round(max_cm * 10)
    expected = list(range(start_tenths, end_tenths + 1))

    result: dict[str, list[list[float]]] = {}
    for sex_code in ("M", "F"):
        if sorted(rows_by_sex[sex_code].keys()) != expected:
            raise ValueError(f"Pasos de 0.1 cm faltantes en tabla para sexo {sex_code}")
        result[sex_code] = [rows_by_sex[sex_code][t] for t in expected]
    return result


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    hasher = hashlib.sha256()
    raw_contents: dict[str, str] = {}

    for key, filename in sorted(FILES.items()):
        print(f"Descargando {filename}...")
        raw_bytes = fetch_file(filename)
        hasher.update(filename.encode("utf-8"))
        hasher.update(raw_bytes)
        raw_contents[key] = raw_bytes.decode("utf-8")

    bundle = {
        "P_E": parse_age_table(raw_contents["weianthro"]),
        "T_E": parse_age_table(raw_contents["lenanthro"]),
        "PC_E": parse_age_table(raw_contents["hcanthro"]),
        "IMC_E": parse_age_table(raw_contents["bmianthro"]),
        "P_T_LONGITUD": {
            "minCm": 45.0,
            "maxCm": 110.0,
            "stepCm": 0.1,
            "data": parse_lenhei_table(raw_contents["wflanthro"], 45.0, 110.0),
        },
        "P_T_TALLA": {
            "minCm": 65.0,
            "maxCm": 120.0,
            "stepCm": 0.1,
            "data": parse_lenhei_table(raw_contents["wfhanthro"], 65.0, 120.0),
        },
    }

    tables_path = OUT_DIR / "oms_2006_lms.json"
    tables_path.write_text(
        json.dumps(bundle, separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )

    conjunto_meta = {
        "id_conjunto": "OMS_2006_V1",
        "version": "WHO Child Growth Standards 2006 (anthro master)",
        "fuente_url": "https://github.com/worldhealthorganization/anthro/tree/master/data-raw/growthstandards",
        "hash_archivos": hasher.hexdigest(),
        "fecha_importacion": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    meta_path = OUT_DIR / "conjunto_oms.json"
    meta_path.write_text(
        json.dumps(conjunto_meta, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    size_kb = tables_path.stat().st_size / 1024
    print(f"Generado {tables_path} ({size_kb:.1f} KB)")
    print(f"SHA-256 fuentes OMS: {conjunto_meta['hash_archivos']}")


if __name__ == "__main__":
    main()
