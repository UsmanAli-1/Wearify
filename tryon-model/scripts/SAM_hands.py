import sys
sys.path.insert(0, r"F:\University\fyp\Project\Wearify\GroundingDINO")

import os
import cv2
import torch
import numpy as np
from tqdm import tqdm

from segment_anything import sam_model_registry, SamPredictor
from groundingdino.util.inference import Model as DinoModel

from transformers import BertModel

def _get_head_mask(self, head_mask, num_hidden_layers, is_attention_chunked=False):
    if head_mask is not None:
        head_mask = self._convert_head_mask_to_5d(head_mask, num_hidden_layers)
        if is_attention_chunked is True:
            head_mask = head_mask.unsqueeze(-1)
    else:
        head_mask = [None] * num_hidden_layers
    return head_mask

if not hasattr(BertModel, 'get_head_mask'):
    BertModel.get_head_mask = _get_head_mask


# ==========================================
# PATH SETUP
# ==========================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

IMG_DIR          = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "own", "images"))
IDENTITY_MASK_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "own", "identity_masks"))
os.makedirs(IDENTITY_MASK_DIR, exist_ok=True)

# ==========================================
# MODEL CONFIG
# ==========================================
DINO_CONFIG_PATH  = "../../GroundingDINO/groundingdino/config/GroundingDINO_SwinT_OGC.py"
DINO_WEIGHTS_PATH = "../../GroundingDINO/groundingdino_swint_ogc.pth"
SAM_ENCODER_VERSION = "vit_h"
SAM_WEIGHTS_PATH  = "../../GroundingDINO/sam_vit_h_4b8939.pth"

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

print(f"Loading GroundingDINO on {DEVICE}...")
grounding_dino = DinoModel(
    model_config_path=DINO_CONFIG_PATH,
    model_checkpoint_path=DINO_WEIGHTS_PATH,
    device=DEVICE
)

print(f"Loading SAM ({SAM_ENCODER_VERSION}) on {DEVICE}...")
sam = sam_model_registry[SAM_ENCODER_VERSION](checkpoint=SAM_WEIGHTS_PATH).to(device=DEVICE)
sam_predictor = SamPredictor(sam)

# ==========================================
# DETECTION CONFIG
# ==========================================
# Separate classes — do NOT join into one string.
# DINO matches each independently, giving tighter boxes.
CLASSES = ["face", "hand", "neck"]

BOX_THRESHOLD  = 0.30
TEXT_THRESHOLD = 0.25

# ---- Area guard ----
# Any SAM mask covering more than this fraction of the image is a
# runaway full-body segment — reject it.
MAX_MASK_AREA_FRACTION = 0.18   # face/hand/neck are never >18% of frame


def extract_identity_masks():
    img_files = [f for f in os.listdir(IMG_DIR)
                 if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    print(f"Starting Grounded-SAM Extraction for {len(img_files)} images...")

    for img_name in tqdm(img_files):
        base_name = os.path.splitext(img_name)[0]
        img_path  = os.path.join(IMG_DIR, img_name)

        image_bgr = cv2.imread(img_path)
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        h, w      = image_bgr.shape[:2]
        total_px  = h * w

        final_mask = np.zeros((h, w), dtype=np.uint8)

        # ---- GroundingDINO detection ----
        detections = grounding_dino.predict_with_classes(
            image=image_bgr,
            classes=CLASSES,             # list of separate class strings
            box_threshold=BOX_THRESHOLD,
            text_threshold=TEXT_THRESHOLD
        )

        bboxes = detections.xyxy  # (N, 4) xyxy absolute

        if len(bboxes) == 0:
            cv2.imwrite(os.path.join(IDENTITY_MASK_DIR, f"{base_name}.png"), final_mask)
            continue

        # ---- Filter boxes that are already too large ----
        # A box covering >18% of the image is almost certainly not a
        # face, hand or neck — skip it before even running SAM.
        filtered_boxes = []
        for box in bboxes:
            x1, y1, x2, y2 = box
            box_area = (x2 - x1) * (y2 - y1)
            if box_area / total_px <= MAX_MASK_AREA_FRACTION:
                filtered_boxes.append(box)

        if len(filtered_boxes) == 0:
            cv2.imwrite(os.path.join(IDENTITY_MASK_DIR, f"{base_name}.png"), final_mask)
            continue

        # ---- SAM: pixel-perfect masks from filtered boxes ----
        sam_predictor.set_image(image_rgb)

        input_boxes = torch.tensor(
            np.array(filtered_boxes), device=sam_predictor.device
        )
        transformed_boxes = sam_predictor.transform.apply_boxes_torch(
            input_boxes, image_rgb.shape[:2]
        )

        masks, _, _ = sam_predictor.predict_torch(
            point_coords=None,
            point_labels=None,
            boxes=transformed_boxes,
            multimask_output=False
        )
        # masks: (N, 1, H, W)

        # ---- Per-mask area guard ----
        # Even after SAM, discard any mask that covers too much of the frame.
        # This catches cases where SAM "leaks" from a small box to the whole body.
        for mask_tensor in masks:
            mask_np = mask_tensor.squeeze().cpu().numpy()
            mask_area = mask_np.sum()
            if mask_area / total_px <= MAX_MASK_AREA_FRACTION:
                final_mask[mask_np > 0] = 255
            # else: silently discard — it's a runaway full-body mask

        cv2.imwrite(os.path.join(IDENTITY_MASK_DIR, f"{base_name}.png"), final_mask)


if __name__ == "__main__":
    extract_identity_masks()
    print(f"\nDone! Identity masks saved to: {IDENTITY_MASK_DIR}")