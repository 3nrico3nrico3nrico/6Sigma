"""Backend API tests for SigmaLab QC."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://quality-analysis-six.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# --- Analytes ---
def test_analytes_list(s):
    r = s.get(f"{API}/analytes", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 40, f"Expected ~49 analytes, got {len(data)}"
    a = data[0]
    for k in ("name", "category", "matrix", "cvi", "cvg", "desirable_cv", "desirable_bias", "tea"):
        assert k in a, f"missing key {k}"


# --- Records list (seed) ---
def test_records_seeded(s):
    r = s.get(f"{API}/records", timeout=30)
    assert r.status_code == 200
    recs = r.json()
    assert isinstance(recs, list)
    assert len(recs) >= 40, f"Expected 40 seeded records, got {len(recs)}"


# --- Create record + compute check ---
def test_create_record_computes_sigma_qgi(s):
    payload = {
        "analyte": "TEST_Glucose", "category": "Glycemic", "matrix": "Serum",
        "instrument": "TEST_Instrument", "lot": "TEST-1",
        "tea": 6.96, "cv": 1.4, "bias": 1.1, "notes": "test"
    }
    r = s.post(f"{API}/records", json=payload, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["sigma"] == 4.19, f"sigma={d['sigma']}"
    assert d["qgi"] == 0.52, f"qgi={d['qgi']}"
    assert "id" in d
    pytest.record_id = d["id"]

    # verify persisted
    r2 = s.get(f"{API}/records", timeout=30)
    ids = [x["id"] for x in r2.json()]
    assert d["id"] in ids


def test_update_record(s):
    rid = getattr(pytest, "record_id", None)
    assert rid
    payload = {
        "analyte": "TEST_Glucose", "category": "Glycemic", "matrix": "Serum",
        "instrument": "TEST_Instrument", "lot": "TEST-2",
        "tea": 10.0, "cv": 2.0, "bias": 1.0, "notes": "upd"
    }
    r = s.put(f"{API}/records/{rid}", json=payload, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["sigma"] == 4.5
    assert d["qgi"] == 0.33
    assert d["lot"] == "TEST-2"


def test_update_unknown_404(s):
    payload = {"analyte": "x", "instrument": "y", "tea": 1, "cv": 1, "bias": 0}
    r = s.put(f"{API}/records/nonexistent-id-xxx", json=payload, timeout=30)
    assert r.status_code == 404


def test_delete_record(s):
    rid = getattr(pytest, "record_id", None)
    assert rid
    r = s.delete(f"{API}/records/{rid}", timeout=30)
    assert r.status_code == 200
    # verify gone
    r2 = s.delete(f"{API}/records/{rid}", timeout=30)
    assert r2.status_code == 404


def test_filter_records(s):
    # create one
    payload = {
        "analyte": "TEST_Filter", "category": "X", "matrix": "Serum",
        "instrument": "TEST_INST_FILTER", "tea": 5.0, "cv": 1.0, "bias": 0.5
    }
    r = s.post(f"{API}/records", json=payload, timeout=30)
    rid = r.json()["id"]
    r2 = s.get(f"{API}/records", params={"instrument": "TEST_INST_FILTER"}, timeout=30)
    assert r2.status_code == 200
    assert all(x["instrument"] == "TEST_INST_FILTER" for x in r2.json())
    s.delete(f"{API}/records/{rid}", timeout=30)
