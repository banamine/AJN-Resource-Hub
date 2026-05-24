// player.js - Core Player Management
const AJNPlayer = (function() {
    let currentAudio = null;
    let audioContext = null;
    let currentSource = null;
    let currentAnalyser = null;
    let visualizerActive = false;
    
    async function playAudioStream(url, streamName, visualizerCanvas, onStatusChange) {
        stopAll();
        
        if (onStatusChange) onStatusChange('connecting', 'Connecting to stream...');
        
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = url;
        audio.volume = 0.75;
        
        try {
            await audio.play();
            
            // Setup Web Audio for visualizer
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioCtx();
            const source = audioContext.createMediaElementSource(audio);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            currentAudio = audio;
            currentSource = source;
            currentAnalyser = analyser;
            
            // Initialize visualizer
            if (visualizerCanvas) {
                AudioVisualizer.init(visualizerCanvas, audioContext, source);
                visualizerActive = true;
            }
            
            if (onStatusChange) onStatusChange('live', 'Live');
            
            audio.onerror = () => {
                if (onStatusChange) onStatusChange('error', 'Stream error');
            };
            
            return true;
        } catch(e) {
            console.error('Playback failed:', e);
            if (onStatusChange) onStatusChange('error', e.message);
            return false;
        }
    }
    
    function setVolume(volume) {
        if (currentAudio) currentAudio.volume = Math.max(0, Math.min(1, volume));
    }
    
    function stopAll() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }
        if (audioContext) {
            audioContext.close().catch(console.log);
            audioContext = null;
        }
        currentSource = null;
        currentAnalyser = null;
        AudioVisualizer.stop();
        visualizerActive = false;
    }
    
    function getAnalyser() { return currentAnalyser; }
    
    return { playAudioStream, setVolume, stopAll, getAnalyser };
})();
