// scraper.js - Independent Archive Scraper Module
const AJNScraper = (function() {
    const FEED_URL = 'https://rss.alexjones.media/AJNHourlyVideo.html';
    const PROXY_LIST = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://thingproxy.freeboard.io/fetch/'
    ];
    const CACHE_KEY = 'ajn_archive_v3';
    
    let cachedArchive = null;
    
    async function fetchWithProxy() {
        // Try direct first
        try {
            const res = await fetch(FEED_URL, { cache: 'no-store' });
            if (res.ok) return await res.text();
        } catch(e) { console.log('Direct fetch failed:', e.message); }
        
        // Try proxies
        for (let i = 0; i < PROXY_LIST.length; i++) {
            try {
                const res = await fetch(PROXY_LIST[i] + encodeURIComponent(FEED_URL));
                if (res.ok) return await res.text();
            } catch(e) {}
        }
        throw new Error('All fetch methods failed');
    }
    
    function parseSegments(html) {
        const segments = [];
        const linkRegex = /<a\s+[^>]*href=["']([^"']*\.m4v)["'][^>]*>([^<]*(?:<[^>]+>[^<]*)*?)<\/a>/gi;
        let match;
        
        while ((match = linkRegex.exec(html)) !== null) {
            let url = match[1];
            let titleHtml = match[2];
            let titleText = titleHtml.replace(/<[^>]+>/g, '').trim();
            
            if (!url.includes('ajn.archives.pub')) continue;
            
            // Extract date
            let dateStr = '';
            let urlDateMatch = url.match(/(\d{8})/);
            if (urlDateMatch) {
                dateStr = urlDateMatch[1];
            } else {
                let titleDateMatch = titleText.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (titleDateMatch) {
                    dateStr = titleDateMatch[1] + titleDateMatch[2] + titleDateMatch[3];
                }
            }
            
            if (!dateStr || dateStr.length !== 8) continue;
            
            // Extract hour
            let hour = 0;
            let hourMatch = url.match(/Hr(\d)/i);
            if (hourMatch) {
                hour = parseInt(hourMatch[1]);
            } else {
                hourMatch = titleText.match(/Hr(\d)/i);
                if (hourMatch) hour = parseInt(hourMatch[1]);
            }
            
            const lowerTitle = titleText.toLowerCase();
            const isAlex = lowerTitle.includes('alex') && !lowerTitle.includes('warroom');
            const isWarRoom = lowerTitle.includes('warroom');
            const isSpecial = lowerTitle.includes('special') || lowerTitle.includes('sundaylive') || lowerTitle.includes('tnt');
            
            if (hour < 0 || hour > 4) return;
            if (!isAlex && !isWarRoom && !isSpecial) return;
            
            segments.push({
                url, title: titleText, dateStr, hour,
                isAlex, isWarRoom, isSpecial,
                displayDate: `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`,
                type: isSpecial ? 'special' : (isAlex ? 'alex' : 'warroom')
            });
        }
        
        return segments;
    }
    
    function organizeArchive(segments) {
        const archive = {};
        for (const seg of segments) {
            if (!archive[seg.dateStr]) archive[seg.dateStr] = [];
            archive[seg.dateStr].push(seg);
        }
        
        for (const date in archive) {
            const specials = archive[date].filter(s => s.isSpecial);
            const alex = archive[date].filter(s => s.isAlex).sort((a,b) => a.hour - b.hour);
            const warroom = archive[date].filter(s => s.isWarRoom).sort((a,b) => a.hour - b.hour);
            archive[date] = [...specials, ...alex, ...warroom];
        }
        
        return archive;
    }
    
    async function fetchArchive(progressCallback) {
        if (progressCallback) progressCallback('fetching', 'Connecting to archive...');
        
        const html = await fetchWithProxy();
        if (progressCallback) progressCallback('parsing', 'Parsing segments...');
        
        const segments = parseSegments(html);
        if (segments.length === 0) throw new Error('No segments found');
        
        if (progressCallback) progressCallback('organizing', 'Organizing archive...');
        const archive = organizeArchive(segments);
        const dates = Object.keys(archive).sort().reverse();
        
        // Cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            archive, dates, timestamp: Date.now(), version: '3.0'
        }));
        
        cachedArchive = { archive, dates };
        return { archive, dates, totalSegments: segments.length };
    }
    
    function loadCached() {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        try {
            const data = JSON.parse(cached);
            cachedArchive = { archive: data.archive, dates: data.dates };
            return cachedArchive;
        } catch(e) { return null; }
    }
    
    function getArchive() { return cachedArchive; }
    
    return { fetchArchive, loadCached, getArchive };
})();
