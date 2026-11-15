"""Tests de engine/quality.py con datos sintéticos corrompidos a propósito."""

import copy
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from engine.power import get_climate  # noqa: E402
from engine.quality import (  # noqa: E402
    MAX_IMPUTED_FRACTION,
    STUCK_RUN_DAYS,
    DataFormatError,
    clean_power,
    validate_elevation,
    validate_structure,
)

LAT = -16.36


def make_payload(years=(2010, 2011, 2012), seed=0) -> dict:
    """Clima plausible de Majes: estacional y con algo de ruido (nada se repite 15 días)."""
    rng = np.random.default_rng(seed)
    params = {p: {} for p in ("T2M_MAX", "T2M_MIN", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M", "PRECTOTCORR", "GWETROOT")}
    d = date(years[0], 1, 1)
    while d.year <= years[-1]:
        k = d.strftime("%Y%m%d")
        season = np.cos(2 * np.pi * (d.timetuple().tm_yday - 15) / 365)  # verano austral en enero
        params["T2M_MAX"][k] = round(24 + 3 * season + rng.normal(0, 0.8), 2)
        params["T2M_MIN"][k] = round(11 + 3 * season + rng.normal(0, 0.8), 2)
        params["ALLSKY_SFC_SW_DWN"][k] = round(23 + 5 * season + rng.normal(0, 1.0), 2)
        params["RH2M"][k] = round(55 + 8 * season + rng.normal(0, 3), 2)
        params["WS2M"][k] = round(2.5 + rng.normal(0, 0.3), 2)
        params["PRECTOTCORR"][k] = 0.0
        params["GWETROOT"][k] = round(0.35 + rng.normal(0, 0.01), 3)
        d += timedelta(days=1)
    return {"meta": {"lat": LAT, "lon": -72.19, "elevation": 1409.0, "start": years[0], "end": years[-1]}, "parameter": params}


def key(y, m, d):
    return f"{y}{m:02d}{d:02d}"


def idx(clean, y, m, d):
    return clean.dates.index(date(y, m, d))


# --- datos buenos ---


def test_datos_buenos_no_se_tocan():
    payload = make_payload()
    c = clean_power(payload)
    assert c.report.ok
    assert all(r.flagged == 0 for r in c.report.variables.values())
    assert c.series["T2M_MAX"][idx(c, 2011, 6, 1)] == payload["parameter"]["T2M_MAX"][key(2011, 6, 1)]
    assert len(c.dates) == 3 * 365  # sin 29 de febrero (2012 es bisiesto)


# --- formato ---


def test_estructura_invalida_se_rechaza():
    for bad in (None, [], {"meta": {}}, {"meta": {"lat": 0, "lon": 0, "elevation": 0}, "parameter": {}}):
        with pytest.raises(DataFormatError):
            validate_structure(bad)
    p = make_payload()
    del p["parameter"]["RH2M"]
    with pytest.raises(DataFormatError, match="RH2M"):
        clean_power(p)
    p = make_payload()
    p["meta"]["lat"] = "abc"
    with pytest.raises(DataFormatError, match="lat"):
        clean_power(p)


def test_tipos_erroneos_se_descartan_y_numeros_en_texto_se_aceptan():
    p = make_payload()
    t = p["parameter"]["T2M_MAX"]
    t[key(2011, 3, 1)] = "25.5"  # número como texto: válido
    t[key(2011, 3, 2)] = "abc"
    t[key(2011, 3, 3)] = None
    t[key(2011, 3, 4)] = True  # un booleano no es una temperatura
    t[key(2011, 3, 5)] = float("nan")
    c = clean_power(p)
    assert c.series["T2M_MAX"][idx(c, 2011, 3, 1)] == 25.5
    assert c.report.variables["T2M_MAX"].non_numeric == 4
    assert not np.isnan(c.series["T2M_MAX"]).any()  # los huecos se rellenaron


def test_claves_de_fecha_invalidas_y_fechas_faltantes():
    p = make_payload()
    for prm in p["parameter"].values():
        prm["2011-03-01"] = 1.0  # formato equivocado
        prm["20111340"] = 1.0  # mes 13
        del prm[key(2011, 4, 10)]
    c = clean_power(p)
    assert c.report.invalid_date_keys == 2
    assert c.report.missing_dates == 1
    assert len(c.dates) == 3 * 365


def test_centinela_y_fuera_de_rango():
    p = make_payload()
    p["parameter"]["T2M_MIN"][key(2011, 7, 1)] = -999
    p["parameter"]["RH2M"][key(2011, 7, 2)] = 150.0
    p["parameter"]["PRECTOTCORR"][key(2011, 7, 3)] = -5.0
    p["parameter"]["GWETROOT"][key(2011, 7, 4)] = 1.7
    c = clean_power(p)
    v = c.report.variables
    assert v["T2M_MIN"].missing == 1
    assert v["RH2M"].out_of_range == 1 and v["PRECTOTCORR"].out_of_range == 1 and v["GWETROOT"].out_of_range == 1
    assert 0 <= c.series["RH2M"][idx(c, 2011, 7, 2)] <= 100
    assert c.series["PRECTOTCORR"][idx(c, 2011, 7, 3)] >= 0


# --- falsos positivos ---


def test_pico_de_temperatura_no_crea_una_helada_falsa():
    p = make_payload()
    p["parameter"]["T2M_MIN"][key(2011, 2, 10)] = -6.0  # en rango físico, pero imposible en febrero en Majes
    c = clean_power(p)
    assert c.report.variables["T2M_MIN"].outliers == 1
    assert c.series["T2M_MIN"][idx(c, 2011, 2, 10)] > 5  # quedó interpolado con sus vecinos


def test_dia_nublado_real_no_se_descarta():
    p = make_payload()
    p["parameter"]["ALLSKY_SFC_SW_DWN"][key(2011, 7, 15)] = 8.0  # nublado: bajo pero posible
    c = clean_power(p)
    assert c.series["ALLSKY_SFC_SW_DWN"][idx(c, 2011, 7, 15)] == 8.0
    assert c.report.variables["ALLSKY_SFC_SW_DWN"].flagged == 0


def test_incoherencias_fisicas():
    p = make_payload()
    p["parameter"]["T2M_MIN"][key(2011, 5, 1)] = 30.0
    p["parameter"]["T2M_MAX"][key(2011, 5, 1)] = 20.0  # Tmin > Tmax
    p["parameter"]["ALLSKY_SFC_SW_DWN"][key(2011, 6, 21)] = 44.0  # más que Ra en el solsticio de invierno
    p["parameter"]["ALLSKY_SFC_SW_DWN"][key(2011, 6, 22)] = 0.1  # de día, prácticamente nada
    c = clean_power(p)
    assert c.report.variables["T2M_MIN"].inconsistent == 1
    assert c.report.variables["T2M_MAX"].inconsistent == 1
    assert c.report.variables["ALLSKY_SFC_SW_DWN"].inconsistent == 2
    i = idx(c, 2011, 5, 1)
    assert c.series["T2M_MIN"][i] < c.series["T2M_MAX"][i]


def test_valores_pegados():
    p = make_payload()
    d = date(2011, 9, 1)
    for _ in range(STUCK_RUN_DAYS + 5):
        p["parameter"]["WS2M"][d.strftime("%Y%m%d")] = 2.0
        d += timedelta(days=1)
    c = clean_power(p)
    assert c.report.variables["WS2M"].stuck == STUCK_RUN_DAYS + 5
    assert c.report.variables["WS2M"].climatology_filled == STUCK_RUN_DAYS + 5  # hueco largo → climatología


def test_lluvia_en_cero_no_cuenta_como_pegada():
    c = clean_power(make_payload())  # todo el año sin lluvia, como en Majes
    assert c.report.variables["PRECTOTCORR"].flagged == 0


# --- relleno y años poco confiables ---


def test_huecos_cortos_se_interpolan_y_largos_usan_climatologia():
    p = make_payload()
    for day in range(1, 4):  # 3 días
        p["parameter"]["T2M_MAX"][key(2011, 3, day)] = -999
    for day in range(1, 21):  # 20 días
        p["parameter"]["RH2M"][key(2011, 8, day)] = -999
    c = clean_power(p)
    assert c.report.variables["T2M_MAX"].interpolated == 3
    assert c.report.variables["RH2M"].climatology_filled == 20


def test_ano_con_demasiados_huecos_se_marca():
    p = make_payload()
    d = date(2011, 1, 1)
    for _ in range(int(365 * (MAX_IMPUTED_FRACTION + 0.05))):
        p["parameter"]["ALLSKY_SFC_SW_DWN"][d.strftime("%Y%m%d")] = -999
        d += timedelta(days=1)
    c = clean_power(p)
    assert c.report.bad_years == [2011]
    assert c.report.imputed_fraction_by_year[2010] == 0


def test_gwetroot_ausente_no_se_inventa():
    p = make_payload()
    del p["parameter"]["GWETROOT"]
    c = clean_power(p)
    assert c.series["GWETROOT"] is None
    assert c.report.absent_optional == ["GWETROOT"]


def test_opcional_sin_ningun_dato_valido_se_trata_como_ausente():
    # Sobre el mar o un lago POWER devuelve GWETROOT = -999 en todos los días
    p = make_payload()
    p["parameter"]["GWETROOT"] = {k: -999 for k in p["parameter"]["GWETROOT"]}
    c = clean_power(p)
    assert c.series["GWETROOT"] is None
    assert "GWETROOT" in c.report.absent_optional
    assert c.report.bad_years == []
    assert c.series["T2M_MAX"] is not None


def test_variable_sin_ningun_dato_valido_descarta_la_celda():
    p = make_payload()
    p["parameter"]["WS2M"] = {k: -999 for k in p["parameter"]["WS2M"]}
    with pytest.raises(DataFormatError):
        clean_power(p)


# --- SRTM ---


def test_elevacion():
    assert validate_elevation(1409) == 1409.0
    assert validate_elevation("1409.5") == 1409.5
    for bad in (None, "abc", float("nan"), 99999, -1000, True):
        assert validate_elevation(bad) is None


# --- integración con el motor ---


def test_cache_real_de_majes_pasa_sin_excluir_anos():
    c = get_climate(-16.36, -72.19, 2005, 2025, elevation_m=1409, live=False)
    assert c.excluded_years == []
    assert len(c.years) == 21
    assert all(q["bad_years"] == [] for q in c.quality)
    assert c.gwetroot is not None


def test_payload_no_se_modifica():
    p = make_payload()
    p["parameter"]["T2M_MIN"][key(2011, 7, 1)] = -999
    original = copy.deepcopy(p)
    clean_power(p)
    assert p == original
