import fcntl
import os
import pytest

_LOCK_PATH = "/tmp/sigmalab_custom_analytes.lock"


@pytest.fixture(scope="module", autouse=True)
def _custom_analytes_lock():
    """Serialize modules touching db.custom_analytes across xdist workers."""
    fd = os.open(_LOCK_PATH, os.O_CREAT | os.O_RDWR)
    fcntl.flock(fd, fcntl.LOCK_EX)
    try:
        yield
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)
