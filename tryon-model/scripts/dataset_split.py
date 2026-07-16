"""
build_pairs.py
==============
Scans dataset_final/ and writes train_pairs.txt + test_pairs.txt.

Updated to match the training (catvton_train_v2.py) and inference
(catvton_inference.py) file-naming conventions:

  Folder layout expected:
    dataset_final/
      images/           person images          (e.g. 11.jpg)
      agnostic/         agnostic images        (e.g. 11_agnostic.jpg  OR  11.jpg)
      agnostic_mask/    per-sample masks:
                          11_inpaint_mask.png  ← VTON input mask   (preferred)
                          11_mask.png          ← composite mask     (optional)
                          11.png               ← legacy fallback
      garments/         cloth product images   (e.g. 11.jpg)

  Dropped (not used by CatVTON):
    masks/        → replaced by agnostic_mask/
    ref_cloth/    → replaced by garments/
    ref_cloth_mask/
    pose_img/

  Pairs format (unchanged):
    person.jpg cloth.jpg
  In a self-paired dataset both columns are the same filename.
"""

import os
import random

# ── CONFIGURATION ──────────────────────────────────────────────────────────────
DATA_ROOT    = r"../dataset_final"
OUTPUT_TRAIN = os.path.join(DATA_ROOT, "train_pairs.txt")
OUTPUT_TEST  = os.path.join(DATA_ROOT, "test_pairs.txt")
SPLIT_RATIO  = 0.80
RANDOM_SEED  = 42
# ──────────────────────────────────────────────────────────────────────────────


def find_agnostic(data_root, base, filename):
    """Return agnostic path using new naming first, old naming as fallback."""
    candidates = [
        os.path.join(data_root, "agnostic", f"{base}_agnostic.jpg"),   # NEW
        os.path.join(data_root, "agnostic", f"{base}_agnostic.png"),
        os.path.join(data_root, "agnostic", filename),                   # OLD
        os.path.join(data_root, "agnostic", f"{base}.jpg"),
        os.path.join(data_root, "agnostic", f"{base}.png"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def find_inpaint_mask(data_root, base):
    """Return inpaint-mask path using new naming first, legacy as fallback."""
    candidates = [
        os.path.join(data_root, "agnostic_mask", f"{base}_inpaint_mask.png"),  # NEW
        os.path.join(data_root, "agnostic_mask", f"{base}_mask.png"),
        os.path.join(data_root, "agnostic_mask", f"{base}.png"),
        os.path.join(data_root, "agnostic_mask", f"{base}.jpg"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def find_garment(data_root, filename, base):
    """Return garment path."""
    candidates = [
        os.path.join(data_root, "garments", filename),
        os.path.join(data_root, "garments", f"{base}.jpg"),
        os.path.join(data_root, "garments", f"{base}.png"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def main():
    print(f"--- BUILDING PAIRS FOR: {DATA_ROOT} ---\n")

    # ── 1. Root check ──────────────────────────────────────────────────────────
    if not os.path.exists(DATA_ROOT):
        print(f"CRITICAL ERROR: '{DATA_ROOT}' does not exist. Check the path.")
        return

    # ── 2. Subfolder check ─────────────────────────────────────────────────────
    required = ["images", "agnostic", "agnostic_mask", "garments"]
    for folder in required:
        path = os.path.join(DATA_ROOT, folder)
        status = "OK" if os.path.exists(path) else "MISSING"
        print(f"  [{status}] {folder}/")

    # Warn about legacy folders that are no longer used
    legacy = ["masks", "ref_cloth", "ref_cloth_mask", "pose_img"]
    found_legacy = [f for f in legacy if os.path.exists(os.path.join(DATA_ROOT, f))]
    if found_legacy:
        print(f"\n  NOTE: Legacy folders found (no longer used by training/inference):")
        for f in found_legacy:
            print(f"    {f}/  ← safe to ignore")

    print()

    images_dir = os.path.join(DATA_ROOT, "images")
    if not os.path.exists(images_dir):
        print("CRITICAL ERROR: 'images/' folder missing. Cannot continue.")
        return

    # ── 3. Scan & validate ─────────────────────────────────────────────────────
    all_files = sorted([
        f for f in os.listdir(images_dir)
        if f.lower().endswith(('.jpg', '.png', '.jpeg'))
    ])
    print(f"Found {len(all_files)} images in 'images/'.\n")

    valid_names = []
    missing_log = []

    for filename in all_files:
        base = os.path.splitext(filename)[0]
        missing = []

        # Person image (already confirmed it's in images/, just record)
        # Agnostic
        if find_agnostic(DATA_ROOT, base, filename) is None:
            missing.append(
                f"agnostic/{base}_agnostic.jpg  (or agnostic/{filename})"
            )

        # Inpaint mask
        if find_inpaint_mask(DATA_ROOT, base) is None:
            missing.append(
                f"agnostic_mask/{base}_inpaint_mask.png  (or {base}_mask.png / {base}.png)"
            )

        # Garment  (self-paired: same filename as person)
        if find_garment(DATA_ROOT, filename, base) is None:
            missing.append(f"garments/{filename}")

        if not missing:
            valid_names.append(filename)
        else:
            missing_log.append((filename, missing))

    # ── 4. Report ──────────────────────────────────────────────────────────────
    invalid_count = len(missing_log)
    print(f"Valid   : {len(valid_names)}")
    print(f"Invalid : {invalid_count}")

    if invalid_count:
        show = min(10, invalid_count)
        print(f"\nFirst {show} invalid samples:")
        for fname, reasons in missing_log[:show]:
            print(f"  {fname}")
            for r in reasons:
                print(f"    ✗ {r}")

    if not valid_names:
        print("\nNo valid pairs found. Fix the missing files and re-run.")
        return

    # ── 5. Split & write ───────────────────────────────────────────────────────
    random.seed(RANDOM_SEED)
    random.shuffle(valid_names)

    split_idx  = int(len(valid_names) * SPLIT_RATIO)
    train_list = valid_names[:split_idx]
    test_list  = valid_names[split_idx:]

    with open(OUTPUT_TRAIN, "w") as f:
        for name in train_list:
            f.write(f"{name} {name}\n")

    with open(OUTPUT_TEST, "w") as f:
        for name in test_list:
            f.write(f"{name} {name}\n")

    # ── 6. Summary ─────────────────────────────────────────────────────────────
    print(f"\n{'=' * 45}")
    print(f"SUCCESS")
    print(f"  Total valid : {len(valid_names)}")
    print(f"  Train       : {len(train_list)}  → {OUTPUT_TRAIN}")
    print(f"  Test        : {len(test_list)}   → {OUTPUT_TEST}")
    print(f"  Split ratio : {SPLIT_RATIO:.0%} / {1 - SPLIT_RATIO:.0%}")
    print(f"{'=' * 45}")

    # Quick sanity check — print 3 sample lines from each split
    print("\nSample train pairs:")
    for name in train_list[:3]:
        print(f"  {name}  {name}")
    print("Sample test pairs:")
    for name in test_list[:3]:
        print(f"  {name}  {name}")


if __name__ == "__main__":
    main()