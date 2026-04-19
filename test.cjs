const cheerio = require('cheerio');
fetch('https://kaido.to/most-popular', {headers: {'User-Agent': 'Mozilla/5.0'}})
  .then(res => res.status)
  .then(status => console.log('/most-popular status:', status));

fetch('https://kaido.to/top-viewed', {headers: {'User-Agent': 'Mozilla/5.0'}})
  .then(res => res.status)
  .then(status => console.log('/top-viewed status:', status));
