/**
 * Main Application Module
 * @module app
 */

import { fetchWithCorsBypass, parseSegmentsFromHTML, organizeArchive } from './cors-bypass.js';
import { initPlayer, loadVideo, setSegments, playNext, playPrevious, getProgress, getCurrentIndex } from './player.js';
import { initCanvas, connectVisualizer, stopVisualizer, resizeVisualizer } from './visualizer.js';
import { saveArchive, loadArchive, clearArchive, hasCache } from './storage.js';
import { renderPlaylist, updateStatus, showLoading, hideLoading, escapeHtml } from './ui.js';

// Constants
const FEED_URL = 'https://rss.alexjones.media/AJNHourlyVideo.html';

// Global state
let masterArchive = {};
let availableDates = [];
let currentSegments = [];
let currentIndex = 0;
let flatpickrInstance = null;

// DOM Elements
let videoPlayer = null;
let videoTitle = null;
let videoCounter = null;
let videoProgress = null;
let playlistContainer = null;
let playlistCount = null;
let totalDatesSpan = null;
let totalVideosSpan = null;
let proxyMsgSpan = null;
let statusTextSpan = null;
let refreshBtn = null;
let prevBtn = null;
let nextBtn = null;

/**
 * Initialize DOM element references
 */
function initDOMElements() {
    videoPlayer = document.getElementById('archiveVideo');
    videoTitle = document.getElementById('videoTitle');
    videoCounter = document.getElementById('videoCounter');
    videoProgress = document.getElementById('videoProgress');
    playlistContainer = document.getElementById('playlistContainer');
    playlistCount = document.getElementById('playlistCount');
    totalDatesSpan = document.getElementById('totalDates');
    totalVideosSpan = document.getElementById('totalVideos');
    proxyMsgSpan = document.getElementById('proxyMsg');
    statusTextSpan = document.getElementById('statusText');
    refreshBtn = document.getElementById('refreshArchiveBtn');
    prevBtn = document.getElementById('prevVideoBtn');
    nextBtn = document.getElementById('nextVideoBtn');
}

/**
 * Update progress bar
 */
function updateProgress() {
    if (videoProgress && videoPlayer) {
        const progress = getProgress();
        videoProgress.style.width = `${progress}%`;
    }
}

/**
 * Update video info display
 */
function updateVideoInfo() {
    if (videoTitle && currentSegments[currentIndex]) {
        videoTitle.textContent = currentSegments[currentIndex].title;
    }
    if (videoCounter) {
        videoCounter.textContent = `${currentIndex + 1}/${currentSegments.length}`;
    }
}

/**
 * Load date segments
 * @param {string} dateStr - Date string (YYYYMMDD)
 */
function loadDateSegments(dateStr) {
    if (!masterArchive[dateStr]) {
        console.warn(`No data for date: ${dateStr}`);
        return;
    }
    
    currentSegments = masterArchive[dateStr];
    currentIndex = 0;
    setSegments(currentSegments);
    
    if (totalVideosSpan) {
        totalVideosSpan.textContent = currentSegments.length;
    }
    
    renderPlaylist(currentSegments, currentIndex, playlistContainer, (index) => {
        currentIndex = index;
        loadVideo(currentIndex);
        updateVideoInfo();
        renderPlaylist(currentSegments, currentIndex, playlistContainer, null);
    });
    
    if (currentSegments.length > 0) {
        const segment = loadVideo(0);
        if (segment && videoTitle) {
            videoTitle.textContent = segment.title;
        }
        updateVideoInfo();
    }
}

/**
 * Refresh UI with archive data
 */
function refreshUI() {
    if (totalDatesSpan) {
        totalDatesSpan.textContent = availableDates.length;
    }
    
    // Setup date picker
    if (flatpickrInstance) {
        flatpickrInstance.destroy();
    }
    
    const datePicker = document.getElementById('datePicker');
    if (datePicker && availableDates.length && window.flatpickr) {
        const dateObjects = availableDates.map(d => {
            return new Date(
                parseInt(d.slice(0, 4), 10),
                parseInt(d.slice(4, 6), 10) - 1,
                parseInt(d.slice(6, 8), 10)
            );
        });
        
        flatpickrInstance = window.flatpickr(datePicker, {
            dateFormat: 'Y-m-d',
            enable: dateObjects,
            maxDate: dateObjects[0],
            onChange: (selectedDates) => {
                if (selectedDates.length) {
                    const d = selectedDates[0];
                    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
                    if (masterArchive[ymd]) {
                        loadDateSegments(ymd);
                    }
                }
            }
        });
        
        // Load most recent date
        const newest = availableDates[0];
        if (newest) {
            loadDateSegments(newest);
        }
    }
}

/**
 * Load archive from network
 * @param {boolean} forceRefresh - Force refresh from network
 */
async function loadArchive(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = loadArchive();
        if (cached && cached.archive && Object.keys(cached.archive).length > 0) {
            masterArchive = cached.archive;
            availableDates = cached.dates || Object.keys(masterArchive).sort().reverse();
            updateStatus(proxyMsgSpan, `📦 Loaded from cache: ${availableDates.length} dates`);
            refreshUI();
            
            // Background refresh
            setTimeout(() => loadArchive(true), 100);
            return;
        }
    }
    
    updateStatus(proxyMsgSpan, '🔄 Fetching archive from AJN...');
    if (statusTextSpan) {
        showLoading(statusTextSpan);
    }
    
    try {
        const html = await fetchWithCorsBypass(FEED_URL, (msg) => {
            updateStatus(proxyMsgSpan, msg);
        });
        
        updateStatus(proxyMsgSpan, '📝 Parsing segments...');
        const segments = parseSegmentsFromHTML(html);
        
        if (segments.length === 0) {
            throw new Error('No segments found');
        }
        
        updateStatus(proxyMsgSpan, `📊 Organizing ${segments.length} segments...`);
        const archive = organizeArchive(segments);
        const dates = Object.keys(archive).sort().reverse();
        
        saveArchive(archive, dates);
        
        masterArchive = archive;
        availableDates = dates;
        
        updateStatus(proxyMsgSpan, `✅ Loaded ${dates.length} dates, ${segments.length} total videos`);
        if (statusTextSpan) {
            hideLoading(statusTextSpan, `${dates.length} dates ready`);
        }
        
        refreshUI();
    } catch (error) {
        console.error('Archive load failed:', error);
        updateStatus(proxyMsgSpan, `❌ Error: ${error.message}`, true);
        if (statusTextSpan) {
            statusTextSpan.innerHTML = 'Connection error';
        }
        
        // Try cached as fallback
        const cached = loadArchive();
        if (cached && cached.archive) {
            masterArchive = cached.archive;
            availableDates = cached.dates || Object.keys(masterArchive).sort().reverse();
            updateStatus(proxyMsgSpan, `⚠️ Using cached data (${availableDates.length} dates)`, true);
            refreshUI();
        }
    }
}

/**
 * Initialize video player events
 */
function initVideoEvents() {
    if (!videoPlayer) return;
    
    videoPlayer.addEventListener('timeupdate', updateProgress);
    
    // Play next on end
    const originalOnEnd = () => {
        if (playNext()) {
            updateVideoInfo();
            renderPlaylist(currentSegments, getCurrentIndex(), playlistContainer, null);
        }
    };
    
    // Override the player's ended handler
    videoPlayer.removeEventListener('ended', originalOnEnd);
    videoPlayer.addEventListener('ended', () => {
        if (playNext()) {
            updateVideoInfo();
            renderPlaylist(currentSegments, getCurrentIndex(), playlistContainer, null);
        }
    });
}

/**
 * Initialize navigation buttons
 */
function initNavigation() {
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (playPrevious()) {
                updateVideoInfo();
                renderPlaylist(currentSegments, getCurrentIndex(), playlistContainer, null);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (playNext()) {
                updateVideoInfo();
                renderPlaylist(currentSegments, getCurrentIndex(), playlistContainer, null);
            }
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            clearArchive();
            loadArchive(true);
        });
    }
}

/**
 * Initialize playlist toggle
 */
function initPlaylistToggle() {
    const header = document.getElementById('playlistHeader');
    const container = document.getElementById('playlistContainer');
    const toggleBtn = document.getElementById('togglePlaylist');
    let collapsed = false;
    
    if (header) {
        header.addEventListener('click', () => {
            collapsed = !collapsed;
            if (container) {
                container.classList.toggle('collapsed', collapsed);
            }
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.className = collapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
                }
            }
        });
    }
}

/**
 * Initialize tabs
 */
function initTabs() {
    const tabs = document.querySelectorAll('.nav-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            contents.forEach(c => c.classList.remove('active'));
            const targetElement = document.getElementById(`${target}Tab`);
            if (targetElement) {
                targetElement.classList.add('active');
            }
            
            if (target === 'live') {
                setTimeout(resizeVisualizer, 100);
            }
        });
    });
}

/**
 * Initialize the application
 */
async function init() {
    initDOMElements();
    initVideoEvents();
    initNavigation();
    initPlaylistToggle();
    initTabs();
    
    // Initialize player
    if (videoPlayer) {
        initPlayer(videoPlayer, () => {
            if (playNext()) {
                updateVideoInfo();
                renderPlaylist(currentSegments, getCurrentIndex(), playlistContainer, null);
            }
        });
    }
    
    // Initialize canvas for visualizer
    const canvas = document.getElementById('spectrumCanvas');
    if (canvas) {
        initCanvas(canvas);
        window.addEventListener('resize', resizeVisualizer);
    }
    
    // Load archive
    await loadArchive(false);
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
