from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import anthropic
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import cv2
import tempfile
import os
import base64
import urllib.request

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

MODEL_PATH = "pose_landmarker_full.task"
if not os.path.exists(MODEL_PATH):
    print("Downloading pose model...")
    urllib.request.urlretrieve(
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
        MODEL_PATH
    )
    print("Model downloaded.")

def extract_key_frames(video_path: str, num_frames: int = 8):
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    interval = max(total_frames // num_frames, 1)
    frames = []
    for i in range(num_frames):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i * interval)
        ret, frame = cap.read()
        if ret:
            frames.append(frame)
    cap.release()
    return frames

def analyze_pose(frame):
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.PoseLandmarkerOptions(base_options=base_options)
    detector = vision.PoseLandmarker.create_from_options(options)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = detector.detect(mp_image)

    if result.pose_landmarks:
        for landmark in result.pose_landmarks[0]:
            h, w = frame.shape[:2]
            cx, cy = int(landmark.x * w), int(landmark.y * h)
            cv2.circle(frame, (cx, cy), 5, (0, 255, 0), -1)

    return frame, result.pose_landmarks

def frame_to_base64(frame):
    _, buffer = cv2.imencode('.jpg', frame)
    return base64.b64encode(buffer).decode('utf-8')

@app.post("/analyze")
async def analyze_swing(
    video: UploadFile = File(...),
    view: str = "face-on"
):
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
        content = await video.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        frames = extract_key_frames(tmp_path)
        analyzed_frames = []

        for frame in frames:
            analyzed_frame, landmarks = analyze_pose(frame)
            analyzed_frames.append(frame_to_base64(analyzed_frame))

        image_content = []
        for frame_b64 in analyzed_frames[:4]:
            image_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": frame_b64
                }
            })

        image_content.append({
            "type": "text",
            "text": f"""You are an expert PGA golf instructor analyzing a {view} view golf swing.

Analyze these key frames and provide detailed coaching feedback.
Respond ONLY with a JSON object with these exact keys:
{{
    "overall": <number 0-100>,
    "categories": {{
        "setup": {{"score": <0-100>, "feedback": "<2-3 sentences>"}},
        "backswing": {{"score": <0-100>, "feedback": "<2-3 sentences>"}},
        "downswing": {{"score": <0-100>, "feedback": "<2-3 sentences>"}},
        "impact": {{"score": <0-100>, "feedback": "<2-3 sentences>"}},
        "follow_through": {{"score": <0-100>, "feedback": "<2-3 sentences>"}}
    }},
    "top_priority": "<the single most impactful thing to fix>",
    "drill": {{
        "name": "<drill name>",
        "description": "<3-4 sentence drill explanation>"
    }},
    "summary": "<3-4 sentence overall assessment>"
}}"""
        })

        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1500,
            messages=[{"role": "user", "content": image_content}]
        )

        import json
        text = response.content[0].text
        clean = text.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean)
        result["frames"] = analyzed_frames[:4]

        return result

    finally:
        os.unlink(tmp_path)