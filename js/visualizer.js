// visualizer.js - Advanced Spectrum Visualizer (120 lines, 3 styles)
const AudioVisualizer = (function() {
    let animationId = null;
    let canvas = null;
    let ctx = null;
    let analyser = null;
    let currentStyle = 'bars';
    let width = 1200;
    let height = 120;
    let dataArray = null;
    
    function init(canvasElement, audioContext, sourceNode) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        sourceNode.connect(analyser);
        
        // Set canvas dimensions
        const rect = canvas.parentElement.getBoundingClientRect();
        width = rect.width || 1200;
        canvas.width = width;
        canvas.height = height;
        
        startLoop();
        return analyser;
    }
    
    function setStyle(style) {
        currentStyle = style;
    }
    
    function startLoop() {
        if (animationId) cancelAnimationFrame(animationId);
        
        function draw() {
            if (!analyser || !ctx) return;
            
            analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, width, height);
            
            const barCount = 120;
            const barWidth = width / barCount;
            
            // Downsample to 120 bars
            const step = dataArray.length / barCount;
            
            for (let i = 0; i < barCount; i++) {
                const index = Math.floor(i * step);
                let value = dataArray[index] / 255;
                value = Math.pow(value, 1.2); // curve for better visual
                
                const barHeight = Math.max(2, value * height);
                const x = i * barWidth;
                
                // Color gradient based on frequency and intensity
                const hue = 200 + (value * 80);
                const saturation = 70 + (value * 30);
                const lightness = 50 + (value * 20);
                
                if (currentStyle === 'bars') {
                    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                    ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
                } 
                else if (currentStyle === 'lines') {
                    ctx.beginPath();
                    ctx.moveTo(x + barWidth/2, height);
                    ctx.lineTo(x + barWidth/2, height - barHeight);
                    ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
                    ctx.lineWidth = barWidth * 0.6;
                    ctx.stroke();
                }
                else if (currentStyle === 'circle') {
                    // Circular meter style
                    const radius = Math.min(barHeight * 0.6, barWidth * 0.8);
                    ctx.beginPath();
                    ctx.arc(x + barWidth/2, height - radius - 2, radius * 0.7 + value * 3, 0, Math.PI * 2);
                    ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
                    ctx.fill();
                }
            }
            
            animationId = requestAnimationFrame(draw);
        }
        
        draw();
    }
    
    function stop() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (ctx) ctx.clearRect(0, 0, width, height);
    }
    
    function resize() {
        if (canvas && canvas.parentElement) {
            const rect = canvas.parentElement.getBoundingClientRect();
            width = rect.width || 1200;
            canvas.width = width;
            canvas.height = height;
        }
    }
    
    return { init, setStyle, stop, resize };
})();
