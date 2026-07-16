import os
import cv2
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import SegformerForSemanticSegmentation, SegformerImageProcessor
from torch.optim import AdamW
from tqdm import tqdm
from PIL import Image

# --- CONFIGURATION ---
MANUAL_DATA_DIR = r"../dataset_manual"
OUTPUT_MODEL_DIR = r"../my_custom_segformer_v5"
EPOCHS = 50  # Increased epochs
BATCH_SIZE = 4
LR = 0.0002  # Increased LR (2e-4)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class KurtaDataset(Dataset):
    def __init__(self, root_dir, processor):
        self.root = root_dir
        self.processor = processor
        self.images = sorted([f for f in os.listdir(os.path.join(root_dir, "images")) if f.endswith(('.jpg', '.png'))])
        self.masks = sorted([f for f in os.listdir(os.path.join(root_dir, "masks")) if f.endswith('.png')])

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img_path = os.path.join(self.root, "images", self.images[idx])
        mask_path = os.path.join(self.root, "masks", self.masks[idx])

        image = Image.open(img_path).convert("RGB")
        mask = Image.open(mask_path).convert("L")

        # Ensure mask is binary (0, 1)
        mask_np = np.array(mask)
        mask_np = (mask_np > 127).astype(np.int64)  # 0 or 1

        # Processor handles normalization
        inputs = self.processor(images=image, return_tensors="pt")

        # We handle labels manually to ensure they aren't resized weirdly
        # Resize mask to 128x128 (SegFormer B0 output size)
        # This is CRITICAL. The model outputs 1/4th resolution.
        mask_tensor = torch.tensor(mask_np).unsqueeze(0).unsqueeze(0).float()
        mask_resized = torch.nn.functional.interpolate(mask_tensor, size=(128, 128), mode="nearest")
        labels = mask_resized.squeeze().long()

        inputs["labels"] = labels

        # Remove batch dim from processor
        inputs = {k: v.squeeze(0) for k, v in inputs.items()}
        return inputs


def save_debug_image(model, dataset, epoch):
    """Visualizes one prediction during training"""
    model.eval()
    idx = 0  # Always check the first image
    sample = dataset[idx]

    # Unsqueeze to make batch
    inputs = {k: v.unsqueeze(0).to(DEVICE) for k, v in sample.items() if k != "labels"}

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits  # [1, 2, 128, 128]

    # Get Probability of Kurta (Class 1)
    probs = torch.nn.functional.softmax(logits, dim=1)
    kurta_prob = probs[0, 1].cpu().numpy()

    # Save Heatmap
    heatmap = (kurta_prob * 255).astype(np.uint8)
    heatmap_color = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    cv2.imwrite(f"debug_train_epoch_{epoch}.png", heatmap_color)
    model.train()


def main():
    print(f"--- Retraining SegFormer V5 on {DEVICE} ---")

    # 1. Load Model & Processor
    model_name = "nvidia/mit-b0"
    processor = SegformerImageProcessor.from_pretrained(model_name)
    model = SegformerForSemanticSegmentation.from_pretrained(
        model_name,
        num_labels=2,
        id2label={0: "background", 1: "kurta"},
        label2id={"background": 0, "kurta": 1}
    ).to(DEVICE)

    dataset = KurtaDataset(MANUAL_DATA_DIR, processor)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    optimizer = AdamW(model.parameters(), lr=LR)

    # 2. Define Weighted Loss
    # We give Class 1 (Kurta) 10x more weight than Background
    class_weights = torch.tensor([1.0, 10.0]).to(DEVICE)
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    # 3. Training Loop
    model.train()
    for epoch in range(EPOCHS):
        epoch_loss = 0
        for batch in tqdm(dataloader, desc=f"Epoch {epoch + 1}"):
            pixel_values = batch["pixel_values"].to(DEVICE)
            labels = batch["labels"].to(DEVICE)

            outputs = model(pixel_values=pixel_values)
            logits = outputs.logits  # [B, 2, 128, 128]

            # Calculate Weighted Loss
            loss = criterion(logits, labels)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()

        avg_loss = epoch_loss / len(dataloader)
        print(f"Epoch {epoch + 1} Loss: {avg_loss:.4f}")

        # Save visualization every 5 epochs
        if (epoch + 1) % 5 == 0:
            save_debug_image(model, dataset, epoch + 1)

    # 4. Save
    print("Saving V5 model...")
    model.save_pretrained(OUTPUT_MODEL_DIR)
    processor.save_pretrained(OUTPUT_MODEL_DIR)
    print(f"Done! Saved to '{OUTPUT_MODEL_DIR}'.")
    print("Check the 'debug_train_epoch_X.png' images to verify it learned!")


if __name__ == "__main__":
    main()