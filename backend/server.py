from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import csv
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Annotated
from pydantic.functional_validators import BeforeValidator
import uuid
import math
from datetime import datetime, timezone

from biological_variation import BIOLOGICAL_VARIATION_DB, classify, build_specs, disambiguate

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="SigmaLab QC API")
api_router = APIRouter(prefix="/api")

PyObjectId = Annotated[str, BeforeValidator(str)]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def compute_metrics(tea: float, cv: float, bias: float):
    """Sigma = (TEa - |Bias|) / CV ; QGI = |Bias| / (1.5 * CV)."""
    b = abs(bias)
    sigma = round((tea - b) / cv, 2) if cv > 0 else 0.0
    qgi = round(b / (1.5 * cv), 2) if cv > 0 else 0.0
    return sigma, qgi


# ---------- Models ----------
class LabRecordBase(BaseModel):
    analyte: str
    category: Optional[str] = "Custom"
    matrix: Optional[str] = "Serum"
    instrument: str
    lot: Optional[str] = ""
    tea: float
    cv: float
    bias: float
    notes: Optional[str] = ""
    measured_at: Optional[str] = None


class LabRecordCreate(LabRecordBase):
    pass


class LabRecord(LabRecordBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sigma: float = 0.0
    qgi: float = 0.0
    created_at: str = Field(default_factory=now_iso)


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "SigmaLab QC API running"}


@api_router.get("/analytes")
async def get_analytes():
    custom = await db.custom_analytes.find({}, {"_id": 0}).to_list(5000)
    return disambiguate(BIOLOGICAL_VARIATION_DB + custom)


def _to_float(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", ".")
    if s in ("", "-", "---", "na", "n/a"):
        return None
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def _parse_rows(filename: str, content: bytes):
    """Return list of (matrix, name, tea, cvi, cvg) from an xlsx or csv file."""
    rows = []
    if filename.lower().endswith(".csv"):
        text = content.decode("utf-8-sig", errors="ignore")
        rows = [r for r in csv.reader(io.StringIO(text))]
    else:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
        ws = wb.active
        rows = [list(r) for r in ws.iter_rows(values_only=True)]

    if not rows:
        return []

    # Detect a header row and column positions
    header = [str(c or "").strip().lower() for c in rows[0]]

    def find(*keys):
        for i, h in enumerate(header):
            if any(k in h for k in keys):
                return i
        return None

    ci_name = find("anal", "test", "measurand", "parameter")
    ci_tea = find("tea", "te%", "allowable", "ea%")
    ci_matrix = find("matr", "matrix", "sample", "specimen")
    ci_cvi = find("cvi", "cv-i", "within")
    ci_cvg = find("cvg", "cv-g", "between")
    has_header = ci_name is not None or ci_tea is not None
    data = rows[1:] if has_header else rows

    if not has_header:
        # Assume positional: [matrix, name, tea] (like the reference files) or [name, tea]
        ncol = max((len(r) for r in rows), default=0)
        if ncol >= 3:
            ci_matrix, ci_name, ci_tea = 0, 1, 2
        else:
            ci_name, ci_tea = 0, 1

    out = []
    for r in data:
        def cell(i):
            return r[i] if (i is not None and i < len(r)) else None
        name = str(cell(ci_name) or "").strip()
        name = " ".join(name.split())
        if not name:
            continue
        out.append((
            str(cell(ci_matrix) or "Serum").strip() or "Serum",
            name,
            _to_float(cell(ci_tea)),
            _to_float(cell(ci_cvi)),
            _to_float(cell(ci_cvg)),
        ))
    return out


@api_router.post("/analytes/import")
async def import_analytes(file: UploadFile = File(...)):
    content = await file.read()
    try:
        parsed = _parse_rows(file.filename or "upload.xlsx", content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    docs = []
    for matrix, name, tea, cvi, cvg in parsed:
        category = classify(name)
        base = {
            "slug": "custom-" + uuid.uuid4().hex[:10],
            "name": name, "category": category, "matrix": matrix,
            "custom": True, "source": "Imported",
        }
        if cvi and cvg:
            specs, peer = build_specs(cvi, cvg)
            des = specs["desirable"]
            base.update({"cvi": cvi, "cvg": cvg, "specs": specs,
                         "desirable_cv": des["cv"], "desirable_bias": des["bias"],
                         "tea": des["tea"], "peer_sigma": peer, "detailed": True})
        else:
            base.update({"cvi": None, "cvg": None, "specs": None,
                         "desirable_cv": None, "desirable_bias": None,
                         "tea": tea, "peer_sigma": None, "detailed": False})
        docs.append(base)

    if docs:
        await db.custom_analytes.insert_many(docs)
    total = await db.custom_analytes.count_documents({})
    return {"imported": len(docs), "total_custom": total}


@api_router.delete("/analytes/custom")
async def clear_custom_analytes():
    res = await db.custom_analytes.delete_many({})
    return {"deleted": res.deleted_count}


def _record_from_create(payload: LabRecordCreate) -> LabRecord:
    sigma, qgi = compute_metrics(payload.tea, payload.cv, payload.bias)
    rec = LabRecord(**payload.model_dump(), sigma=sigma, qgi=qgi)
    if not rec.measured_at:
        rec.measured_at = now_iso()
    return rec


@api_router.post("/records", response_model=LabRecord)
async def create_record(payload: LabRecordCreate):
    rec = _record_from_create(payload)
    await db.lab_records.insert_one(rec.model_dump())
    return rec


@api_router.get("/records", response_model=List[LabRecord])
async def list_records(instrument: Optional[str] = None, analyte: Optional[str] = None):
    query = {}
    if instrument:
        query["instrument"] = instrument
    if analyte:
        query["analyte"] = analyte
    docs = await db.lab_records.find(query, {"_id": 0}).sort("measured_at", 1).to_list(2000)
    return docs


@api_router.put("/records/{record_id}", response_model=LabRecord)
async def update_record(record_id: str, payload: LabRecordCreate):
    existing = await db.lab_records.find_one({"id": record_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Record not found")
    sigma, qgi = compute_metrics(payload.tea, payload.cv, payload.bias)
    update = payload.model_dump()
    update.update({"sigma": sigma, "qgi": qgi})
    if not update.get("measured_at"):
        update["measured_at"] = existing.get("measured_at") or now_iso()
    await db.lab_records.update_one({"id": record_id}, {"$set": update})
    merged = {**existing, **update}
    return merged


@api_router.delete("/records/{record_id}")
async def delete_record(record_id: str):
    res = await db.lab_records.delete_one({"id": record_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"success": True}


SEED_RECORDS = [
    # analyte, category, matrix, instrument, tea, cv, bias, months_of_history
    ("Glucose", "Glycemic", "Serum", "Roche Cobas c502", 6.96, 1.4, 1.1),
    ("HbA1c", "Glycemic", "Whole Blood", "Tosoh G8", 3.07, 0.9, 0.6),
    ("Creatinine", "Renal", "Serum", "Beckman DxC 700", 9.71, 2.3, 1.9),
    ("Sodium", "Electrolytes", "Serum", "Roche Cobas c502", 0.73, 0.5, 0.4),
    ("Potassium", "Electrolytes", "Serum", "Roche Cobas c502", 5.61, 1.9, 1.5),
    ("Cholesterol (total)", "Lipids", "Serum", "Abbott Alinity c", 9.01, 1.6, 1.2),
    ("hs-Troponin I", "Cardiac / Inflammation", "Serum", "Abbott Alinity i", 15.66, 6.5, 4.8),
    ("TSH", "Endocrinology", "Serum", "Siemens Atellica IM", 24.05, 6.1, 4.0),
    ("ALT", "Enzymes", "Serum", "Beckman DxC 700", 24.32, 5.5, 3.2),
    ("Hemoglobin", "Hematology", "Whole Blood", "Sysmex XN-1000", 6.62, 1.1, 0.8),
]


async def seed_records_if_empty():
    count = await db.lab_records.count_documents({})
    if count > 0:
        return
    from datetime import timedelta
    base = datetime.now(timezone.utc)
    docs = []
    for analyte, category, matrix, instrument, tea, cv, bias, in [(r[0], r[1], r[2], r[3], r[4], r[5], r[6]) for r in SEED_RECORDS]:
        # create 4 months of history with slight variation
        for m in range(4):
            drift = 1 + (m - 1.5) * 0.06
            cvm = round(cv * drift, 2)
            biasm = round(bias * (1 + (1.5 - m) * 0.05), 2)
            sigma, qgi = compute_metrics(tea, cvm, biasm)
            when = (base - timedelta(days=30 * (3 - m))).isoformat()
            docs.append({
                "id": str(uuid.uuid4()),
                "analyte": analyte,
                "category": category,
                "matrix": matrix,
                "instrument": instrument,
                "lot": f"LOT-{2400 + m}",
                "tea": tea,
                "cv": cvm,
                "bias": biasm,
                "notes": "",
                "measured_at": when,
                "sigma": sigma,
                "qgi": qgi,
                "created_at": now_iso(),
            })
    if docs:
        await db.lab_records.insert_many(docs)


@api_router.post("/seed")
async def seed_endpoint():
    await seed_records_if_empty()
    count = await db.lab_records.count_documents({})
    return {"records": count}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    try:
        await seed_records_if_empty()
    except Exception as e:
        logger.error(f"Seed failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
