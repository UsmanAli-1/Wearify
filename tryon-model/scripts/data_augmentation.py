import os
import random
from PIL import Image
import torchvision.transforms as T
from tqdm import tqdm

# ================= CONFIGURATION =================
INPUT_DIR = r"../data/images"

OUTPUT_DIR = r"../data/raw_images"

# 3. How many images to generate
NUM_TO_AUGMENT = 232

# 4. Augmentation Settings: Light Jitter
# We keep it subtle (0.1 - 0.2) to simulate lighting changes.
# HUE IS 0. This is critical for Eastern wear so red doesn't become orange.
jitter_transform = T.ColorJitter(
    brightness=0.25,  # ±20% brightness
    contrast=0.20,  # ±15% contrast
    saturation=0.15,  # ±10% saturation
    hue=0.0  # Keep colors true
)


# =================================================

def augment_person_images():
    # Create output directory if it doesn't exist
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Created output directory: {OUTPUT_DIR}")

    # Get list of valid image files
    valid_exts = ('.jpg', '.jpeg', '.png', '.webp')
    all_files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith(valid_exts)]

    total_images = len(all_files)
    if total_images == 0:
        print("Error: No images found in INPUT_DIR.")
        return

    print(f"Found {total_images} original images.")

    # Select images to augment
    # If you have 2500 and want 1500 augmented, we randomly sample 1500.
    if total_images < NUM_TO_AUGMENT:
        print(
            f"Note: You requested {NUM_TO_AUGMENT} but only have {total_images}. Augmenting all available + looping some.")
        # If we need more than we have, we take all + random selection of the rest
        selected_files = all_files + random.choices(all_files, k=NUM_TO_AUGMENT - total_images)
    else:
        selected_files = random.sample(all_files, NUM_TO_AUGMENT)

    print(f"Starting augmentation of {len(selected_files)} images...")

    success_count = 0

    for i, filename in enumerate(tqdm(selected_files)):
        try:
            # Construct paths
            img_path = os.path.join(INPUT_DIR, filename)

            # Open image
            img = Image.open(img_path).convert('RGB')

            # Apply transformation
            aug_img = jitter_transform(img)

            # Create new filename (e.g., "image_001_aug_0.jpg")
            # We add an index 'i' to ensure uniqueness if we looped over images
            name, ext = os.path.splitext(filename)
            new_filename = f"{name}_aug_{i}{ext}"
            save_path = os.path.join(OUTPUT_DIR, new_filename)

            # Save
            aug_img.save(save_path, quality=95)
            success_count += 1

        except Exception as e:
            print(f"Failed to process {filename}: {e}")

    print("------------------------------------------------")
    print(f"Processing Complete.")
    print(f"Originals: {total_images}")
    print(f"New Augmented: {success_count}")
    print(f"Total Dataset Size will be: {total_images + success_count}")
    print(f"Check your new images here: {OUTPUT_DIR}")


if __name__ == "__main__":
    augment_person_images()