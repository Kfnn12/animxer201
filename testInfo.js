fetch("http://localhost:3000/api/info?id=one-piece-100")
  .then(r => r.json())
  .then(data => {
      if(!data.recommended) console.log("no rec");
      else console.log("recommended len:", data.recommended.length);
  })
  .catch(console.error);
