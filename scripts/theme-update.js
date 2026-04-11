const fs = require('fs');

let content = fs.readFileSync('src/app/crm/chat/page.tsx', 'utf8');

// Colors
content = content.replace(/bg-\[\#1e293b\]\/20/g, 'bg-card/50');
content = content.replace(/bg-\[\#1e293b\]\/40/g, 'bg-card');
content = content.replace(/bg-\[\#1e293b\]/g, 'bg-card');
content = content.replace(/bg-\[\#0f172a\]\/40/g, 'bg-background');

content = content.replace(/border-slate-700\/50/g, 'border-border');
content = content.replace(/border-slate-700\/20/g, 'border-border/50');
content = content.replace(/border-slate-700/g, 'border-border');
content = content.replace(/border-slate-600/g, 'border-border');

content = content.replace(/bg-slate-800\/80/g, 'bg-accent');
content = content.replace(/bg-slate-800\/50/g, 'bg-accent/50');
content = content.replace(/bg-slate-800\/40/g, 'bg-accent/40');
content = content.replace(/bg-slate-800\/30/g, 'bg-muted');
content = content.replace(/bg-slate-800/g, 'bg-muted');
content = content.replace(/bg-slate-700/g, 'bg-muted/80');

content = content.replace(/text-slate-200/g, 'text-foreground');
content = content.replace(/text-white/g, 'text-foreground');
content = content.replace(/text-slate-300/g, 'text-foreground/80');
content = content.replace(/text-slate-400/g, 'text-muted-foreground');
content = content.replace(/text-slate-500/g, 'text-muted-foreground/80');
content = content.replace(/text-slate-600/g, 'text-muted-foreground/60');
content = content.replace(/text-slate-700/g, 'text-muted-foreground/40');

content = content.replace(/bg-emerald-500/g, 'bg-primary');
content = content.replace(/bg-emerald-600/g, 'bg-primary');
content = content.replace(/bg-emerald-700/g, 'bg-primary/80');
content = content.replace(/text-emerald-500/g, 'text-primary');
content = content.replace(/text-emerald-400/g, 'text-primary/80');
content = content.replace(/text-emerald-100\/60/g, 'text-primary-foreground/60');
content = content.replace(/border-emerald-500/g, 'border-primary');
content = content.replace(/shadow-emerald-500\/20/g, 'shadow-primary/20');
content = content.replace(/focus-within:border-emerald-500\/50/g, 'focus-within:border-primary/50');
content = content.replace(/focus-visible:ring-emerald-500/g, 'focus-visible:ring-primary');

// Add back button before the title
content = content.replace(
  /<h2 className="text-xl font-black text-foreground italic uppercase tracking-wider">Chats<\/h2>/,
  `
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => window.location.href = '/'}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-black text-foreground italic uppercase tracking-wider">Chats</h2>
            </div>
  `
);

// Add ArrowLeft to imports if it doesn't exist
if (!content.includes('ArrowLeft')) {
  content = content.replace(/import \{.*?\} from "lucide-react";/, (match) => {
    return match.replace('}', ', ArrowLeft }');
  });
}

fs.writeFileSync('src/app/crm/chat/page.tsx', content);
console.log('Script ejecutado correctamente');
