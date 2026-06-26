import os
import cv2
import numpy as np
from tqdm import tqdm

# ==========================================
# PATH SETUP
# ==========================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

IMG_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "own", "images"))
CLOTH_MASK_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "own", "ref_cloth_masks"))
PARSED_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "own", "parsed_labels"))
IDENTITY_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "own", "identity_masks"))

MASK_OUTPUT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "own", "agnostic_mask"))
AGNOSTIC_OUTPUT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "own", "agnostic"))

os.makedirs(MASK_OUTPUT_DIR, exist_ok=True)
os.makedirs(AGNOSTIC_OUTPUT_DIR, exist_ok=True)

# ==========================================
# CONFIGURATION
# ==========================================
ARM_IDS = [14, 15]  # SCHP: left-arm, right-arm
CLOSE_KERNEL = np.ones((15, 15), np.uint8)  # fills neckline/embroidery holes

# Kernel for expanding the masks to create an inpainting buffer
DILATE_KERNEL = np.ones((11, 11), np.uint8)
EXPAND_ITER = 1  # Increase to expand further


# ==========================================
# HELPERS
# ==========================================

def load_binary(path: str, target_wh: tuple = None) -> np.ndarray:
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Cannot read: {path}")
    if target_wh:
        img = cv2.resize(img, target_wh, interpolation=cv2.INTER_NEAREST)
    _, binary = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)
    return binary


def load_parse_map(path: str, target_wh: tuple = None) -> np.ndarray:
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Cannot read: {path}")
    if len(img.shape) > 2:
        img = img[:, :, 0]
    if target_wh:
        img = cv2.resize(img, target_wh, interpolation=cv2.INTER_NEAREST)
    return img


# ==========================================
# MAIN
# ==========================================

def build_agnostic():
    img_files = [f for f in os.listdir(IMG_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    print(f"Building agnostics for {len(img_files)} images...")

    skipped = 0

    for img_name in tqdm(img_files):
        base_name = os.path.splitext(img_name)[0]

        img_path = os.path.join(IMG_DIR, img_name)
        cloth_path = os.path.join(CLOTH_MASK_DIR, f"{base_name}.png")
        parse_path = os.path.join(PARSED_DIR, f"{base_name}.png")
        identity_path = os.path.join(IDENTITY_DIR, f"{base_name}.png")

        if not all(os.path.exists(p) for p in [cloth_path, parse_path, identity_path]):
            skipped += 1
            continue

        try:
            img = cv2.imread(img_path)
            h, w = img.shape[:2]
            wh = (w, h)

            # ── 1. CLOTH MASK ─────────────────────────────────────────────────
            cloth_mask = load_binary(cloth_path, target_wh=wh)
            cloth_mask = cv2.morphologyEx(cloth_mask, cv2.MORPH_CLOSE, CLOSE_KERNEL)
            contours, _ = cv2.findContours(cloth_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(cloth_mask, contours, -1, 255, thickness=cv2.FILLED)

            # ── 2. ARM MASK (from SCHP) ───────────────────────────────────────
            parse_map = load_parse_map(parse_path, target_wh=wh)
            arm_mask = np.zeros((h, w), dtype=np.uint8)
            for arm_id in ARM_IDS:
                arm_mask[parse_map == arm_id] = 255

            # ── 3. IDENTITY MASK (from SAM) ───────────────────────────────────
            identity_mask = load_binary(identity_path, target_wh=wh)

            # ── CANVAS MASK — drives the grey agnostic image ──────────────────
            # cloth + arms, identity punched out
            canvas_mask = cv2.bitwise_or(cloth_mask, arm_mask)
            canvas_mask = cv2.morphologyEx(canvas_mask, cv2.MORPH_CLOSE, CLOSE_KERNEL)
            _, canvas_mask = cv2.threshold(canvas_mask, 127, 255, cv2.THRESH_BINARY)

            # Expand the mask slightly to cover garment seams
            canvas_mask = cv2.dilate(canvas_mask, DILATE_KERNEL, iterations=EXPAND_ITER)

            canvas_mask[identity_mask == 255] = 0

            # ── TIGHT INPAINT MASK — for CatVTON ─────────────────────────────
            # cloth only (no arms) — CatVTON renders sleeves from the new garment
            tight_mask = cloth_mask.copy()

            # Ensure the inpaint mask also includes the expansion buffer
            tight_mask = cv2.dilate(tight_mask, DILATE_KERNEL, iterations=EXPAND_ITER)

            tight_mask[identity_mask == 255] = 0

            # ── AGNOSTIC IMAGE ────────────────────────────────────────────────
            # Hard binary cutout — gives the model a clean, unambiguous mask boundary.
            # Dilation above already handles seam coverage; feathering is not needed.
            agnostic = img.copy()
            agnostic[canvas_mask == 255] = 128

            # ── SAVE ──────────────────────────────────────────────────────────
            cv2.imwrite(os.path.join(MASK_OUTPUT_DIR, f"{base_name}_mask.png"), canvas_mask)
            cv2.imwrite(os.path.join(MASK_OUTPUT_DIR, f"{base_name}_inpaint_mask.png"), tight_mask)
            cv2.imwrite(os.path.join(AGNOSTIC_OUTPUT_DIR, f"{base_name}_agnostic.jpg"), agnostic)

        except Exception as e:
            print(f"\n  [ERROR] {img_name}: {e}")
            skipped += 1

    print(f"\nDone. Processed: {len(img_files) - skipped}  |  Skipped: {skipped}")


if __name__ == "__main__":
    build_agnostic()