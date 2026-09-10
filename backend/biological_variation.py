"""Preloaded Desirable Biological Variation database (Ricos/EFLM-style).

Desirable analytical performance specifications derived from within-subject (CVI)
and between-subject (CVG) biological variation:

    Desirable Imprecision   I%   = 0.50 * CVI
    Desirable Bias          B%   = 0.25 * sqrt(CVI^2 + CVG^2)
    Desirable Total Error   TEa% = 1.65 * I% + B%
"""

import math

from tea_extended import EXTENDED_TEA

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


# Stringency factor k for imprecision at each EFLM performance level.
# I = k * CVI ; Bias = (k/2) * sqrt(CVI^2 + CVG^2) ; TEa = 1.65*I + Bias
_LEVEL_K = {"optimal": 0.25, "desirable": 0.50, "minimum": 0.75}


def _level_spec(cvi, cvg, k):
    imprecision = round(k * cvi, 2)
    bias = round((k / 2) * math.sqrt(cvi ** 2 + cvg ** 2), 2)
    tea = round(1.65 * imprecision + bias, 2)
    return {"cv": imprecision, "bias": bias, "tea": tea}


def _peer_sigma(des):
    typical_cv = round(des["cv"] * 0.55, 2) or 0.01
    typical_bias = round(des["bias"] * 0.5, 2)
    ps = round((des["tea"] - typical_bias) / typical_cv, 1)
    return max(1.5, min(7.0, ps))


def build_specs(cvi, cvg):
    specs = {lvl: _level_spec(cvi, cvg, k) for lvl, k in _LEVEL_K.items()}
    return specs, _peer_sigma(specs["desirable"])


# --- Clinical panel classifier (first matching rule wins) ---
_CATEGORY_RULES = [
    ("Semen Analysis", ["spermatozoa", "semen"]),
    ("Cardiac Markers", ["troponin", "myoglobin", "natriuretic", "probnp", "nt-pro", "creatine kinase mb", "ck-mb", "ck mb"]),
    ("Tumor Markers", ["ca 125", "ca 15", "ca 19", "ca 549", "cea", "carcinoembryonic", "psa", "prostatic specific", "fetoprotein", "cyfra", "scc antigen", "tissue polypeptide", "chromogranin", "he4"]),
    ("Bone Markers", ["collagen", "telopeptide", "pyridinoline", "osteocalcin", "hydroxyproline", "picp", "pinp", "galactosyl hydroxylysine", "ctx", "ntx"]),
    ("Coagulation", ["coagulation", "prothrombin", "thromboplastin", "fibrinogen", "von willebrand", "plasminogen", "antiplasmin", "d-dimer", "factor v", "factor vii", "factor viii", "factor x"]),
    ("Cytokines & Inflammation", ["interleukin", "tumor necrosis", "interferon", "adhesion molecule", "icam", "vcam", "vascular endotelial", "vascular endothelial", "vegf", "rage", "adiponectin", "soluble cd", "amyloid a"]),
    ("Immunology & Complement", ["immunoglobulin", "antibody", "complement", "properdin", "rheumatoid", "microglobulin", "acid glycoprotein", "antichymotrypsin", "antitrypsin"]),
    ("Enzymes", ["aminotransferase", "transaminase", "phosphatase", "dehydrogenase", "kinase", "amylase", "lipase", "glutamyltransferase", "ggt", "nucleotidase", "deaminase", "esterase", "cholinesterase", "elastase", "paraoxonase", "dipeptidyl", "aminopeptidase", "endopeptidase", "g6pdh", "ldh", "superoxide dismutase", "peroxidase", "ferroxidase", "arilestearase", "glucosaminidase"]),
    ("Hormones", ["cortisol", "aldosterone", "estradiol", "testosterone", "progesterone", "dhea", "androstendione", "follicle stimulating", "luteinizing", "fsh", " lh", "(lh)", "prolactin", "insulin", "thyroid stimulating", "tsh", "thyroxine", "triiodothyronine", "(t3)", "(t4)", "parathyroid", "pth", "inhibin", "igf", "growth factor binding", "sex hormone binding", "shbg", "thyroglobulin", "c peptide", "c-peptide", "desoxycortisol", "hydroxyprogesterone", "epinephrine", "norepinephrine", "catecolamines", "catecholamines", "thyroxine binding"]),
    ("Lipids", ["cholesterol", "hdl", "ldl", "vldl", "triglyceride", "apolipoprotein", "lipoprotein", "phospholipid"]),
    ("Vitamins & Carotenoids", ["vitamin", "ascorbate", "folate", "retinol", "tocopherol", "carotene", "cryptoxantin", "lutein", "lycopene", "zeaxanthin", "riboflavin", "cobalamin"]),
    ("Trace Elements", ["copper", "zinc", "selenium", "manganese", "cobalt", "chromium", "aluminium"]),
    ("Amino Acids", ["alanine", "arginine", "asparagine", "aspartic", "citrulline", "cysteine", "cystine", "glutamic", "glycine", "histidine", "leucine", "lysine", "metionine", "methionine", "ornithine", "proline", "serine", "taurine", "treonine", "threonine", "tryptophan", "tirosine", "tyrosine", "valine", "aminobutryic", "aminobutyric"]),
    ("Electrolytes & Blood Gas", ["sodium", "potassium", "chloride", "calcium", "magnesium", "phosphate", "bicarbonate", "anion gap", "osmolality", "pco2", "po2", "base excess", "ionized", "ph (", "ph [", "water"]),
    ("Hematology", ["erythrocyte", "leukocyte", "leucocyte", "lymphocyte", "monocyte", "neutroph", "eosinophil", "basophil", "platelet", "reticulocyte", "hemoglobin", "hematocrit", "corpuscular", "distribution wide", "rdw", "mpv", "plateletcrit", "count", "cd4", "cd163", "red cell"]),
    ("Metabolites", ["glucose", "lactate", "pyruvate", "urate", "uric acid", "urea", "creatinine", "cystatin", "bilirubin", "ammonia", "homocysteine", "fructosamine", "hydroxybutyrate", "oxalate", "citrate", "porphyrin", "porphobilinogen", "nitrogen", "vanilmandelic", "methoximandelate", "vma", "hydroxyindolacetate", "carnitine"]),
    ("Proteins", ["albumin", "protein", "globulin", "transferrin", "ferritin", "ceruloplasmin", "prealbumin", "haptoglobin", "lactoferrin", "hyaluronic"]),
    ("Urinalysis", ["output", "24h", "first morning", "second void", "random", "specific gravity", "color", "tubular reabsorption"]),
]


def classify(name):
    n = " " + name.lower() + " "
    for category, keys in _CATEGORY_RULES:
        for k in keys:
            if k in n:
                return category
    return "Other Chemistry"


# --- Supplementary within/between-subject CV for common imported analytes ---
# key = exact analyte name (lowercased). value = (CVI%, CVG%). Illustrative Ricos-style.
_SUPP = {
    "aldosterone": (29.4, 40.5), "cortisol": (20.9, 45.6), "estradiol": (18.0, 28.0),
    "prolactin": (23.6, 42.9), "follicle stimulating hormone (fsh)": (12.6, 39.0),
    "luteinizing hormone (lh)": (14.5, 27.0), "insulin": (21.1, 57.6),
    "thyroxine (t4)": (4.9, 10.8), "triiodothyronine (t3)": (6.5, 13.4),
    "parathyroid hormone (pth)": (25.9, 33.0), "sex hormone binding globulin (shbg)": (12.1, 49.0),
    "osteocalcin": (6.5, 20.0), "homocysteine": (8.6, 15.8), "fructosamine": (3.4, 5.9),
    "urate": (8.6, 17.8), "urea": (12.3, 18.3), "cholesterol": (5.95, 15.3),
    "triglyceride": (20.9, 37.2), "apolipoprotein b": (6.5, 22.8),
    "immunoglobulin a": (5.4, 37.6), "immunoglobulin g": (4.5, 16.1), "immunoglobulin m": (5.9, 47.3),
    "c3 complement": (5.2, 15.2), "c4 complement": (8.9, 33.4), "haptoglobin": (20.4, 36.4),
    "ceruloplasmin (ferroxidase)": (8.6, 12.8), "fibrinogen": (10.7, 15.8),
    "copper": (5.7, 13.9), "zinc": (9.3, 9.4), "folate": (24.2, 43.9), "vitamin b12": (13.5, 39.8),
    "osmolality": (1.3, 1.4), "calcium, ionized": (1.7, 2.9),
    "lactate dehydrogenase (ldh)": (8.6, 14.7), "cystatin c": (4.6, 12.9),
    "prostatic specific antigen (psa)": (18.1, 72.4), "ca 125 antigen": (24.7, 54.0),
    "ca 19.9 antigen": (16.0, 55.0), "myoglobin": (13.9, 34.0), "prealbumin": (10.5, 17.0),
}


# Align the 49 detailed analytes' categories with the new clinical-panel vocabulary.
_RAW_ALIAS = {
    "Electrolytes": "Electrolytes & Blood Gas",
    "Renal": "Metabolites",
    "Glycemic": "Metabolites",
    "Endocrinology": "Hormones",
    "Cardiac / Inflammation": "Cardiac Markers",
}


def build_database():
    db = []
    for name, category, matrix, cvi, cvg in _RAW:
        category = _RAW_ALIAS.get(category, category)
        specs = {lvl: _level_spec(cvi, cvg, k) for lvl, k in _LEVEL_K.items()}
        des = specs["desirable"]
        # Illustrative typical peer-group achieved performance:
        # labs commonly reach ~55% of desirable imprecision and ~50% of desirable bias.
        typical_cv = round(des["cv"] * 0.55, 2) or 0.01
        typical_bias = round(des["bias"] * 0.5, 2)
        peer_sigma = round((des["tea"] - typical_bias) / typical_cv, 1)
        peer_sigma = max(1.5, min(7.0, peer_sigma))
        db.append({
            "slug": _slug(name),
            "name": name,
            "category": category,
            "matrix": matrix,
            "cvi": cvi,
            "cvg": cvg,
            "specs": specs,
            # backward-compatible desirable-level flat fields
            "desirable_cv": des["cv"],
            "desirable_bias": des["bias"],
            "tea": des["tea"],
            "peer_sigma": peer_sigma,
            "detailed": True,
            "source": "Ricos",
        })
    # Extended analytes from the official Westgard/EFLM TEa database,
    # classified into clinical panels and enriched with CVI/CVG where known.
    for slug, name, matrix, tea in EXTENDED_TEA:
        category = classify(name)
        supp = _SUPP.get(name.strip().lower())
        if supp:
            cvi, cvg = supp
            specs, peer = build_specs(cvi, cvg)
            des = specs["desirable"]
            db.append({
                "slug": slug, "name": name, "category": category, "matrix": matrix,
                "cvi": cvi, "cvg": cvg, "specs": specs,
                "desirable_cv": des["cv"], "desirable_bias": des["bias"],
                "tea": des["tea"], "peer_sigma": peer, "detailed": True, "source": "EFLM",
            })
        else:
            db.append({
                "slug": slug, "name": name, "category": category, "matrix": matrix,
                "cvi": None, "cvg": None, "specs": None,
                "desirable_cv": None, "desirable_bias": None,
                "tea": tea, "peer_sigma": None, "detailed": False, "source": "EFLM",
            })
    return db


def disambiguate(db):
    """Return copies with source (and matrix, if still ambiguous) appended to shared names."""
    from collections import defaultdict, Counter
    key = lambda a: a["name"].strip().lower()
    groups = defaultdict(set)
    for a in db:
        groups[key(a)].add(a.get("source") or "Imported")
    out = []
    for a in db:
        a = dict(a)
        src = a.get("source") or "Imported"
        if len(groups[key(a)]) > 1:
            a["name"] = f'{a["name"]} ({src})'
        out.append(a)
    dup = Counter(key(a) for a in out)
    for a in out:
        if dup[key(a)] > 1:
            a["name"] = f'{a["name"]} · {a["matrix"]}'
    return out


BIOLOGICAL_VARIATION_DB = build_database()
