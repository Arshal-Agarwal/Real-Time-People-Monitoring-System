Frontend - https://mobile-alert-frontend.vercel.app
Backend - https://mobile-alert-backend.onrender.com

API for ackend Health test - curl -X POST https://mobile-alert-backend.onrender.com/api/notify   -H "Content-Type: application/json"   -d '{"count": 9}'

Command to run python Model - python people_counter.py -m detector/MobileNetSSD_deploy.caffemodel -p detector/MobileNetSSD_deploy.prototxt -i utils/data/tests/test_1.mp4 -o utils/data/tests/test_output.mp4