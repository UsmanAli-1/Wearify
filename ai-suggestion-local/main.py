
# from fastapi import FastAPI, UploadFile, File, Form
# from fastapi.middleware.cors import CORSMiddleware
# import cv2
# import numpy as np

# try:
#     import mediapipe as mp
#     MEDIAPIPE_AVAILABLE = True
# except Exception:
#     MEDIAPIPE_AVAILABLE = False

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# SKIN_TO_COLORS = {
#     "fair": [
#         "dark-blue", "dark-green", "dark-red", "purple", "dark-purple",
#         "black", "blue", "dark-brown", "lilac", "olive-green",
#     ],
#     "medium": [
#         "orange", "dark-orange", "brown", "dark-brown", "green",
#         "dark-green", "blue", "dark-blue", "olive-green", "cream",
#     ],
#     "dark": [
#         "white", "light-yellow", "yellow", "light-orange", "orange",
#         "light-green", "light-red", "light-blue", "off-white", "cream", "lilac",
#     ],
# }

# face_cascade = cv2.CascadeClassifier(
#     cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
# )

# if MEDIAPIPE_AVAILABLE:
#     mp_face_detection = mp.solutions.face_detection
#     face_detector = mp_face_detection.FaceDetection(
#         model_selection=1,
#         min_detection_confidence=0.45
#     )
# else:
#     face_detector = None


# def white_balance_gray_world(img_rgb):
#     img = img_rgb.astype(np.float32)
#     avg = np.mean(img, axis=(0, 1))
#     gray = np.mean(avg)

#     img[:, :, 0] *= gray / (avg[0] + 1e-6)
#     img[:, :, 1] *= gray / (avg[1] + 1e-6)
#     img[:, :, 2] *= gray / (avg[2] + 1e-6)

#     return np.clip(img, 0, 255).astype(np.uint8)


# def detect_face(img_rgb):
#     h, w = img_rgb.shape[:2]

#     # First try MediaPipe
#     if MEDIAPIPE_AVAILABLE and face_detector is not None:
#         results = face_detector.process(img_rgb)

#         if results.detections:
#             detection = results.detections[0]
#             box = detection.location_data.relative_bounding_box

#             x = int(box.xmin * w)
#             y = int(box.ymin * h)
#             fw = int(box.width * w)
#             fh = int(box.height * h)

#             x = max(0, x)
#             y = max(0, y)
#             fw = min(w - x, fw)
#             fh = min(h - y, fh)

#             print(f"Face detected by MediaPipe: ({x},{y}) size={fw}x{fh}")
#             return x, y, fw, fh

#     # Fallback to Haar Cascade
#     gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
#     faces = face_cascade.detectMultiScale(
#         gray,
#         scaleFactor=1.1,
#         minNeighbors=5,
#         minSize=(30, 30)
#     )

#     if len(faces) > 0:
#         faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
#         x, y, fw, fh = faces[0]
#         print(f"Face detected by Haar Cascade: ({x},{y}) size={fw}x{fh}")
#         return x, y, fw, fh

#     print("No face detected")
#     return None


# def get_cheek_crop(img_rgb, face_box):
#     h, w = img_rgb.shape[:2]

#     if face_box is None:
#         # fallback top-center crop
#         return img_rgb[
#             int(h * 0.08): int(h * 0.40),
#             int(w * 0.25): int(w * 0.75)
#         ]

#     x, y, fw, fh = face_box

#     # Cheek area only: avoids hair, eyes, lips, beard, forehead shine
#     y1 = y + int(fh * 0.38)
#     y2 = y + int(fh * 0.72)

#     left_x1 = x + int(fw * 0.18)
#     left_x2 = x + int(fw * 0.42)

#     right_x1 = x + int(fw * 0.58)
#     right_x2 = x + int(fw * 0.82)

#     y1 = max(0, y1)
#     y2 = min(h, y2)

#     left_x1 = max(0, left_x1)
#     left_x2 = min(w, left_x2)
#     right_x1 = max(0, right_x1)
#     right_x2 = min(w, right_x2)

#     left_cheek = img_rgb[y1:y2, left_x1:left_x2]
#     right_cheek = img_rgb[y1:y2, right_x1:right_x2]

#     if left_cheek.size == 0 and right_cheek.size == 0:
#         return img_rgb[y:y + fh, x:x + fw]

#     if left_cheek.size == 0:
#         return right_cheek

#     if right_cheek.size == 0:
#         return left_cheek

#     return np.concatenate([left_cheek, right_cheek], axis=1)


# def get_skin_mask(face_crop):
#     hsv = cv2.cvtColor(face_crop, cv2.COLOR_RGB2HSV)
#     ycrcb = cv2.cvtColor(face_crop, cv2.COLOR_RGB2YCrCb)

#     # HSV skin range
#     hsv_lower1 = np.array([0, 15, 35], dtype=np.uint8)
#     hsv_upper1 = np.array([30, 210, 255], dtype=np.uint8)

#     hsv_lower2 = np.array([160, 15, 35], dtype=np.uint8)
#     hsv_upper2 = np.array([180, 210, 255], dtype=np.uint8)

#     hsv_mask1 = cv2.inRange(hsv, hsv_lower1, hsv_upper1)
#     hsv_mask2 = cv2.inRange(hsv, hsv_lower2, hsv_upper2)
#     hsv_mask = cv2.bitwise_or(hsv_mask1, hsv_mask2)

#     # YCrCb skin range
#     ycrcb_lower = np.array([0, 133, 77], dtype=np.uint8)
#     ycrcb_upper = np.array([255, 173, 127], dtype=np.uint8)
#     ycrcb_mask = cv2.inRange(ycrcb, ycrcb_lower, ycrcb_upper)

#     # combine both masks
#     mask = cv2.bitwise_and(hsv_mask, ycrcb_mask)

#     kernel = np.ones((3, 3), np.uint8)
#     mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
#     mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

#     return mask


# def classify_skin_tone(face_crop, mask):
#     skin_pixels_count = int(np.count_nonzero(mask))
#     print(f"Skin pixels found: {skin_pixels_count}")

#     if skin_pixels_count < 30:
#         print("Very low skin pixels. Using full cheek crop fallback.")
#         mask = np.ones(face_crop.shape[:2], dtype=np.uint8) * 255

#     lab = cv2.cvtColor(face_crop, cv2.COLOR_RGB2LAB)
#     skin_lab = lab[mask > 0]

#     L = skin_lab[:, 0].astype(float) * (100 / 255)
#     A = skin_lab[:, 1].astype(float) - 128
#     B = skin_lab[:, 2].astype(float) - 128

#     # Use median/percentile instead of mean to reduce effect of lighting/shadows
#     median_l = float(np.median(L))
#     p35_l = float(np.percentile(L, 35))
#     p65_l = float(np.percentile(L, 65))
#     mean_b = float(np.mean(B))

#     if mean_b == 0:
#         mean_b = 0.001

#     ita = float(np.degrees(np.arctan2((median_l - 50), mean_b)))

#     print(f"Median L: {median_l:.2f}")
#     print(f"P35 L: {p35_l:.2f}")
#     print(f"P65 L: {p65_l:.2f}")
#     print(f"Mean B: {mean_b:.2f}")
#     print(f"ITA: {ita:.2f}")

#     # 3-class safer logic for FYP demo
#     if median_l >= 67 and ita >= 35:
#         return "fair"

#     if median_l <= 52 or ita <= 8:
#         return "dark"

#     return "medium"


# def get_skin_tone(image_bytes: bytes) -> str:
#     arr = np.frombuffer(image_bytes, np.uint8)
#     img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

#     if img is None:
#         return "medium"

#     img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

#     # Normalize lighting/color cast
#     img_rgb = white_balance_gray_world(img_rgb)

#     face_box = detect_face(img_rgb)
#     face_crop = get_cheek_crop(img_rgb, face_box)

#     if face_crop.size == 0:
#         return "medium"

#     mask = get_skin_mask(face_crop)
#     tone = classify_skin_tone(face_crop, mask)

#     return tone


# @app.post("/suggest-outfits")
# async def suggest_outfits(
#     file: UploadFile = File(...),
#     gender: str = Form(...)
# ):
#     image_bytes = await file.read()

#     skin_tone = get_skin_tone(image_bytes)
#     suggested_colors = SKIN_TO_COLORS[skin_tone]

#     print("\n========== AI OUTFIT SUGGESTION ==========")
#     print(f"Detected Skin Tone: {skin_tone}")
#     print(f"Recommended Garment Colors: {suggested_colors}")
#     print(f"Gender: {gender}")
#     print("==========================================\n")

#     return {
#         "skin_tone": skin_tone,
#         "suggested_colors": suggested_colors,
#         "gender": gender
#     }


# @app.get("/")
# async def home():
#     return {"message": "AI Suggestion API Running"}











# ========================================================================================================









from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except Exception:
    MEDIAPIPE_AVAILABLE = False

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SKIN_TO_COLORS = {
    "fair": [
        "dark-blue", "dark-green", "dark-red", "purple", "dark-purple",
        "black", "blue", "dark-brown", "lilac", "olive-green",
    ],
    "medium": [
        "orange", "dark-orange", "brown", "dark-brown", "green",
        "dark-green", "blue", "dark-blue", "olive-green", "cream",
    ],
    "dark": [
        "white", "light-yellow" , "light-orange",
        "light-green", "light-red", "light-blue", "off-white", "cream", "lilac",
    ],
}

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

if MEDIAPIPE_AVAILABLE:
    mp_face_detection = mp.solutions.face_detection
    face_detector = mp_face_detection.FaceDetection(
        model_selection=1,
        min_detection_confidence=0.45
    )
else:
    face_detector = None


def white_balance_gray_world(img_rgb):
    img = img_rgb.astype(np.float32)
    avg = np.mean(img, axis=(0, 1))
    gray = np.mean(avg)

    img[:, :, 0] *= gray / (avg[0] + 1e-6)
    img[:, :, 1] *= gray / (avg[1] + 1e-6)
    img[:, :, 2] *= gray / (avg[2] + 1e-6)

    return np.clip(img, 0, 255).astype(np.uint8)


def detect_face(img_rgb):
    h, w = img_rgb.shape[:2]

    if MEDIAPIPE_AVAILABLE and face_detector is not None:
        results = face_detector.process(img_rgb)

        if results.detections:
            detection = results.detections[0]
            box = detection.location_data.relative_bounding_box

            x = int(box.xmin * w)
            y = int(box.ymin * h)
            fw = int(box.width * w)
            fh = int(box.height * h)

            x = max(0, x)
            y = max(0, y)
            fw = min(w - x, fw)
            fh = min(h - y, fh)

            print(f"Face detected by MediaPipe: ({x},{y}) size={fw}x{fh}")
            return x, y, fw, fh

    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30)
    )

    if len(faces) > 0:
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, fw, fh = faces[0]
        print(f"Face detected by Haar Cascade: ({x},{y}) size={fw}x{fh}")
        return x, y, fw, fh

    print("No face detected")
    return None


def get_cheek_crop(img_rgb, face_box):
    h, w = img_rgb.shape[:2]

    if face_box is None:
        return img_rgb[
            int(h * 0.08): int(h * 0.40),
            int(w * 0.25): int(w * 0.75)
        ]

    x, y, fw, fh = face_box

    y1 = y + int(fh * 0.38)
    y2 = y + int(fh * 0.72)

    left_x1 = x + int(fw * 0.18)
    left_x2 = x + int(fw * 0.42)

    right_x1 = x + int(fw * 0.58)
    right_x2 = x + int(fw * 0.82)

    y1 = max(0, y1)
    y2 = min(h, y2)

    left_x1 = max(0, left_x1)
    left_x2 = min(w, left_x2)
    right_x1 = max(0, right_x1)
    right_x2 = min(w, right_x2)

    left_cheek = img_rgb[y1:y2, left_x1:left_x2]
    right_cheek = img_rgb[y1:y2, right_x1:right_x2]

    if left_cheek.size == 0 and right_cheek.size == 0:
        return img_rgb[y:y + fh, x:x + fw]

    if left_cheek.size == 0:
        return right_cheek

    if right_cheek.size == 0:
        return left_cheek

    return np.concatenate([left_cheek, right_cheek], axis=1)


def get_skin_mask(face_crop):
    hsv = cv2.cvtColor(face_crop, cv2.COLOR_RGB2HSV)
    ycrcb = cv2.cvtColor(face_crop, cv2.COLOR_RGB2YCrCb)

    hsv_lower1 = np.array([0, 15, 35], dtype=np.uint8)
    hsv_upper1 = np.array([30, 210, 255], dtype=np.uint8)

    hsv_lower2 = np.array([160, 15, 35], dtype=np.uint8)
    hsv_upper2 = np.array([180, 210, 255], dtype=np.uint8)

    hsv_mask1 = cv2.inRange(hsv, hsv_lower1, hsv_upper1)
    hsv_mask2 = cv2.inRange(hsv, hsv_lower2, hsv_upper2)
    hsv_mask = cv2.bitwise_or(hsv_mask1, hsv_mask2)

    ycrcb_lower = np.array([0, 133, 77], dtype=np.uint8)
    ycrcb_upper = np.array([255, 173, 127], dtype=np.uint8)
    ycrcb_mask = cv2.inRange(ycrcb, ycrcb_lower, ycrcb_upper)

    mask = cv2.bitwise_and(hsv_mask, ycrcb_mask)

    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    return mask


def classify_skin_tone(face_crop, mask, gender):
    skin_pixels_count = int(np.count_nonzero(mask))
    print(f"Skin pixels found: {skin_pixels_count}")

    if skin_pixels_count < 30:
        print("Low skin pixels. Using cheek crop fallback.")
        mask = np.ones(face_crop.shape[:2], dtype=np.uint8) * 255

    lab = cv2.cvtColor(face_crop, cv2.COLOR_RGB2LAB)
    skin_lab = lab[mask > 0]

    L = skin_lab[:, 0].astype(float) * (100 / 255)
    B = skin_lab[:, 2].astype(float) - 128

    median_l = float(np.median(L))
    p35_l = float(np.percentile(L, 35))
    p65_l = float(np.percentile(L, 65))
    mean_b = float(np.mean(B))

    if mean_b == 0:
        mean_b = 0.001

    ita = float(np.degrees(np.arctan2((median_l - 50), mean_b)))

    print(f"Gender: {gender}")
    print(f"Median L: {median_l:.2f}")
    print(f"P35 L: {p35_l:.2f}")
    print(f"P65 L: {p65_l:.2f}")
    print(f"Mean B: {mean_b:.2f}")
    print(f"ITA: {ita:.2f}")

    gender = gender.lower().strip()

    # Male: stricter / stable thresholds
    if gender == "male":
        if median_l >= 67 and ita >= 35:
            return "fair"

        if median_l <= 52 or ita <= 8:
            return "dark"

        return "medium"

    # Female: softer fair threshold
    if gender == "female":
        if median_l >= 58 and ita >= 18:
            return "fair"

        if median_l <= 43 or ita <= -5:
            return "dark"

        return "medium"

    # fallback
    if median_l >= 63 and ita >= 25:
        return "fair"

    if median_l <= 50 or ita <= 5:
        return "dark"

    return "medium"


def get_skin_tone(image_bytes: bytes, gender: str) -> str:
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if img is None:
        return "medium"

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_rgb = white_balance_gray_world(img_rgb)

    face_box = detect_face(img_rgb)
    face_crop = get_cheek_crop(img_rgb, face_box)

    if face_crop.size == 0:
        return "medium"

    mask = get_skin_mask(face_crop)
    tone = classify_skin_tone(face_crop, mask, gender)

    return tone


@app.post("/suggest-outfits")
async def suggest_outfits(
    file: UploadFile = File(...),
    gender: str = Form(...)
):
    image_bytes = await file.read()

    skin_tone = get_skin_tone(image_bytes, gender)
    suggested_colors = SKIN_TO_COLORS[skin_tone]

    print("\n========== AI OUTFIT SUGGESTION ==========")
    print(f"Detected Skin Tone: {skin_tone}")
    print(f"Recommended Garment Colors: {suggested_colors}")
    print(f"Gender: {gender}")
    print("==========================================\n")

    return {
        "skin_tone": skin_tone,
        "suggested_colors": suggested_colors,
        "gender": gender
    }


@app.get("/")
async def home():
    return {"message": "AI Suggestion API Running"}











