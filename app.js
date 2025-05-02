const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');

const targetImageElement = new Image();
targetImageElement.src = 'paul.png'; // Set the path to your target image

let targetLandmarks = null;

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
            resolve(videoElement);
        };
    });
}

async function loadFaceMesh() {
    const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    faceMesh.onResults(onResults);
    return faceMesh;
}

async function loadTargetFaceMesh() {
    const targetFaceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    targetFaceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    targetFaceMesh.onResults(onTargetResults);
    return targetFaceMesh;
}

function alignLandmarks(liveLandmarks, targetLandmarks) {
    // Example alignment logic (to be refined)
    // Calculate transformation matrix or use Procrustes analysis
    // For simplicity, assume both sets of landmarks are already aligned
    return liveLandmarks.map((landmark, index) => {
        const targetLandmark = targetLandmarks[index];
        return {
            x: (landmark.x + targetLandmark.x) / 2,
            y: (landmark.y + targetLandmark.y) / 2
        };
    });
}

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    // Draw the current video frame
    canvasCtx.drawImage(
        videoElement, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiFaceLandmarks && targetLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
            drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION,
                           {color: '#C0C0C070', lineWidth: 1});
            drawLandmarks(canvasCtx, landmarks, {color: '#FF3030', lineWidth: 2});
            // Align with target landmarks
            // const alignedLandmarks = alignLandmarks(landmarks, targetLandmarks);
            // Draw aligned landmarks (for debugging)
            // drawLandmarks(canvasCtx, alignedLandmarks, {color: '#00FF00', lineWidth: 2});
        }
    }
    canvasCtx.restore();
}

function onTargetResults(results) {
    if (results.multiFaceLandmarks) {
        // Process target face landmarks
        targetLandmarks = results.multiFaceLandmarks[0];
    }
}

class Camera {
    constructor(videoElement, options) {
        this.videoElement = videoElement;
        this.onFrame = options.onFrame;
        this.width = options.width;
        this.height = options.height;
    }

    async start() {
        this.videoElement.width = this.width;
        this.videoElement.height = this.height;
        this.videoElement.play();
        this.processFrame();
    }

    async processFrame() {
        await this.onFrame();
        requestAnimationFrame(this.processFrame.bind(this));
    }
}

async function main() {
    await setupCamera();
    videoElement.play();
    const faceMesh = await loadFaceMesh();
    const targetFaceMesh = await loadTargetFaceMesh();
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await faceMesh.send({image: videoElement});
            await targetFaceMesh.send({image: targetImageElement});
        },
        width: 640,
        height: 480
    });
    camera.start();
}

function drawConnectors(ctx, landmarks, connections, style) {
    const { color, lineWidth } = style;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    connections.forEach(([start, end]) => {
        const startLandmark = landmarks[start];
        const endLandmark = landmarks[end];
        ctx.beginPath();
        ctx.moveTo(startLandmark.x * ctx.canvas.width, startLandmark.y * ctx.canvas.height);
        ctx.lineTo(endLandmark.x * ctx.canvas.width, endLandmark.y * ctx.canvas.height);
        ctx.stroke();
    });
}

function drawLandmarks(ctx, landmarks, style) {
    const { color, lineWidth } = style;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    landmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark.x * ctx.canvas.width, landmark.y * ctx.canvas.height, lineWidth, 0, 2 * Math.PI);
        ctx.fill();
    });
}

main(); 