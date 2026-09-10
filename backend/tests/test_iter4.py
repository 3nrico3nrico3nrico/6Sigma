"""Iteration 4 tests: analyte disambiguation by source, import source label, records regression."""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv('/app/frontend/.env')
BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module", autouse=True)
def cleanup(s):
    s.delete(f"{API}/analytes/custom", timeout=30)
    yield
    s.delete(f"{API}/analytes/custom", timeout=30)


def test_total_count_378(s):
    data = s.get(f"{API}/analytes", timeout=30).json()
    assert len(data) == 378


def test_every_item_has_source(s):
    data = s.get(f"{API}/analytes", timeout=30).json()
    for a in data:
        assert "source" in a and a["source"] in ("Ricos", "EFLM"), f"Bad source: {a.get('name')}={a.get('source')}"


def test_disambiguation_glucose_and_potassium(s):
    data = s.get(f"{API}/analytes", timeout=30).json()
    names = {a["name"]: a for a in data}
    # both suffixed variants exist
    assert "Glucose (Ricos)" in names, "Missing 'Glucose (Ricos)'"
    assert "Glucose (EFLM)" in names, "Missing 'Glucose (EFLM)'"
    assert "Potassium (Ricos)" in names, "Missing 'Potassium (Ricos)'"
    assert "Potassium (EFLM)" in names, "Missing 'Potassium (EFLM)'"
    # matrices
    assert names["Glucose (Ricos)"]["matrix"] == "Serum"
    assert names["Glucose (EFLM)"]["matrix"] == "Plasma"
    # TEa values (approx)
    assert abs(names["Glucose (Ricos)"]["tea"] - 6.96) < 0.01
    assert abs(names["Glucose (EFLM)"]["tea"] - 5.5) < 0.01
    assert names["Potassium (EFLM)"]["tea"] is not None
    # unsuffixed bare 'Glucose' or 'Potassium' should NOT exist
    assert "Glucose" not in names
    assert "Potassium" not in names


def test_single_source_names_not_suffixed(s):
    data = s.get(f"{API}/analytes", timeout=30).json()
    names = {a["name"] for a in data}
    # Names that exist only in EFLM should not have (EFLM) suffix
    # Look for a known single-source EFLM analyte
    single_source_candidates = [
        "Potassium, output",
    ]
    for cand in single_source_candidates:
        assert cand in names, f"Expected unsuffixed name {cand!r} missing"
        assert f"{cand} (EFLM)" not in names


def test_unique_slugs(s):
    data = s.get(f"{API}/analytes", timeout=30).json()
    slugs = [a["slug"] for a in data]
    assert len(slugs) == len(set(slugs)), "Duplicate slugs detected"


def test_import_sodium_creates_imported_variant_and_cleanup(s):
    csv_content = "Matrix,Analyte,TEa%\nSerum,Sodium,0.9\n"
    files = {"file": ("sodium.csv", csv_content, "text/csv")}
    r = s.post(f"{API}/analytes/import", files=files, timeout=30)
    assert r.status_code == 200, r.text
    assert r.json()["imported"] == 1

    data = s.get(f"{API}/analytes", timeout=30).json()
    names = {a["name"]: a for a in data}
    assert "Sodium (Ricos)" in names, "Missing 'Sodium (Ricos)' after import"
    assert "Sodium (Imported)" in names, f"Missing 'Sodium (Imported)'. Names sample: {list(names)[:5]}"
    imp = names["Sodium (Imported)"]
    assert imp["source"] == "Imported"
    assert imp["custom"] is True

    # cleanup: 'Sodium' should still be suffixed because EFLM also has 'Sodium' entries.
    # (Data note: tea_extended has 2 'Sodium' EFLM rows — collides in name post-disambiguate.)
    d = s.delete(f"{API}/analytes/custom", timeout=30)
    assert d.status_code == 200
    data2 = s.get(f"{API}/analytes", timeout=30).json()
    names2 = {a["name"] for a in data2}
    assert "Sodium (Imported)" not in names2
    assert len(data2) == 378


def test_records_regression_sigma_419(s):
    payload = {"analyte": "TEST_Reg4", "instrument": "TEST_INST4",
               "tea": 6.96, "cv": 1.4, "bias": 1.1}
    r = s.post(f"{API}/records", json=payload, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["sigma"] == 4.19
    rid = d["id"]

    # GET
    g = s.get(f"{API}/records", timeout=30)
    assert g.status_code == 200
    assert any(x["id"] == rid for x in g.json())

    # PUT
    p = s.put(f"{API}/records/{rid}",
              json={"analyte": "TEST_Reg4", "instrument": "TEST_INST4",
                    "tea": 6.96, "cv": 1.0, "bias": 0.5},
              timeout=30)
    assert p.status_code == 200
    assert p.json()["sigma"] > 4.19

    # DELETE
    dl = s.delete(f"{API}/records/{rid}", timeout=30)
    assert dl.status_code == 200
