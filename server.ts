import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import path from "path";
import axios from "axios";

const app = express();
const PORT = 3000;

app.use(cors());

const KAIDO_URL = "https://kaido.to";

// Helper to fetch with standard headers
async function fetchKaido(endpoint: string) {
  const res = await fetch(`${KAIDO_URL}${endpoint}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    }
  });
  return res;
}

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: "Query 'q' is required" });

    const htmlRes = await fetchKaido(`/search?keyword=${encodeURIComponent(q)}`);
    const html = await htmlRes.text();
    const $ = cheerio.load(html);

    const results: any[] = [];
    $(".flw-item").each((_, el) => {
      const title = $(el).find(".dynamic-name").text().trim();
      const idStr = $(el).find(".film-poster-ahref").attr("href") || "";
      const id = idStr.split("?")[0].replace("/", ""); // e.g. /road-of-naruto-18220 => road-of-naruto-18220
      const poster = $(el).find(".film-poster-img").attr("data-src") || "";
      const type = $(el).find(".fdi-item").first().text().trim();
      const duration = $(el).find(".fdi-duration").text().trim();
      const sub = $(el).find(".tick-sub").text().trim() || 0;
      const dub = $(el).find(".tick-dub").text().trim() || 0;

      if (id) {
        results.push({ id, title, poster, type, duration, sub, dub });
      }
    });

    res.json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to search anime" });
  }
});

app.get("/api/recent", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const isHome = page === 1;
    const endpoint = isHome ? `/home` : `/recently-updated?page=${page}`;

    const htmlRes = await fetchKaido(endpoint);
    const html = await htmlRes.text();
    const $ = cheerio.load(html);

    const trending: any[] = [];
    if (isHome) {
      $(".deslide-item").each((_, el) => {
        const title = $(el).find(".dynamic-name").text().trim();
        let idStr = $(el).find(".btn-play").attr("href")?.split("?")[0] || $(el).attr("href") || $(el).find("a").filter((_, a) => ($(a).attr("href") || "").includes("watch")).attr("href") || "";
        let id = idStr.replace("/watch/", "").replace("/", "");
        const poster = $(el).find(".film-poster-img").attr("data-src") || $(el).find(".film-poster-img").attr("src") || $(el).find("img").attr("src") || "";
        const summary = $(el).find(".sc-detail .scd-item").text().trim() || $(el).find(".description").text().trim();
        const description = summary.replace(/\s+/g, ' ').slice(0, 150) + (summary.length > 150 ? '...' : '');

        if (id) {
          trending.push({ id, title, poster, description });
        }
      });
    }

    const results: any[] = [];
    $(".flw-item").each((_, el) => {
      const title = $(el).find(".dynamic-name").text().trim() || $(el).find(".film-name a").text().trim();
      const idStr = $(el).find(".film-poster-ahref").attr("href") || $(el).find(".film-name a").attr("href") || "";
      const id = idStr.split("?")[0].replace("/", "");
      const poster = $(el).find(".film-poster-img").attr("data-src") || $(el).find(".film-poster-img").attr("src") || "";
      const type = $(el).find(".fdi-item").first().text().trim();
      const duration = $(el).find(".fdi-duration").text().trim();
      const sub = $(el).find(".tick-sub").text().trim() || 0;
      const dub = $(el).find(".tick-dub").text().trim() || 0;

      if (id) {
        results.push({ id, title, poster, type, duration, sub, dub });
      }
    });

    res.json({ trending, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch recent anime" });
  }
});

app.get("/api/popular", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const endpoint = `/most-popular?page=${page}`;

    const htmlRes = await fetchKaido(endpoint);
    const html = await htmlRes.text();
    const $ = cheerio.load(html);

    const results: any[] = [];
    $(".flw-item").each((_, el) => {
      const title = $(el).find(".dynamic-name").text().trim() || $(el).find(".film-name a").text().trim();
      const idStr = $(el).find(".film-poster-ahref").attr("href") || $(el).find(".film-name a").attr("href") || "";
      const id = idStr.split("?")[0].replace("/", "");
      const poster = $(el).find(".film-poster-img").attr("data-src") || $(el).find(".film-poster-img").attr("src") || "";
      const type = $(el).find(".fdi-item").first().text().trim();
      const duration = $(el).find(".fdi-duration").text().trim();
      const sub = $(el).find(".tick-sub").text().trim() || 0;
      const dub = $(el).find(".tick-dub").text().trim() || 0;

      if (id) {
        results.push({ id, title, poster, type, duration, sub, dub });
      }
    });

    res.json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch popular anime" });
  }
});

app.get("/api/az", async (req, res) => {
  try {
    const char = req.query.char as string || "A";
    const page = parseInt(req.query.page as string) || 1;
    const isOther = char === "Other";
    
    // Kaido handles A-Z via /az-list/A or /az-list/other (all non alphabet chars usually go under 'other' or something similar, wait let's just use char literally if not 'All')
    // Wait, kaido az-list path: usually /az-list/[A-Z]
    // Aniwatch has /az-list/other for non-alpha. Let's just pass `char` mapped to lowercase/uppercase as provided
    let path = char === "All" ? "/az-list" : `/az-list/${char}`;
    if (page > 1) {
      path += `?page=${page}`;
    }

    const htmlRes = await fetchKaido(path);
    const html = await htmlRes.text();
    const $ = cheerio.load(html);

    const results: any[] = [];
    $(".flw-item").each((_, el) => {
      const title = $(el).find(".dynamic-name").text().trim() || $(el).find(".film-name a").text().trim();
      const idStr = $(el).find(".film-poster-ahref").attr("href") || $(el).find(".film-name a").attr("href") || "";
      const id = idStr.split("?")[0].replace("/", "");
      const poster = $(el).find(".film-poster-img").attr("data-src") || $(el).find(".film-poster-img").attr("src") || "";
      const type = $(el).find(".fdi-item").first().text().trim();
      const duration = $(el).find(".fdi-duration").text().trim();
      const sub = $(el).find(".tick-sub").text().trim() || 0;
      const dub = $(el).find(".tick-dub").text().trim() || 0;

      if (id) {
        results.push({ id, title, poster, type, duration, sub, dub });
      }
    });

    res.json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch AZ list" });
  }
});

app.get("/api/info", async (req, res) => {
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: "ID is required" });

    const htmlRes = await fetchKaido(`/${id}`);
    const html = await htmlRes.text();
    const $ = cheerio.load(html);

    const title = $(".film-name.dynamic-name").first().text().trim();
    const description = $(".film-description").text().trim();
    const poster = $(".film-poster-img").attr("src");
    
    // Extracted from ID, e.g., road-of-naruto-18220 => 18220
    const internalIdParts = id.split("-");
    const internalId = internalIdParts[internalIdParts.length - 1];

    if (!internalId) {
       return res.status(404).json({ error: "Invalid ID" });
    }

    const epsRes = await fetchKaido(`/ajax/episode/list/${internalId}`);
    const epsData = await epsRes.json();
    const $eps = cheerio.load(epsData.html || "");
    const episodes: any[] = [];

    $eps(".ep-item").each((_, el) => {
      episodes.push({
        id: $eps(el).attr("data-id"),
        number: $eps(el).attr("data-number"),
        title: $eps(el).find(".ep-name").text().trim() || `Episode ${$eps(el).attr("data-number")}`,
      });
    });

    const recommended: any[] = [];
    $(".film_list-wrap .flw-item").each((i, el) => {
        const idHref = $(el).find(".film-poster-ahref").attr("href");
        if(!idHref) return;
        const idMatch = idHref.split("/")[1];
        if(!idMatch) return;
        
        recommended.push({
            id: idMatch,
            title: $(el).find(".dynamic-name").text().trim(),
            poster: $(el).find(".film-poster-img").attr("data-src") || $(el).find(".film-poster-img").attr("src"),
            type: $(el).find(".fdi-item").first().text().trim() || "Unknown",
            duration: $(el).find(".fdi-duration").text().trim() || "N/A",
            sub: $(el).find(".tick-sub").text().trim() || "0",
            dub: $(el).find(".tick-dub").text().trim() || "0",
        });
    });

    res.json({ title, description, poster, episodes, recommended });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch anime info" });
  }
});

app.get("/api/servers", async (req, res) => {
  try {
    const epId = req.query.id as string;
    if (!epId) return res.status(400).json({ error: "Episode ID is required" });

    const epsRes = await fetchKaido(`/ajax/episode/servers?episodeId=${epId}`);
    if (!epsRes.ok) return res.status(epsRes.status).json({ error: `Kaido returned status ${epsRes.status} for servers.` });
    
    const epsData = await epsRes.json();
    if (!epsData || !epsData.html) {
      return res.status(500).json({ error: "Upstream server provided an empty or invalid response." });
    }

    const $ = cheerio.load(epsData.html);

    const servers: any[] = [];
    $(".server-item").each((_, el) => {
      servers.push({
        id: $(el).attr("data-id"),
        serverId: $(el).attr("data-server-id"),
        type: $(el).attr("data-type"),
        name: $(el).find("a").text().trim()
      });
    });

    res.json({ servers });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to fetch servers" });
  }
});

app.get("/api/source", async (req, res) => {
  try {
    const serverId = req.query.id as string;
    if (!serverId) return res.status(400).json({ error: "Server ID is required" });

    const sourceRes = await fetchKaido(`/ajax/episode/sources?id=${serverId}`);
    if (!sourceRes.ok) return res.status(sourceRes.status).json({ error: `Kaido returned status ${sourceRes.status} for source.` });
    
    let sourceData;
    try {
      sourceData = await sourceRes.json();
    } catch (e) {
      const text = await sourceRes.text().catch(() => "");
      console.error("Failed to parse Kaido source JSON. Text:", text.substring(0, 500));
      return res.status(502).json({ error: "Invalid JSON response from the upstream source provider." });
    }
    
    if (!sourceData || !sourceData.link) {
        return res.status(404).json({ error: "Direct stream link could not be found for this server." });
    }

    let finalLink = sourceData.link;
    let proxyNeeded = false;
    
    // Attempt to extract raw M3U8 from providers to bypass browser Referer checks via our API proxy
    if (finalLink.includes("rapid-cloud.co") || finalLink.includes("megacloud.tv") || finalLink.includes("vidcloud.pro")) {
       try {
           const idMatch = finalLink.match(/\/([A-Za-z0-9_-]+)(?:\?|$)/);
           if (idMatch && idMatch[1]) {
               const parsedUrl = new URL(finalLink);
               const domain = parsedUrl.origin;
               const extractedId = idMatch[1];
               
               const rapidRes = await fetch(`${domain}/embed-2/v2/e-1/getSources?id=${extractedId}`, {
                   headers: {
                       'X-Requested-With': 'XMLHttpRequest',
                       'Referer': finalLink,
                       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                   }
               });
               
               if (rapidRes.ok) {
                   const rapidData = await rapidRes.json().catch(() => null);
                   if (rapidData && rapidData.encrypted === false && rapidData.sources?.[0]?.file) {
                       finalLink = rapidData.sources[0].file;
                       proxyNeeded = true;
                   }
                   if (rapidData && rapidData.tracks) {
                       sourceData.tracks = rapidData.tracks;
                   }
               }
           }
       } catch (e) {
           console.error("Failed to extract raw M3U8:", e);
       }
    }

    res.json({ link: finalLink, type: sourceData.type, proxyNeeded, originalLink: sourceData.link, tracks: sourceData.tracks || [] });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to fetch source" });
  }
});

app.get('/api/proxy', async (req, res) => {
    try {
        const queryUrl = req.query.url as string;
        if (!queryUrl) return res.status(400).send("URL required");

        const headers: any = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'Referer': 'https://rapid-cloud.co/',
            'Origin': 'https://rapid-cloud.co'
        };
        
        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        if (queryUrl.includes('.m3u8')) {
            const proxyRes = await axios.get(queryUrl, { 
                headers, 
                responseType: 'text',
                validateStatus: () => true 
            });
            
            let text = proxyRes.data;
            if (proxyRes.status >= 400 || typeof text !== 'string' || !text.includes('#EXTM3U')) {
                 res.status(proxyRes.status >= 400 ? proxyRes.status : 500).send(text);
                 return;
            }

            const absoluteUrlBase = new URL(queryUrl).href.replace(/\/[^\/]*$/, '/');
            const rewritten = text.replace(/^(?!#)(.+)$/gm, (match: string) => {
                if (!match.trim()) return match;
                if (match.startsWith('http')) return `/api/proxy?url=${encodeURIComponent(match)}`;
                return `/api/proxy?url=${encodeURIComponent(absoluteUrlBase + match)}`;
            });
            
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(rewritten);
        } else {
            // Stream raw .ts chunks and .vtt subtitles directly using axios
            try {
                const proxyStreamRes = await axios({
                    method: 'get',
                    url: queryUrl,
                    responseType: 'stream',
                    headers: headers,
                    decompress: false, // Maintain native compression
                    validateStatus: () => true // Handle errors manually
                });

                res.status(proxyStreamRes.status);
                res.setHeader('Access-Control-Allow-Origin', '*');
                
                const ignoreHeaders = ['connection', 'transfer-encoding', 'host', 'keep-alive'];
                for (const [key, value] of Object.entries(proxyStreamRes.headers)) {
                    if (!ignoreHeaders.includes(key.toLowerCase()) && value) {
                        res.setHeader(key, value as string);
                    }
                }
                
                proxyStreamRes.data.pipe(res);
            } catch (streamErr) {
                console.error("Axios stream proxy error", streamErr);
                if (!res.headersSent) res.status(500).send("Proxy stream error");
            }
        }
    } catch (error) {
        console.error("Proxy error", error);
        if (!res.headersSent) res.status(500).send("Proxy error");
    }
});

app.get('/api/schedule', async (req, res) => {
    try {
        const title = req.query.title as string;
        
        let query = "";
        let variables = {};
        
        if (title) {
            query = `query ($search: String) {
              Media(search: $search, type: ANIME) {
                nextAiringEpisode {
                  airingAt
                  episode
                }
              }
            }`;
            variables = { search: title };
        } else {
            query = `query {
              Page(page: 1, perPage: 25) {
                airingSchedules(notYetAired: true, sort: TIME) {
                  airingAt
                  episode
                  media {
                    title {
                      romaji
                      english
                    }
                    coverImage {
                      extraLarge
                      large
                    }
                  }
                }
              }
            }`;
        }
        
        const gqlRes = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                query,
                variables
            })
        });
        
        const data = await gqlRes.json();
        
        if (title) {
            res.json({ nextAiringEpisode: data.data?.Media?.nextAiringEpisode || null });
        } else {
            const mapped = data.data?.Page?.airingSchedules?.map((s: any) => ({
                time: s.airingAt,
                episode: s.episode,
                title: s.media?.title?.english || s.media?.title?.romaji,
                poster: s.media?.coverImage?.extraLarge || s.media?.coverImage?.large
            })) || [];
            res.json({ schedule: mapped });
        }
    } catch (e) {
        console.error("Schedule API error:", e);
        res.status(500).json({ error: "Failed to fetch schedule." });
    }
});

async function startServer() {
  if (process.env.VERCEL) {
    return; // Vercel handles serving static files and doesn't need app.listen
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
