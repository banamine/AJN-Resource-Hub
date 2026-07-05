// js/services/feedService.js
window.feedService = {
    fetchFeed: async function(feedUrl) {
        // Use your deployed Cloudflare Worker URL
        const proxyUrl = 'https://muddy-unit-f498.banamine.workers.dev/?url=';
        
        // Make the request through your own proxy
        const response = await fetch(proxyUrl + encodeURIComponent(feedUrl));
        
        if (!response.ok) {
            throw new Error(`Proxy fetch failed: ${response.status}`);
        }
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        return parser.parseFromString(xmlText, "application/xml");
    }
};
