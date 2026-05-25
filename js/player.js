/**
 * Video Player Module
 * @module player
 */

let currentSegments = [];
let currentIndex = 0;
let videoPlayer = null;
let onVideoEndCallback = null;

/**
 * Initialize the video player
 * @param {HTMLVideoElement} player - Video element
 * @param {Function} onEnd - Callback when video ends
 */
export function initPlayer(player, onEnd) {
    videoPlayer = player;
    onVideoEndCallback = onEnd;
    
    if (videoPlayer) {
        videoPlayer.addEventListener('ended', () => {
            if (onVideoEndCallback) {
                onVideoEndCallback();
            }
        });
    }
}

/**
 * Load video by index
 * @param {number} index - Index in segments array
 * @returns {Object|null} - Loaded segment or null
 */
export function loadVideo(index) {
    if (!videoPlayer || !currentSegments[index]) {
        return null;
    }
    
    const segment = currentSegments[index];
    currentIndex = index;
    
    videoPlayer.src = segment.url;
    videoPlayer.load();
    
    const playPromise = videoPlayer.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn('Auto-play prevented:', error);
        });
    }
    
    return segment;
}

/**
 * Set current segments array
 * @param {Array} segments - Array of video segments
 */
export function setSegments(segments) {
    currentSegments = segments;
    currentIndex = 0;
}

/**
 * Get current segments
 * @returns {Array}
 */
export function getSegments() {
    return currentSegments;
}

/**
 * Get current index
 * @returns {number}
 */
export function getCurrentIndex() {
    return currentIndex;
}

/**
 * Play next video
 * @returns {boolean} - True if next exists
 */
export function playNext() {
    if (currentIndex + 1 < currentSegments.length) {
        loadVideo(currentIndex + 1);
        return true;
    }
    return false;
}

/**
 * Play previous video
 * @returns {boolean} - True if previous exists
 */
export function playPrevious() {
    if (currentIndex - 1 >= 0) {
        loadVideo(currentIndex - 1);
        return true;
    }
    return false;
}

/**
 * Get current progress percentage
 * @returns {number}
 */
export function getProgress() {
    if (!videoPlayer || !videoPlayer.duration) {
        return 0;
    }
    return (videoPlayer.currentTime / videoPlayer.duration) * 100;
}

/**
 * Set volume
 * @param {number} volume - 0 to 1
 */
export function setVolume(volume) {
    if (videoPlayer) {
        videoPlayer.volume = Math.max(0, Math.min(1, volume));
    }
}
