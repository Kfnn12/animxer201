import * as cheerio from 'cheerio';

async function testAZ() {
    const res = await fetch("https://kaido.to/az-list/A?page=1", {
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    const text = await res.text();
    const $ = cheerio.load(text);
    const items = [];
    $(".flw-item").each((_, el) => {
        items.push($(el).find(".dynamic-name").text().trim());
    });
    console.log("AZ links found:", items.length);
}
testAZ();
