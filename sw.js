async function loadSegments() {
    feedStatusSpan.innerHTML = '🔄 Fetching latest daily segments...';
    playlistContainer.innerHTML = `<div class="text-center py-10"><div class="spinner mx-auto w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mb-2"></div><p class="text-slate-400 text-sm">Parsing most recent date from AJN archive...</p></div>`;
    
    try {
        let response;
        try {
            response = await fetch(FEED_URL, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } catch (directErr) {
            response = await fetch(CORS_PROXY + encodeURIComponent(FEED_URL), { cache: 'no-store' });
            if (!response.ok) throw new Error('Proxy fetch failed');
        }
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a[href*=".m4v"]');
        
        // Step 1: Parse ALL segments with metadata
        const allSegments = [];
        for (let link of links) {
            let url = link.getAttribute('href');
            if (!url || !url.includes('ajn.archives.pub')) continue;
            let titleText = link.textContent.trim();
            let filename = url.split('/').pop() || '';
            
            // Extract date from filename (YYYYMMDD)
            let dateMatch = filename.match(/(\d{8})/);
            let dateStr = dateMatch ? dateMatch[1] : '';
            if (!dateStr) {
                dateMatch = titleText.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (dateMatch) dateStr = dateMatch[1] + dateMatch[2] + dateMatch[3];
            }
            
            // Extract hour
            let hourMatch = filename.match(/Hr(\d)/i);
            let hour = hourMatch ? parseInt(hourMatch[1], 10) : 0;
            if (hour === 0) {
                hourMatch = titleText.match(/Hr(\d)/i);
                hour = hourMatch ? parseInt(hourMatch[1], 10) : 0;
            }
            
            // Determine show
            let lowerTitle = titleText.toLowerCase();
            let isAlex = lowerTitle.includes('alex') && !lowerTitle.includes('warroom');
            let isWarRoom = lowerTitle.includes('warroom');
            
            if (!isAlex && !isWarRoom) continue; // Skip other shows
            
            allSegments.push({
                url, title: titleText, filename, dateStr, hour, isAlex, isWarRoom,
                displayDate: dateStr ? `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}` : 'Unknown'
            });
        }
        
        if (allSegments.length === 0) throw new Error('No Alex/WarRoom segments found');
        
        // Step 2: Find the MOST RECENT date (max dateStr)
        const validDates = allSegments.filter(s => s.dateStr && s.dateStr.length === 8).map(s => s.dateStr);
        if (validDates.length === 0) throw new Error('No valid dates found');
        
        const mostRecentDate = validDates.reduce((a, b) => a > b ? a : b);
        console.log(`Most recent date: ${mostRecentDate}`);
        
        // Step 3: Filter ONLY segments from the most recent date
        const todaysSegments = allSegments.filter(s => s.dateStr === mostRecentDate);
        
        if (todaysSegments.length === 0) throw new Error(`No segments found for date ${mostRecentDate}`);
        
        // Step 4: Apply custom order: Alex Hr1,2,3,4 then WarRoom Hr1,2,3,4
        const alexSegs = todaysSegments.filter(s => s.isAlex).sort((a, b) => a.hour - b.hour);
        const warSegs = todaysSegments.filter(s => s.isWarRoom).sort((a, b) => a.hour - b.hour);
        
        const orderedSegments = [...alexSegs, ...warSegs];
        
        if (orderedSegments.length === 0) throw new Error('No properly ordered segments');
        
        console.log('Final playlist order:', orderedSegments.map(s => `${s.isAlex ? 'Alex' : 'WarRoom'} Hr${s.hour}`));
        
        // Step 5: Update UI and start playing
        videoSegments = orderedSegments;
        feedStatusSpan.innerHTML = `✅ ${mostRecentDate} · ${videoSegments.length} segments (Alex ${alexSegs.length}, WarRoom ${warSegs.length})`;
        segmentCountSpan.innerText = `${videoSegments.length} videos`;
        renderPlaylist();
        
        if (videoSegments.length > 0) {
            currentIndex = 0;
            loadSegment(0);
            setupAutoNext();
            hideLoadingAndEnableUI();
        }
        
    } catch (err) {
        console.error('Load error:', err);
        feedStatusSpan.innerHTML = '⚠️ Failed to load latest date';
        // Continue retry logic...
    }
}
