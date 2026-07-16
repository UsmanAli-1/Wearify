import os , cv2
import numpy as np
from tqdm import tqdm

images = r"..\\..\\own\\images"
output = r"..\..\own\images_resized"
os.makedirs(output, exist_ok=True)

# for img in tqdm(os.listdir(images)):
#     if img.lower().endswith((".jpg","jpeg",".JPG",".png")):
#         path = os.path.join(images, img)
#         img_data = cv2.imread(path, cv2.IMREAD_UNCHANGED)
#         h, w  = img_data.shape[:2]
#         maxLength = max(h,w)
#         start = (max(h,w) - min(h,w))/2
#         end = (start + (min(h,w)))
#         if img .endswith((".jpg",".JPG",".jpeg")):
#             black_image = np.zeros((maxLength, maxLength, 3), np.uint8)
#             black_image[0:int(maxLength), int(start):int(end)] = img_data
#         else :
#             black_image = np.zeros((maxLength, maxLength, 4), np.uint8)
#             black_image[0:int(maxLength), int(start):int(end)] = img_data
#         resized_image = cv2.resize(black_image, (512,512), interpolation=cv2.INTER_AREA)
#         cv2.imwrite(os.path.join(output,img),resized_image)


for img in tqdm(os.listdir(images)):
    if img.lower().endswith((".jpg", ".jpeg", ".png")):
        path = os.path.join(images, img)
        img_data = cv2.imread(path, cv2.IMREAD_UNCHANGED)

        # Guard against corrupted files (the "Premature end of JPEG" warning)
        if img_data is None:
            continue

        h, w = img_data.shape[:2]
        # Determine the number of channels (3 for RGB, 4 for RGBA)
        channels = img_data.shape[2] if len(img_data.shape) > 2 else 1

        maxLength = max(h, w)
        start = int((maxLength - min(h, w)) / 2)
        end = int(start + min(h, w))

        # Dynamically create the black background based on the actual image channels
        black_image = np.zeros((maxLength, maxLength, channels), np.uint8)

        # Handle Landscape vs Portrait centering
        if h > w:
            # Portrait: padding the sides
            black_image[0:h, start:end] = img_data
        else:
            # Landscape: padding the top/bottom
            black_image[start:end, 0:w] = img_data

        resized_image = cv2.resize(black_image, (512, 512), interpolation=cv2.INTER_AREA)
        cv2.imwrite(os.path.join(output, img), resized_image)