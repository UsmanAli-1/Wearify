import os
import cv2
import torch
import numpy as np
from PIL import Image
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
from tqdm import tqdm

# --- CONFIGURATION ---
MODEL_PATH = r"../../my_custom_segformer_v4"
INPUT_DIR = r"../../own/images_resized"
OUTPUT_DIR = r"../../own"
IMG_SIZE = (512, 512)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# --- TUNING PARAMETERS ---
SHIFT_X = -1
THRESHOLD = 0.90
DILATION = 1

def setup_dirs():
    subdirs = ["images", "ref_cloth_masks"]
    for d in subdirs:
        os.makedirs(os.path.join(OUTPUT_DIR, d), exist_ok=True)

def main():
    setup_dirs()
    print(f"--- SURGICAL GENERATION (V4 + EXPANSION) ---")
    print(f"Shift X: {SHIFT_X}px | Threshold: {THRESHOLD} | Dilation: {DILATION}px")

    try:
        processor = SegformerImageProcessor.from_pretrained("nvidia/mit-b0")
        model = SegformerForSemanticSegmentation.from_pretrained(MODEL_PATH).to(DEVICE)
        model.eval()
    except Exception as e:
        print(f"Error loading V4: {e}")
        return

    files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]

    for filename in tqdm(files):
        try:
            # Load
            src_path = os.path.join(INPUT_DIR, filename)
            image_pil = Image.open(src_path).convert("RGB")
            image_pil = image_pil.resize(IMG_SIZE, Image.BILINEAR)
            image_np = np.array(image_pil)

            # Predict
            inputs = processor(images=image_pil, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                outputs = model(**inputs)
                logits = outputs.logits

            # Upsample
            logits = torch.nn.functional.interpolate(logits, size=IMG_SIZE[::-1], mode="bilinear", align_corners=False)
            probs = torch.nn.functional.softmax(logits, dim=1)

            # 1. High Confidence Threshold (Kills webbing)
            mask = (probs[0, 1].cpu().numpy() > THRESHOLD).astype(np.uint8) * 255

            # 2. Manual Shift
            if SHIFT_X != 0:
                M = np.float32([[1, 0, SHIFT_X], [0, 1, 0]])
                mask = cv2.warpAffine(mask, M, (IMG_SIZE[1], IMG_SIZE[0]))

            # 3. EXPANSION (Dilation) INSTEAD OF EROSION
            if DILATION > 0:
                # A 3x3 kernel expands by ~1 pixel per iteration.
                # A 5x5 kernel expands by ~2 pixels.
                kernel = np.ones((3, 3), np.uint8)
                mask = cv2.dilate(mask, kernel, iterations=DILATION)

            # Cleanup Small Noise
            num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
            for i in range(1, num_labels):
                if stats[i, cv2.CC_STAT_AREA] < 100:
                    mask[labels == i] = 0

            # Save
            # agnostic = image_np.copy()
            # agnostic[mask == 255] = 128

            vis = image_np.copy()
            vis[mask == 255] = vis[mask == 255] * 0.5 + np.array([0, 255, 0]) * 0.5

            name_base = os.path.splitext(filename)[0]
            cv2.imwrite(os.path.join(OUTPUT_DIR, "images", filename), cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR))
            # cv2.imwrite(os.path.join(OUTPUT_DIR, "ref_person", filename), cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR))
            # cv2.imwrite(os.path.join(OUTPUT_DIR, "agnostic", filename), cv2.cvtColor(agnostic, cv2.COLOR_RGB2BGR))
            cv2.imwrite(os.path.join(OUTPUT_DIR, "ref_cloth_masks", f"{name_base}.png"), mask)
            # cv2.imwrite(os.path.join(OUTPUT_DIR, "vis", filename), cv2.cvtColor(vis, cv2.COLOR_RGB2BGR))

        except Exception as e:
            print(f"Skipping {filename}: {e}")

    print(f"\nSUCCESS! Masks expanded by {DILATION} iterations.")

if __name__ == "__main__":
    main()