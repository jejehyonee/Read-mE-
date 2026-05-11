import cv2

print("카메라 권한 요청 중...")
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
cap.release()

if ret:
    print("카메라 접근 성공 — app.py 실행해도 됩니다.")
else:
    print("카메라 접근 실패 — 시스템 설정에서 Terminal 권한을 켜주세요.")
