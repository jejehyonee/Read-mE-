from flask import Flask, render_template, request, jsonify, Response
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
import threading
import time
import random
import urllib.request
import os

app = Flask(__name__)

# ── model download ───────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'face_landmarker.task')
MODEL_URL  = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

if not os.path.exists(MODEL_PATH):
    print('Downloading face_landmarker.task model...')
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print('Download complete.')

# ── face landmarker (with refined iris landmarks 468-477) ─
_options = mp_vision.FaceLandmarkerOptions(
    base_options=mp_python.BaseOptions(model_asset_path=MODEL_PATH),
    num_faces=1,
    min_face_detection_confidence=0.5,
    min_face_presence_confidence=0.5,
    min_tracking_confidence=0.5,
)
_face_detector = mp_vision.FaceLandmarker.create_from_options(_options)

# ── shared state ─────────────────────────────────────────
_frame_lock          = threading.Lock()
_latest_frame        = None
face_detected        = False
current_gaze         = 'center'
total_hover_switches = 0
pixelation_active    = False
pixelation_step      = 0

_STEP_RES   = {1: 64, 2: 32, 3: 16}
_STEP_LABEL = {0: 'original', 1: '64x64', 2: '32x32', 3: '16x16'}

def _run_pixelation():
    global pixelation_step
    for step in range(1, 4):
        time.sleep(0.5)
        pixelation_step = step

threading.Thread(target=_run_pixelation, daemon=True).start if False else None

IRIS_L = 468
IRIS_R = 473

def _camera_loop():
    global _latest_frame
    cap = cv2.VideoCapture(0, cv2.CAP_AVFOUNDATION)
    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            time.sleep(0.01)
            continue
        with _frame_lock:
            _latest_frame = frame.copy()

threading.Thread(target=_camera_loop, daemon=True).start()

# ── MJPEG generator ──────────────────────────────────────
def _gen_frames():
    global face_detected, current_gaze

    while True:
        with _frame_lock:
            frame = _latest_frame
        if frame is None:
            time.sleep(0.01)
            continue
        frame = frame.copy()

        frame  = cv2.flip(frame, 1)
        rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = _face_detector.detect(mp_img)

        face_detected = bool(result.face_landmarks)

        if result.face_landmarks:
            h, w = frame.shape[:2]
            lms  = result.face_landmarks[0]

            # ── bounding box coords ───────────────────────
            xs = [lm.x * w for lm in lms]
            ys = [lm.y * h for lm in lms]
            x1, y1 = max(int(min(xs)), 0), max(int(min(ys)), 0)
            x2, y2 = min(int(max(xs)), w), min(int(max(ys)), h)

            # ── pixelation ────────────────────────────────
            if pixelation_active and pixelation_step in _STEP_RES:
                res      = _STEP_RES[pixelation_step]
                fw, fh   = x2 - x1, y2 - y1
                if fw > 0 and fh > 0:
                    region   = frame[y1:y2, x1:x2]
                    small    = cv2.resize(region, (res, res), interpolation=cv2.INTER_LINEAR)
                    pixelated = cv2.resize(small, (fw, fh), interpolation=cv2.INTER_NEAREST)
                    frame[y1:y2, x1:x2] = pixelated

            cv2.rectangle(frame, (x1, y1), (x2, y2), (120, 45, 255), 2)

            # ── detection label ───────────────────────────
            confidence = 97.0 + random.random() * 2.9
            label      = f'FACE_01   {confidence:.1f}%'
            font       = cv2.FONT_HERSHEY_SIMPLEX
            pad        = 4
            (lw, lh), baseline = cv2.getTextSize(label, font, 0.65, 2)
            bg_y1 = max(y1 - lh - baseline - pad * 2, 0)
            bg_y2 = y1
            cv2.rectangle(frame, (x1, bg_y1), (x1 + lw + pad * 2, bg_y2), (120, 45, 255), -1)
            cv2.putText(frame, label, (x1 + pad, y1 - baseline - pad), font, 0.65, (255, 255, 255), 2)

            # ── gaze direction (iris) ─────────────────────
            if len(lms) > IRIS_R:
                iris_x = (lms[IRIS_L].x + lms[IRIS_R].x) / 2
                if iris_x < 0.33:
                    current_gaze = 'left'
                elif iris_x > 0.67:
                    current_gaze = 'right'
                else:
                    current_gaze = 'center'

        ok, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ok:
            continue
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n')

# ── routes ───────────────────────────────────────────────
@app.route('/')
def index():
    global pixelation_active, pixelation_step
    pixelation_active = False
    pixelation_step   = 0
    return render_template('index.html')

@app.route('/behavioral', methods=['POST'])
def behavioral():
    global total_hover_switches
    data = request.get_json()
    hs   = data.get('hover_switches', 0)
    total_hover_switches += hs
    print(f"[behavioral] response_time={data.get('response_time')}s | "
          f"hover_switches={hs} | total={total_hover_switches} | "
          f"selected={data.get('selected_option')}")
    return jsonify({'status': 'ok', 'total_hover_switches': total_hover_switches})

@app.route('/consent', methods=['POST'])
def consent():
    global pixelation_active, pixelation_step
    data = request.get_json()
    if data.get('granted'):
        pixelation_active = True
        pixelation_step   = 0
        threading.Thread(target=_run_pixelation, daemon=True).start()
    return jsonify({'status': 'ok'})

@app.route('/compression_status')
def compression_status():
    return jsonify({
        'step'      : pixelation_step,
        'resolution': _STEP_LABEL.get(pixelation_step, 'original'),
        'active'    : pixelation_active,
    })

@app.route('/video_feed')
def video_feed():
    return Response(_gen_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/face_status')
def face_status():
    return jsonify({
        'detected': face_detected,
        'gaze'    : current_gaze,
        'instability': (2 if total_hover_switches >= 6
                        else 1 if total_hover_switches >= 3
                        else 0),
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080, debug=False, threaded=True)
