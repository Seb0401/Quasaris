"""Evapotranspiración de referencia (ET0), FAO-56.

- Penman-Monteith diario (ecuación 6), con radiación neta según FAO-56 cap. 3.
- Hargreaves (ecuación 52) como respaldo cuando falta radiación.
Todas las funciones aceptan arrays de numpy (vectorizado por día).
"""

from __future__ import annotations

import numpy as np

SIGMA = 4.903e-9  # MJ K⁻⁴ m⁻² día⁻¹
ALBEDO = 0.23


def sat_vp(t):
    """Presión de vapor de saturación e°(T) [kPa] (ec. 11)."""
    return 0.6108 * np.exp(17.27 * t / (t + 237.3))


def extraterrestrial_radiation(lat_deg: float, doy):
    """Ra [MJ m⁻² día⁻¹] (ec. 21)."""
    phi = np.deg2rad(lat_deg)
    j = np.asarray(doy, dtype=float)
    dr = 1 + 0.033 * np.cos(2 * np.pi * j / 365)
    delta = 0.409 * np.sin(2 * np.pi * j / 365 - 1.39)
    ws = np.arccos(np.clip(-np.tan(phi) * np.tan(delta), -1, 1))
    return 24 * 60 / np.pi * 0.0820 * dr * (ws * np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.sin(ws))


def penman_monteith(tmax, tmin, rs, u2, lat_deg: float, elevation_m: float, doy, rh=None, ea=None):
    """ET0 [mm/día]. Usa `ea` si se da; si no, la estima con la humedad relativa media (ec. 19)."""
    tmax, tmin, rs, u2 = (np.asarray(x, dtype=float) for x in (tmax, tmin, rs, u2))
    tmean = (tmax + tmin) / 2
    p = 101.3 * ((293 - 0.0065 * elevation_m) / 293) ** 5.26  # ec. 7
    gamma = 0.000665 * p  # ec. 8
    delta = 4098 * sat_vp(tmean) / (tmean + 237.3) ** 2  # ec. 13
    es = (sat_vp(tmax) + sat_vp(tmin)) / 2
    if ea is None:
        if rh is None:
            raise ValueError("se necesita rh o ea")
        ea = np.asarray(rh, dtype=float) / 100 * es
    ea = np.asarray(ea, dtype=float)

    ra = extraterrestrial_radiation(lat_deg, doy)
    rso = (0.75 + 2e-5 * elevation_m) * ra  # ec. 37
    rns = (1 - ALBEDO) * rs  # ec. 38
    ratio = np.clip(np.divide(rs, rso, out=np.ones_like(rs), where=rso > 0), 0.3, 1.0)
    rnl = SIGMA * ((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2 * (0.34 - 0.14 * np.sqrt(ea)) * (1.35 * ratio - 0.35)  # ec. 39
    rn = rns - rnl
    g = 0.0  # flujo de calor del suelo ≈ 0 a escala diaria

    num = 0.408 * delta * (rn - g) + gamma * 900 / (tmean + 273) * u2 * (es - ea)
    den = delta + gamma * (1 + 0.34 * u2)
    return np.maximum(num / den, 0.0)


def hargreaves(tmax, tmin, lat_deg: float, doy):
    """ET0 [mm/día] por Hargreaves (ec. 52). Respaldo sin radiación ni viento."""
    tmax, tmin = np.asarray(tmax, dtype=float), np.asarray(tmin, dtype=float)
    ra_mm = 0.408 * extraterrestrial_radiation(lat_deg, doy)
    return np.maximum(0.0023 * ((tmax + tmin) / 2 + 17.8) * np.sqrt(np.maximum(tmax - tmin, 0)) * ra_mm, 0.0)
