import fs from 'fs';

let code = fs.readFileSync('/src/App.tsx', 'utf-8');

const search = '<div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">';
const replace = `<div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
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
                  </div>`;

// Only replace occurrences related to Episodes manually
const lines = code.split('\\n');
let replaced = false;
for(let i=0; i<lines.length; i++) {
   if (lines[i].includes('border-b border-white/10 pb-4') && lines[i+1] && lines[i+1].includes('Episodes')) {
       lines[i] = replace;
       lines[i+1] = ''; // clear old lines
       lines[i+2] = '';
       lines[i+3] = '';
       replaced = true;
       break;
   }
}
if (replaced) {
   fs.writeFileSync('/src/App.tsx', lines.join('\\n'));
   console.log('Successfully patched App.tsx using patch.ts');
} else {
   console.log('Failed to patch App.tsx, target not found');
}
