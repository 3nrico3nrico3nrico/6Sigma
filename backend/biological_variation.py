"""Preloaded Desirable Biological Variation database (Ricos/EFLM-style).

Desirable analytical performance specifications derived from within-subject (CVI)
and between-subject (CVG) biological variation:

    Desirable Imprecision   I%   = 0.50 * CVI
    Desirable Bias          B%   = 0.25 * sqrt(CVI^2 + CVG^2)
    Desirable Total Error   TEa% = 1.65 * I% + B%
"""

import math

# (name, category, matrix, CVI%, CVG%)
_RAW = [
    # Electrolytes
    ("Sodium", "Electrolytes", "Serum", 0.6, 0.7),
    ("Potassium", "Electrolytes", "Serum", 4.6, 5.6),
    ("Chloride", "Electrolytes", "Serum", 1.2, 1.5),
    ("Calcium (total)", "Electrolytes", "Serum", 1.9, 2.2),
    ("Phosphate", "Electrolytes", "Serum", 8.5, 9.4),
    ("Magnesium", "Electrolytes", "Serum", 3.6, 6.4),
    # Renal
    ("Urea (BUN)", "Renal", "Serum", 12.3, 18.3),
    ("Creatinine", "Renal", "Serum", 5.95, 14.7),
    ("Uric Acid", "Renal", "Serum", 8.6, 17.8),
    ("Cystatin C", "Renal", "Serum", 4.6, 12.9),
    # Proteins
    ("Total Protein", "Proteins", "Serum", 2.75, 4.0),
    ("Albumin", "Proteins", "Serum", 3.1, 4.75),
    ("Total Bilirubin", "Proteins", "Serum", 21.8, 28.4),
    # Lipids
    ("Cholesterol (total)", "Lipids", "Serum", 5.95, 15.3),
    ("HDL Cholesterol", "Lipids", "Serum", 7.1, 19.7),
    ("LDL Cholesterol", "Lipids", "Serum", 8.2, 25.7),
    ("Triglycerides", "Lipids", "Serum", 20.9, 37.2),
    # Enzymes
    ("ALT", "Enzymes", "Serum", 18.0, 41.6),
    ("AST", "Enzymes", "Serum", 11.9, 17.9),
    ("Alkaline Phosphatase", "Enzymes", "Serum", 6.45, 24.8),
    ("GGT", "Enzymes", "Serum", 13.4, 41.0),
    ("LDH", "Enzymes", "Serum", 8.6, 14.7),
    ("Creatine Kinase (CK)", "Enzymes", "Serum", 22.8, 40.0),
    ("Amylase", "Enzymes", "Serum", 8.7, 28.3),
    ("Lipase", "Enzymes", "Serum", 23.0, 40.0),
    # Iron studies
    ("Iron", "Iron Studies", "Serum", 26.5, 23.2),
    ("Ferritin", "Iron Studies", "Serum", 14.2, 15.0),
    ("Transferrin", "Iron Studies", "Serum", 3.0, 9.3),
    ("TIBC", "Iron Studies", "Serum", 6.4, 8.9),
    # Glycemic
    ("Glucose", "Glycemic", "Serum", 5.6, 7.5),
    ("HbA1c", "Glycemic", "Whole Blood", 1.9, 5.7),
    # Cardiac / Inflammation
    ("CRP", "Cardiac / Inflammation", "Serum", 42.2, 76.3),
    ("hs-Troponin I", "Cardiac / Inflammation", "Serum", 14.0, 63.0),
    ("BNP", "Cardiac / Inflammation", "Plasma", 25.0, 40.0),
    # Endocrinology
    ("TSH", "Endocrinology", "Serum", 19.3, 24.6),
    ("Free T4", "Endocrinology", "Serum", 5.7, 12.1),
    ("Free T3", "Endocrinology", "Serum", 7.9, 17.6),
    ("Cortisol", "Endocrinology", "Serum", 20.9, 45.6),
    ("Testosterone", "Endocrinology", "Serum", 9.3, 24.4),
    ("PSA (total)", "Endocrinology", "Serum", 18.1, 72.4),
    ("Vitamin D (25-OH)", "Endocrinology", "Serum", 12.1, 40.0),
    # Tumor markers
    ("CEA", "Tumor Markers", "Serum", 12.0, 55.6),
    ("CA 19-9", "Tumor Markers", "Serum", 16.0, 55.0),
    # Hematology
    ("Hemoglobin", "Hematology", "Whole Blood", 2.8, 6.6),
    ("Hematocrit", "Hematology", "Whole Blood", 2.8, 6.4),
    ("RBC Count", "Hematology", "Whole Blood", 3.2, 6.1),
    ("WBC Count", "Hematology", "Whole Blood", 10.9, 19.6),
    ("Platelet Count", "Hematology", "Whole Blood", 9.1, 21.9),
    ("MCV", "Hematology", "Whole Blood", 1.3, 4.8),
]


def _slug(name: str) -> str:
    out = []
    for ch in name.lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in " -/":
            out.append("-")
    s = "".join(out)
    while "--" in s:
        s = s.replace("--", "-")
    return s.strip("-")


def build_database():
    db = []
    for name, category, matrix, cvi, cvg in _RAW:
        imprecision = round(0.5 * cvi, 2)
        bias = round(0.25 * math.sqrt(cvi ** 2 + cvg ** 2), 2)
        tea = round(1.65 * imprecision + bias, 2)
        db.append({
            "slug": _slug(name),
            "name": name,
            "category": category,
            "matrix": matrix,
            "cvi": cvi,
            "cvg": cvg,
            "desirable_cv": imprecision,
            "desirable_bias": bias,
            "tea": tea,
        })
    return db


BIOLOGICAL_VARIATION_DB = build_database()
