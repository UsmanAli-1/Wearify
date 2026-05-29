from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from ultralytics import YOLO

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


# YOLO is used for person validation only
yolo = YOLO("yolov8n.pt")


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
        "white", "light-yellow", "light-orange",
        "light-green", "light-red", "light-blue", "off-white", "cream", "lilac",
    ],
}


# Haar fallback face detector
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


# MediaPipe primary face detector
if MEDIAPIPE_AVAILABLE:
    mp_face_detection = mp.solutions.face_detection
    face_detector = mp_face_detection.FaceDetection(
        model_selection=1,
        min_detection_confidence=0.25
    )
else:
    face_detector = None


def white_balance_gray_world(img_rgb):
    """Reduce color cast from lighting before skin analysis."""
    img = img_rgb.astype(np.float32)
    avg = np.mean(img, axis=(0, 1))
    gray = np.mean(avg)

    img[:, :, 0] *= gray / (avg[0] + 1e-6)
    img[:, :, 1] *= gray / (avg[1] + 1e-6)
    img[:, :, 2] *= gray / (avg[2] + 1e-6)

    return np.clip(img, 0, 255).astype(np.uint8)


def validate_single_person(image_bgr):
    """
    Suggestion validation:
    - reject random objects
    - reject group images
    - accept one main person
    """
    results = yolo(image_bgr, verbose=False)[0]

    people = [
        box for box in results.boxes
        if int(box.cls) == 0 and float(box.conf) > 0.5
    ]

    if len(people) == 0:
        return {
            "valid": False,
            "reason": "no_person_detected",
            "message": "No person detected. Please upload a clear photo of one person."
        }

    people = sorted(
        people,
        key=lambda b: (b.xyxy[0][2] - b.xyxy[0][0]) *
                      (b.xyxy[0][3] - b.xyxy[0][1]),
        reverse=True
    )

    if len(people) > 1:
        largest_area = (
            (people[0].xyxy[0][2] - people[0].xyxy[0][0]) *
            (people[0].xyxy[0][3] - people[0].xyxy[0][1])
        )

        second_area = (
            (people[1].xyxy[0][2] - people[1].xyxy[0][0]) *
            (people[1].xyxy[0][3] - people[1].xyxy[0][1])
        )

        # Same logic as your working AI validation:
        # reject only if second person is significant
        if second_area / largest_area > 0.35:
            return {
                "valid": False,
                "reason": "multiple_people",
                "message": "Multiple people detected. Please upload an image with only one main person."
            }

    x1, y1, x2, y2 = people[0].xyxy[0].tolist()

    return {
        "valid": True,
        "person_box": [int(x1), int(y1), int(x2), int(y2)]
    }


def detect_faces(img_rgb):
    """
    Face detection is used only for better skin crop.
    It is NOT used for rejecting the image.
    """
    h, w = img_rgb.shape[:2]
    faces = []

    # Primary: MediaPipe face detection
    if MEDIAPIPE_AVAILABLE and face_detector is not None:
        results = face_detector.process(img_rgb)

        if results.detections:
            for detection in results.detections:
                box = detection.location_data.relative_bounding_box

                x = int(box.xmin * w)
                y = int(box.ymin * h)
                fw = int(box.width * w)
                fh = int(box.height * h)

                x = max(0, x)
                y = max(0, y)
                fw = min(w - x, fw)
                fh = min(h - y, fh)

                # allow smaller event/wedding faces
                if fw * fh > (w * h) * 0.002:
                    faces.append((x, y, fw, fh))

            if len(faces) > 0:
                print(f"Faces detected by MediaPipe: {len(faces)}")
                return faces

    # Fallback: Haar Cascade
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    haar_faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.08,
        minNeighbors=3,
        minSize=(20, 20)
    )

    for (x, y, fw, fh) in haar_faces:
        if fw * fh > (w * h) * 0.002:
            faces.append((x, y, fw, fh))

    print(f"Faces detected by Haar Cascade: {len(faces)}")
    return faces


def get_cheek_crop(img_rgb, face_box):
    """Extract cheek region when face is detected."""
    h, w = img_rgb.shape[:2]
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


def get_person_face_fallback_crop(img_rgb, person_box):
    """
    Fallback crop when face detector fails.
    Uses upper region of YOLO person box.
    """
    h, w = img_rgb.shape[:2]
    x1, y1, x2, y2 = person_box

    person_w = x2 - x1
    person_h = y2 - y1

    crop_x1 = x1 + int(person_w * 0.25)
    crop_x2 = x1 + int(person_w * 0.75)

    crop_y1 = y1 + int(person_h * 0.04)
    crop_y2 = y1 + int(person_h * 0.33)

    crop_x1 = max(0, crop_x1)
    crop_x2 = min(w, crop_x2)

    crop_y1 = max(0, crop_y1)
    crop_y2 = min(h, crop_y2)

    print("Face not detected or not reliable, using upper-person fallback crop")

    return img_rgb[crop_y1:crop_y2, crop_x1:crop_x2]


def get_skin_mask(face_crop):
    """Extract likely skin pixels using HSV and YCrCb masks."""
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
    """Classify into fair, medium, dark using LAB + gender-aware thresholds."""
    skin_pixels_count = int(np.count_nonzero(mask))
    print(f"Skin pixels found: {skin_pixels_count}")

    if skin_pixels_count < 30:
        print("Low skin pixels. Using full crop fallback.")
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

    # Male: stable thresholds
    if gender == "male":
        if median_l >= 67 and ita >= 35:
            return "fair"

        if median_l <= 52 or ita <= 8:
            return "dark"

        return "medium"

    # Female: relaxed fair threshold
    if gender == "female":
        if median_l >= 58 and ita >= 18:
            return "fair"

        if median_l <= 43 or ita <= -5:
            return "dark"

        return "medium"

    # Fallback thresholds
    if median_l >= 63 and ita >= 25:
        return "fair"

    if median_l <= 50 or ita <= 5:
        return "dark"

    return "medium"


@app.post("/suggest-outfits")
async def suggest_outfits(
    file: UploadFile = File(...),
    gender: str = Form(...)
):
    image_bytes = await file.read()

    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if img is None:
        return {
            "success": False,
            "reason": "invalid_image",
            "message": "Invalid image file. Please upload a clear photo."
        }

    # 1. Validate image has one main person
    validation = validate_single_person(img)

    if not validation["valid"]:
        return {
            "success": False,
            "reason": validation["reason"],
            "message": validation["message"]
        }

    # 2. Convert and normalize
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_rgb = white_balance_gray_world(img_rgb)

    # 3. Try face detection
    faces = detect_faces(img_rgb)

    # IMPORTANT:
    # Do not reject based on face count here.
    # YOLO already handled group/person validation.
    # Face detection is only for better crop.

    if len(faces) >= 1:
        faces = sorted(
            faces,
            key=lambda f: f[2] * f[3],
            reverse=True
        )
        face_crop = get_cheek_crop(img_rgb, faces[0])
    else:
        face_crop = get_person_face_fallback_crop(
            img_rgb,
            validation["person_box"]
        )

    if face_crop.size == 0:
        return {
            "success": False,
            "reason": "face_crop_failed",
            "message": "Could not analyze the person properly. Please try another image."
        }

    # 4. Skin tone analysis
    mask = get_skin_mask(face_crop)
    skin_tone = classify_skin_tone(face_crop, mask, gender)
    suggested_colors = SKIN_TO_COLORS[skin_tone]

    print("\n========== AI OUTFIT SUGGESTION ==========")
    print(f"Detected Skin Tone: {skin_tone}")
    print(f"Recommended Garment Colors: {suggested_colors}")
    print(f"Gender: {gender}")
    print("==========================================\n")

    return {
        "success": True,
        "skin_tone": skin_tone,
        "suggested_colors": suggested_colors,
        "gender": gender
    }


@app.get("/")
async def home():
    return {"message": "AI Suggestion API Running"}


@app.get("/health")
async def health():
    return {"status": "ok"}