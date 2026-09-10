"""Bulk delete + demo re-seed suppression tests for SigmaLab QC."""
import os
import time
import subprocess
import pytest
import requests

def _load_frontend_env():
    try:
        with open('/app/frontend/.env') as fh:
            for line in fh:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except OSError:
        pass
    return None


BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or _load_frontend_env() or '').rstrip('/')
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _seed(s):
    r = s.post(f"{API}/seed", timeout=30)
    assert r.status_code == 200
    return r.json()


def _count(s):
    r = s.get(f"{API}/records", timeout=30)
    assert r.status_code == 200
    return len(r.json())


def test_a_seed_baseline(s):
    """Ensure baseline: seed returns 40."""
    # first clear all in case leftover
    r = s.delete(f"{API}/records", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert "deleted" in d and "remaining" in d
    assert d["remaining"] == 0
    # now seed
    d2 = _seed(s)
    assert d2["records"] == 40
    assert _count(s) == 40


def test_b_delete_by_analyte(s):
    """DELETE /api/records?analyte=Sodium deletes only sodium records."""
    r = s.delete(f"{API}/records", params={"analyte": "Sodium"}, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["deleted"] == 4  # 4 months of history
    assert d["remaining"] == 36
    # verify sodium gone
    r2 = s.get(f"{API}/records", params={"analyte": "Sodium"}, timeout=30)
    assert r2.json() == []
    # verify others remain
    assert _count(s) == 36


def test_c_delete_by_instrument_and_analyte(s):
    """DELETE with instrument+analyte filters both."""
    r = s.delete(f"{API}/records",
                 params={"instrument": "Roche Cobas c502", "analyte": "Glucose"},
                 timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["deleted"] == 4
    assert d["remaining"] == 32
    # remaining roche c502 records should not include glucose
    r2 = s.get(f"{API}/records", params={"instrument": "Roche Cobas c502"}, timeout=30)
    for rec in r2.json():
        assert rec["analyte"] != "Glucose"


def test_d_delete_all_no_params(s):
    """DELETE /api/records (no params) deletes everything."""
    r = s.delete(f"{API}/records", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["remaining"] == 0
    assert _count(s) == 0


def test_e_no_reseed_on_restart(s):
    """After bulk delete, restarting backend must NOT re-seed."""
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, capture_output=True)
    # wait for backend to come back up
    for _ in range(30):
        try:
            r = s.get(f"{API}/", timeout=5)
            if r.status_code == 200:
                break
        except requests.RequestException:
            pass
        time.sleep(1)
    else:
        pytest.fail("Backend did not come back up in 30s")
    time.sleep(2)  # let startup event finish
    assert _count(s) == 0, "Demo data was re-seeded after restart!"


def test_f_seed_endpoint_repopulates(s):
    """POST /api/seed clears the dismissed flag and reseeds."""
    d = _seed(s)
    assert d["records"] == 40
    assert _count(s) == 40


def test_g_seed_idempotent(s):
    """POST /api/seed when records exist keeps 40 (no duplicates)."""
    d = _seed(s)
    assert d["records"] == 40
    assert _count(s) == 40


def test_h_single_delete_still_works(s):
    """DELETE /api/records/{id} still works."""
    recs = s.get(f"{API}/records", timeout=30).json()
    rid = recs[0]["id"]
    r = s.delete(f"{API}/records/{rid}", timeout=30)
    assert r.status_code == 200
    assert _count(s) == 39
    # restore baseline: clear+reseed
    s.delete(f"{API}/records", timeout=30)
    _seed(s)
    assert _count(s) == 40


def test_i_final_baseline(s):
    """Leave DB with exactly 40 demo records."""
    if _count(s) != 40:
        s.delete(f"{API}/records", timeout=30)
        _seed(s)
    assert _count(s) == 40
