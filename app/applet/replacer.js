const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\{\/\*\s*Episodes List in Watch View\s*\*\/\}\s*\{animeInfo\s*&&\s*animeInfo\.episodes\.length\s*>\s*0\s*&&\s*\(\s*<div\s*className="bg-\[#050505\] rounded-2xl overflow-hidden border border-white\/10 shadow-2xl p-4 md:p-6 mb-8">\s*<div\s*className="mb-6 flex items-center justify-between border-b border-white\/10 pb-4">\s*<h2\s*className="text-lg font-semibold text-white">Episodes<\/h2>\s*<span\s*className="text-sm text-\[#A0A0A0\]"\>\{animeInfo\.episodes\.length\}\s*episodes<\/span>\s*<\/div>/g;

const replace = \`{/* Episodes List in Watch View */}
              {animeInfo && animeInfo.episodes.length > 0 && (
                <div className="bg-[#050505] rounded-2xl overflow-hidden border border-white/10 shadow-2xl p-4 md:p-6 mb-8">
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-white">Episodes</h2>
                      <span className="text-sm text-[#A0A0A0]">{animeInfo.episodes.length} episodes</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors shrink-0">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded appearance-none cursor-pointer border border-white/20 checked:bg-[#FF3E3E] checked:border-[#FF3E3E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3E3E] relative flex items-center justify-center after:content-[''] after:absolute after:hidden checked:after:block after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-white after:rotate-45 after:-translate-y-[1px] transition-all"
                        checked={autoPlayNext}
                        onChange={(e) => setAutoPlayNext(e.target.checked)} 
                      />
                      <span className="text-sm font-medium text-white/80 select-none">Auto-play next</span>
                    </label>
                  </div>\`;

const newCode = code.replace(regex, replace);

if (newCode !== code) {
  fs.writeFileSync('src/App.tsx', newCode);
  console.log("Patched successfully!");
} else {
  console.log("Regex match not found.");
}
