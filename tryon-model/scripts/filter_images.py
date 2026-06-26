import os
import shutil

# --- CONFIGURATION ---
# 1. Where did you put the bad green images?
BAD_VIS_FOLDER = r"../dataset_mfp_final_2/bad"

# 2. Where is your main dataset (where the clean images live)?
MAIN_DATASET_IMAGES = r"../data/images"

# 3. Where should we put the clean images to fix?
OUTPUT_FOLDER = r"../dataset_manual/images_to_fix"


def main():
    # Create output folder
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)

    # Get list of bad files
    bad_files = os.listdir(BAD_VIS_FOLDER)
    print(f"--- Found {len(bad_files)} bad images in '{BAD_VIS_FOLDER}' ---")

    found_count = 0
    missing_count = 0

    for filename in bad_files:
        # Skip system files like .DS_Store
        if not filename.lower().endswith(('.jpg', '.png', '.jpeg')):
            continue

        # The filename in 'vis' should match the filename in 'images'
        # e.g., "photo1.jpg" in vis -> "photo1.jpg" in images

        # Construct path to the CLEAN original
        src_path = os.path.join(MAIN_DATASET_IMAGES, filename)

        # Handle potential extension mismatch (e.g. vis is png, raw is jpg)
        if not os.path.exists(src_path):
            # Try swapping extension
            name_base = os.path.splitext(filename)[0]
            for ext in ['.jpg', '.png', '.jpeg']:
                test_path = os.path.join(MAIN_DATASET_IMAGES, name_base + ext)
                if os.path.exists(test_path):
                    src_path = test_path
                    break

        # Copy if found
        if os.path.exists(src_path):
            dst_path = os.path.join(OUTPUT_FOLDER, os.path.basename(src_path))
            shutil.copy2(src_path, dst_path)
            # print(f"Retrieved: {filename}")
            found_count += 1
        else:
            print(f"WARNING: Could not find original for {filename}")
            missing_count += 1

    print("-" * 30)
    print(f"Done! Retrieved {found_count} clean images.")
    if missing_count > 0:
        print(f"Failed to find {missing_count} images.")

    print(f"\nNext Step: Run 'labeling_tool.py' on the '{OUTPUT_FOLDER}' folder.")


if __name__ == "__main__":
    main()