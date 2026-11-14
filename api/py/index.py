"""Motor de FarmTwin expuesto como FastAPI (función Python en Vercel).

Todas las rutas /api/py/* llegan aquí (rewrite en vercel.json).
Local: npm run dev:py  (uvicorn en :8000; Next reenvía /api/py/* en desarrollo).
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException, Query  # noqa: E402
from fastapi.middleware.gzip import GZipMiddleware  # noqa: E402

from engine import simulate as engine  # noqa: E402
from engine.schema import ClimateResponse, SimulateRequest, SimulateResponse  # noqa: E402

app = FastAPI(title="FarmTwin engine", docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.get("/api/py/health")
def health():
    return {"ok": True, "engine": "farmtwin", "python": sys.version.split()[0]}


@app.post("/api/py/simulate", response_model=SimulateResponse, response_model_exclude_none=True)
def simulate(req: SimulateRequest):
    try:
        return engine.run(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except LookupError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@app.get("/api/py/climate", response_model=ClimateResponse)
def climate(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180)):
    try:
        return engine.climate_weeks(lat, lon)
    except LookupError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
