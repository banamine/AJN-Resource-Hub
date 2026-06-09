export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const targetUrl = 'https://rss.alexjones.media/AJNHourlyVideo.html';

    try {
      const feedResponse = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Cache-Control": "no-cache"
        }
      });

      const html = await feedResponse.text();

      return new Response(html, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "public, max-age=300"  // cache at edge 5 min
        },
      });
    } catch (error) {
      return new Response(`Worker Error: ${error.message}`, {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
