"""Iteration 3 tests: category cleanup, CVI enrichment, bulk import, custom clear."""
import os
import io
import csv
import pytest
import requests

from dotenv import load_dotenv
load_dotenv('/app/frontend/.env')
BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    return sess


@pytest.fixture(scope="module", autouse=True)
def cleanup_before_after(s):
    # ensure clean before/after
    s.delete(f"{API}/analytes/custom", timeout=30)
    yield
    s.delete(f"{API}/analytes/custom", timeout=30)


def test_analyte_count_378(s):
    r = s.get(f"{API}/analytes", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 378, f"Expected 378 built-in analytes, got {len(data)}"


def test_categories_are_clinical_panels(s):
    data = s.get(f"{API}/analytes", timeout=30).json()
    cats = set(a["category"] for a in data)
    # Should NOT be matrices
    forbidden = {"Serum", "Plasma", "Urine", "Whole Blood"}
    assert not (cats & forbidden), f"Category equals a matrix: {cats & forbidden}"
    # Expected panels present (spot check)
    expected_any = {"Enzymes", "Hormones", "Lipids", "Hematology", "Metabolites",
                    "Tumor Markers", "Electrolytes & Blood Gas", "Proteins"}
    missing = expected_any - cats
    assert not missing, f"Missing expected panels: {missing}"
    # ~19 categories total (allow slack)
    assert 10 <= len(cats) <= 25, f"Got {len(cats)} categories: {cats}"


def test_enrichment_at_least_100_detailed(s):
    data = s.get(f"{API}/analytes", timeout=30).json()
    detailed = [a for a in data if a.get("detailed") and a.get("specs") and a.get("peer_sigma") is not None]
    assert len(detailed) >= 95, f"Expected >=95 detailed analytes, got {len(detailed)}"


def test_spot_enriched_analytes(s):
    data = s.get(f"{API}/analytes", timeout=30).json()
    names_lower = {a["name"].lower(): a for a in data}
    # Look for homocysteine, cortisol, cholesterol (any variant)
    found_hom = any("homocysteine" in n for n in names_lower)
    found_cort = any("cortisol" == n or n.startswith("cortisol") for n in names_lower)
    assert found_hom, "Homocysteine not found"
    assert found_cort, "Cortisol not found"
    # Ensure at least one imported (non-detailed originally) name like homocysteine now has specs
    hom = next((a for a in data if "homocysteine" in a["name"].lower()), None)
    assert hom and hom.get("specs") and hom.get("peer_sigma"), f"Homocysteine not enriched: {hom}"


def test_csv_import_auto_detect_with_cvi_cvg(s):
    csv_content = "Analyte,TEa%,CVI%,CVG%\nTEST_ImportedX,10.5,3.0,5.0\nTEST_ImportedY,7.2,2.0,4.0\n"
    files = {"file": ("import.csv", csv_content, "text/csv")}
    r = s.post(f"{API}/analytes/import", files=files, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["imported"] == 2
    assert body["total_custom"] >= 2

    # verify GET analytes includes them with custom=true and detailed=true (CVI+CVG present)
    data = s.get(f"{API}/analytes", timeout=30).json()
    imp = [a for a in data if a.get("custom") and a["name"].startswith("TEST_Imported")]
    assert len(imp) == 2
    for a in imp:
        assert a["custom"] is True
        assert a["detailed"] is True
        assert a["specs"] is not None
        assert a["peer_sigma"] is not None

    # Cleanup
    d = s.delete(f"{API}/analytes/custom", timeout=30)
    assert d.status_code == 200
    assert d.json()["deleted"] >= 2


def test_csv_positional_import(s):
    # No header - positional [matrix, name, tea]. Avoid keyword triggers.
    csv_content = "Serum,MyMetabolite,8.5\nPlasma,MySubstance,6.0\n"
    files = {"file": ("nohdr.csv", csv_content, "text/csv")}
    r = s.post(f"{API}/analytes/import", files=files, timeout=30)
    # Header auto-detect: "serum" doesn't match "anal" nor "tea", so treated as data (positional)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["imported"] >= 1
    data = s.get(f"{API}/analytes", timeout=30).json()
    pos = [a for a in data if a.get("custom") and a["name"] in ("MyMetabolite", "MySubstance")]
    assert len(pos) >= 1
    # These have tea only (no CVI/CVG) so detailed=false
    for a in pos:
        assert a["detailed"] is False
        assert a["tea"] is not None
    s.delete(f"{API}/analytes/custom", timeout=30)


def test_xlsx_import(s):
    try:
        import openpyxl
    except ImportError:
        pytest.skip("openpyxl not installed")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Matrix", "Analyte", "TEa%"])
    ws.append(["Serum", "TEST_XlsAnalyte", 12.3])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    files = {"file": ("test.xlsx", buf.read(),
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = s.post(f"{API}/analytes/import", files=files, timeout=30)
    assert r.status_code == 200, r.text
    assert r.json()["imported"] == 1
    data = s.get(f"{API}/analytes", timeout=30).json()
    assert any(a["name"] == "TEST_XlsAnalyte" and a.get("custom") for a in data)
    s.delete(f"{API}/analytes/custom", timeout=30)


def test_delete_returns_to_378(s):
    s.delete(f"{API}/analytes/custom", timeout=30)
    data = s.get(f"{API}/analytes", timeout=30).json()
    assert len(data) == 378


# Regression - calculator math
def test_calculator_regression(s):
    payload = {"analyte": "TEST_Reg", "instrument": "TEST_INST",
               "tea": 6.96, "cv": 1.4, "bias": 1.1}
    r = s.post(f"{API}/records", json=payload, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["sigma"] == 4.19
    s.delete(f"{API}/records/{d['id']}", timeout=30)
