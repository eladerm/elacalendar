const fs = require('fs');

function processFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Colors mapping (dark slate to white/light mode compatible tailwind)
  content = content.replace(/bg-\[\#0f172a\]/g, 'bg-background');
  content = content.replace(/bg-\[\#1e293b\]\/[0-9]+/g, 'bg-card');
  content = content.replace(/bg-\[\#1e293b\]/g, 'bg-card');
  content = content.replace(/bg-slate-800\/[0-9]+/g, 'bg-accent');
  content = content.replace(/bg-slate-800/g, 'bg-muted');
  content = content.replace(/hover:bg-slate-800/g, 'hover:bg-accent');
  
  content = content.replace(/border-slate-700\/[0-9]+/g, 'border-border');
  content = content.replace(/border-slate-700/g, 'border-border');

  content = content.replace(/text-slate-200/g, 'text-foreground');
  content = content.replace(/text-slate-400/g, 'text-muted-foreground');
  content = content.replace(/text-slate-500/g, 'text-muted-foreground/80');
  content = content.replace(/text-white/g, 'text-foreground');
  content = content.replace(/hover:text-white/g, 'hover:text-primary');
  content = content.replace(/hover:text-slate-200/g, 'hover:text-foreground');
  content = content.replace(/hover:text-slate-300/g, 'hover:text-foreground/80');

  // Emerald mappings
  content = content.replace(/bg-emerald-500\/[0-9]+/g, 'bg-primary/20');
  content = content.replace(/bg-emerald-500/g, 'bg-primary');
  content = content.replace(/hover:bg-emerald-600/g, 'hover:bg-primary/80');
  content = content.replace(/bg-gradient-to-r from-emerald-600 to-emerald-400/g, 'bg-gradient-to-r from-primary/80 to-primary/60');
  content = content.replace(/shadow-emerald-500\/[0-9]+/g, 'shadow-primary/20');
  content = content.replace(/shadow-emerald-600\/[0-9]+/g, 'shadow-primary/20');
  
  content = content.replace(/border-emerald-[0-9]+\/[0-9]+/g, 'border-primary/50');
  content = content.replace(/border-emerald-[0-9]+/g, 'border-primary');
  
  content = content.replace(/text-emerald-[0-9]+/g, 'text-primary');
  content = content.replace(/hover:text-emerald-[0-9]+/g, 'hover:text-primary/80');
  content = content.replace(/from-emerald-[0-9]+ to-emerald-[0-9]+/g, 'from-primary/80 to-primary/60');

  // Specific white tweaks inside cards
  content = content.replace(/text-emerald-50\/80/g, 'text-primary-foreground/80');

  // Insert calendar back button in Layout
  if (path.includes('layout.tsx') && !content.includes('Volver a Calendario')) {
    content = content.replace(
      /<aside className="w-64 bg-card backdrop-blur-md border-r border-border flex flex-col h-full shrink-0">/,
      `<aside className="w-64 bg-card backdrop-blur-md border-r border-border flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Volver a Calendario
          </Link>
        </div>`
    );
  }

  fs.writeFileSync(path, content);
}

processFile('src/app/crm/page.tsx');
processFile('src/app/crm/layout.tsx');
console.log('Layout y Page actualizados');
