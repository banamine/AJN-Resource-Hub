// app.js - Main Application Orchestration
document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const tabs = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const streamGrid = document.getElementById('streamGrid');
    const flyout = document.getElementById('flyoutPlayer');
    const flyoutHandle = document.getElementById('flyoutHandle');
    const closeFlyoutBtn = document.getElementById('closeFlyoutBtn');
    const stopStreamBtn = document.getElementById('stopStreamBtn');
    const flyoutVolume = document.getElementById('flyoutVolume');
    const flyoutTitle = document.getElementById('flyoutTitle');
    const flyoutMeta = document.getElementById('flyoutMeta');
    const streamStatus = document.getElementById('streamStatus');
    const streamBitrate = document.getElementById('streamBitrate');
    const spectrumCanvas = document.getElementById('spectrumCanvas');
    const vizStyleBtns = document.querySelectorAll('.viz-style');
    
    // State
    let currentStreamUrl = null;
    let currentStreamName = null;
    
    // Stream definitions from source
    const streams = [
        { name: "Alex Jones Show (AAC)", url: "https://stream.alexjones.media/alexjonesshow", icon: "fa-microphone-alt", type: "AAC 64kbps" },
        { name: "Alex Jones Show (MP3)", url: "https://stream.alexjones.media/alexjonesshow.mp3", icon: "fa-music", type: "MP3 128kbps" },
        { name: "Alex Jones (OPUS)", url: "https://audio.alexjoneslive.com:8443/alexjonesshow.opus", icon: "fa-waveform", type: "Opus HQ" },
        { name: "Alex Jones (alt AAC)", url: "https://audio.alexjoneslive.com:8443/alexjonesshow.aac", icon: "fa-head-side-headphones", type: "AAC alt" },
        { name: "War Room", url: "https://stream.alexjones.media/warroom/", icon: "fa-shield-alt", type: "AAC Live" },
        { name: "Network Feed (All Shows)", url: "https://stream.alexjones.media/stream/7/", icon: "fa-satellite-dish", type: "AAC Relay" },
        { name: "Network Feed MP3", url: "https://stream.alexjones.media/stream/8/", icon: "fa-rss", type: "MP3 Backup" },
        { name: "War Room AAC", url: "https://stream.alexjones.media/stream/4/", icon: "fa-radio", type: "AAC Direct" }
    ];
    
    // Render stream buttons
    function renderStreamButtons() {
        streamGrid.innerHTML = streams.map(stream => `
            <button class="stream-btn" data-url="${stream.url}" data-name="${stream.name}" data-type="${stream.type}">
                <div class="stream-icon"><i class="fas ${stream.icon}"></i></div>
                <div class="stream-info">
                    <h4>${stream.name}</h4>
                    <small>${stream.type}</small>
                </div>
            </button>
        `).join('');
        
        // Attach event listeners
        document.querySelectorAll('.stream-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const url = btn.dataset.url;
                const name = btn.dataset.name;
                const type = btn.dataset.type;
                
                // Remove active class from all
                document.querySelectorAll('.stream-btn').forEach(b => b.classList.remove('active-stream'));
                btn.classList.add('active-stream');
                
                // Open flyout
                flyout.classList.add('open');
                flyoutTitle.innerHTML = `<i class="fas fa-compact-disc"></i> ${name}`;
                flyoutMeta.innerHTML = `Stream: ${type} · Live`;
                streamBitrate.innerHTML = type;
                
                // Play stream
                const success = await AJNPlayer.playAudioStream(url, name, spectrumCanvas, (status, msg) => {
                    if (status === 'live') {
                        streamStatus.innerHTML = '<i class="fas fa-circle text-green-400"></i> Live';
                    } else if (status === 'connecting') {
                        streamStatus.innerHTML = '<i class="fas fa-circle text-yellow-400"></i> Connecting...';
                    } else if (status === 'error') {
                        streamStatus.innerHTML = '<i class="fas fa-circle text-red-400"></i> Error';
                        flyoutMeta.innerHTML = `Failed: ${msg}`;
                    }
                });
                
                if (success) {
                    currentStreamUrl = url;
                    currentStreamName = name;
                }
            });
        });
    }
    
    // Visualizer style switching
    vizStyleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            vizStyleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const style = btn.dataset.viz;
            AudioVisualizer.setStyle(style);
        });
    });
    
    // Flyout controls
    flyoutHandle.addEventListener('click', () => flyout.classList.toggle('open'));
    closeFlyoutBtn.addEventListener('click', () => flyout.classList.remove('open'));
    stopStreamBtn.addEventListener('click', () => {
        AJNPlayer.stopAll();
        streamStatus.innerHTML = '<i class="fas fa-circle text-gray-400"></i> Stopped';
        flyoutTitle.innerHTML = '<i class="fas fa-compact-disc"></i> No Stream Active';
        flyoutMeta.innerHTML = 'Select a live stream above';
        document.querySelectorAll('.stream-btn').forEach(b => b.classList.remove('active-stream'));
        currentStreamUrl = null;
    });
    flyoutVolume.addEventListener('input', (e) => AJNPlayer.setVolume(parseFloat(e.target.value)));
    
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${targetTab}Tab`).classList.add('active');
            
            // Resize visualizer when switching to live tab
            if (targetTab === 'live') {
                setTimeout(() => AudioVisualizer.resize(), 100);
            }
        });
    });
    
    // Video Vault Integration (uses scraper)
    let currentArchive = null;
    let currentSegments = [];
    let currentIndex = 0;
    const videoPlayer = document.getElementById('archiveVideo');
    const videoTitle = document.getElementById('videoTitle');
    const videoCounter = document.getElementById('videoCounter');
    const videoProgress = document.getElementById('videoProgress');
    const prevBtn = document.getElementById('prevVideoBtn');
    const nextBtn = document.getElementById('nextVideoBtn');
    const playlistContainer = document.getElementById('playlistContainer');
    const playlistCount = document.getElementById('playlistCount');
    const totalDatesSpan = document.getElementById('totalDates');
    const totalVideosSpan = document.getElementById('totalVideos');
    const refreshBtn = document.getElementById('refreshArchiveBtn');
    const proxyStatusSpan = document.querySelector('#proxyStatus span');
    
    // Load archive
    async function loadArchive(forceRefresh = false) {
        proxyStatusSpan.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Loading archive...';
        
        let archiveData = AJNScraper.loadCached();
        if (!archiveData || forceRefresh) {
            try {
                const result = await AJNScraper.fetchArchive((stage, msg) => {
                    proxyStatusSpan.innerHTML = `<i class="fas fa-spinner fa-pulse"></i> ${msg}`;
                });
                archiveData = { archive: result.archive, dates: result.dates };
                proxyStatusSpan.innerHTML = `<i class="fas fa-check-circle"></i> Loaded ${result.dates.length} dates, ${result.totalSegments} segments`;
            } catch(e) {
                proxyStatusSpan.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error: ${e.message}`;
                return;
            }
        } else {
            proxyStatusSpan.innerHTML = `<i class="fas fa-database"></i> Cached: ${archiveData.dates.length} dates`;
        }
        
        currentArchive = archiveData.archive;
        const dates = archiveData.dates;
        totalDatesSpan.textContent = dates.length;
        
        // Setup date picker
        const datePicker = document.getElementById('datePicker');
        flatpickr(datePicker, {
            dateFormat: "Y-m-d",
            enable: dates.map(d => new Date(parseInt(d.slice(0,4)), parseInt(d.slice(4,6))-1, parseInt(d.slice(6,8)))),
            onChange: (selectedDates) => {
                if (selectedDates.length) {
                    const d = selectedDates[0];
                    const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
                    loadDateSegments(ymd);
                }
            }
        });
        
        if (dates.length) loadDateSegments(dates[0]);
    }
    
    function loadDateSegments(dateStr) {
        if (!currentArchive[dateStr]) return;
        currentSegments = currentArchive[dateStr];
        currentIndex = 0;
        totalVideosSpan.textContent = currentSegments.length;
        renderPlaylist();
        if (currentSegments.length) loadVideo(0);
    }
    
    function renderPlaylist() {
        if (!currentSegments.length) {
            playlistContainer.innerHTML = '<div class="empty-playlist">No segments for this date</div>';
            playlistCount.textContent = '0 items';
            return;
        }
        
        playlistContainer.innerHTML = currentSegments.map((seg, idx) => `
            <div class="playlist-item ${idx === currentIndex ? 'active' : ''}" data-index="${idx}">
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <strong>${seg.type === 'special' ? '⭐' : (seg.type === 'alex' ? '🎙️' : '⚔️')} ${seg.type === 'special' ? 'SPECIAL' : (seg.type === 'alex' ? 'Alex Jones' : 'War Room')}</strong>
                        <span style="font-size: 0.7rem; margin-left: 0.5rem;">Hr${seg.hour || ''}</span>
                    </div>
                    <span style="font-size: 0.7rem;">${seg.displayDate}</span>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${seg.title.substring(0, 60)}</div>
            </div>
        `).join('');
        
        playlistCount.textContent = `${currentSegments.length} items`;
        
        // Add click handlers
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.dataset.index);
                if (!isNaN(idx)) loadVideo(idx);
            });
        });
    }
    
    function loadVideo(index) {
        if (!currentSegments[index]) return;
        const seg = currentSegments[index];
        currentIndex = index;
        videoPlayer.src = seg.url;
        videoPlayer.load();
        videoPlayer.play().catch(console.log);
        videoTitle.textContent = seg.title;
        videoCounter.textContent = `${index + 1}/${currentSegments.length}`;
        renderPlaylist();
        
        // Scroll to active
        const activeItem = document.querySelector('.playlist-item.active');
        if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    videoPlayer.addEventListener('timeupdate', () => {
        if (videoPlayer.duration) {
            videoProgress.style.width = `${(videoPlayer.currentTime / videoPlayer.duration) * 100}%`;
        }
    });
    videoPlayer.addEventListener('ended', () => {
        if (currentIndex + 1 < currentSegments.length) loadVideo(currentIndex + 1);
    });
    
    prevBtn.addEventListener('click', () => {
        if (currentIndex - 1 >= 0) loadVideo(currentIndex - 1);
    });
    nextBtn.addEventListener('click', () => {
        if (currentIndex + 1 < currentSegments.length) loadVideo(currentIndex + 1);
    });
    refreshBtn.addEventListener('click', () => loadArchive(true));
    
    // Playlist collapsible
    const playlistHeader = document.getElementById('playlistHeader');
    const playlistContainerDiv = document.getElementById('playlistContainer');
    const togglePlaylist = document.getElementById('togglePlaylist');
    let playlistCollapsed = false;
    playlistHeader.addEventListener('click', () => {
        playlistCollapsed = !playlistCollapsed;
        playlistContainerDiv.classList.toggle('collapsed', playlistCollapsed);
        togglePlaylist.querySelector('i').className = playlistCollapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    });
    
    // Initialize
    renderStreamButtons();
    await loadArchive(false);
    
    // Resize visualizer on window resize
    window.addEventListener('resize', () => {
        AudioVisualizer.resize();
    });
});
