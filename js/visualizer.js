/**
 * Audio Visualizer Module - 120-line spectrum analyzer
 * @module visualizer
 */

let audioContext = null;
let analyserNode = null;
let sourceNode = null;
let animationId = null;
let canvas = null;
let canvasCtx = null;
let canvasWidth = 1200;
let canvasHeight = 120;
let isActive = false;

/**
 * Initialize canvas
 * @param {HTMLCanvasElement} canvasElement - Canvas element
 */
export function initCanvas(canvasElement) {
    canvas = canvasElement;
    if (!canvas) return;
    
    const rect = canvas.parentElement?.getBoundingClientRect();
    canvasWidth = rect?.width || 1200;
    canvas.height = canvasHeight;
    canvas.width = canvasWidth;
    canvasCtx = canvas.getContext('2d');
}

/**
 * Draw spectrum bars
 * @param {Uint8Array} dataArray - Frequency data
 */
function drawSpectrum(dataArray) {
    if (!canvasCtx) return;
    
    canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    const barCount = 120;
    const barWidth = canvasWidth / barCount;
    const step = dataArray.length / barCount;
    
    for (let i = 0; i < barCount; i++) {
        const index = Math.floor(i * step);
        let value = (dataArray[index] || 0) / 255;
        value = Math.pow(value, 1.2);
        
        const barHeight = Math.max(2, value * canvasHeight);
        const x = i * barWidth;
        const hue = 200 + (value * 80);
        
        canvasCtx.fillStyle = `hsl(${hue}, 80%, 55%)`;
        canvasCtx.fillRect(x, canvasHeight - barHeight, barWidth - 1, barHeight);
    }
}

/**
 * Start visualization loop
 */
function startVisualizerLoop() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    function draw() {
        if (!analyserNode || !isActive) {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            return;
        }
        
        const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(dataArray);
        drawSpectrum(dataArray);
        
        animationId = requestAnimationFrame(draw);
    }
    
    draw();
}

/**
 * Connect audio source to visualizer
 * @param {HTMLAudioElement} audioElement - Audio element
 * @returns {boolean} - Success status
 */
export function connectVisualizer(audioElement) {
    if (!audioElement || !canvas) {
        return false;
    }
    
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtx();
        
        sourceNode = audioContext.createMediaElementSource(audioElement);
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 512;
        
        sourceNode.connect(analyserNode);
        analyserNode.connect(audioContext.destination);
        
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(console.warn);
        }
        
        isActive = true;
        startVisualizerLoop();
        
        return true;
    } catch (error) {
        console.error('Visualizer connection failed:', error);
        return false;
    }
}

/**
 * Stop visualizer and cleanup
 */
export function stopVisualizer() {
    isActive = false;
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    if (audioContext) {
        audioContext.close().catch(console.warn);
        audioContext = null;
    }
    
    analyserNode = null;
    sourceNode = null;
    
    if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
}

/**
 * Resize canvas
 */
export function resizeVisualizer() {
    if (canvas && canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvasWidth = rect.width || 1200;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
    }
}
