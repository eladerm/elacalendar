const fs = require('fs');

function revertFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Colors mapping (Reverting white/light mode tailwind back to dark slate)
  content = content.replace(/bg-background/g, 'bg-[#0f172a]');
  
  if (path.includes('chat')) {
      content = content.replace(/bg-card\/50/g, 'bg-[#1e293b]/20');
      content = content.replace(/bg-card/g, 'bg-[#1e293b]/40');
  } else if (path.includes('layout')) {
      content = content.replace(/bg-card/g, 'bg-[#1e293b]/50');
  } else {
      content = content.replace(/bg-card/g, 'bg-[#1e293b]/40');
  }
  
  content = content.replace(/bg-accent\/50/g, 'bg-slate-800/50');
  content = content.replace(/bg-accent\/40/g, 'bg-slate-800/40');
  content = content.replace(/bg-accent/g, 'bg-slate-800');
  content = content.replace(/bg-muted\/80/g, 'bg-slate-700');
  content = content.replace(/bg-muted/g, 'bg-slate-800');
  content = content.replace(/hover:bg-accent/g, 'hover:bg-slate-800');
  
  content = content.replace(/border-border\/50/g, 'border-slate-700/20');
  content = content.replace(/border-border/g, 'border-slate-700/50');

  // Text mappings
  if (path.includes('chat')) {
      content = content.replace(/text-foreground\/80/g, 'text-slate-300');
      content = content.replace(/text-foreground/g, 'text-white');
      content = content.replace(/text-muted-foreground\/80/g, 'text-slate-500');
      content = content.replace(/text-muted-foreground\/60/g, 'text-slate-600');
      content = content.replace(/text-muted-foreground\/40/g, 'text-slate-700');
      content = content.replace(/text-muted-foreground/g, 'text-slate-400');
  } else {
      content = content.replace(/text-foreground/g, 'text-white');
      content = content.replace(/text-muted-foreground\/80/g, 'text-slate-500');
      content = content.replace(/text-muted-foreground/g, 'text-slate-400');
      content = content.replace(/hover:text-primary\b/g, 'hover:text-white');
      content = content.replace(/hover:text-foreground\/80/g, 'hover:text-slate-300');
      content = content.replace(/hover:text-foreground/g, 'hover:text-slate-200');
  }

  // Emerald mappings
  content = content.replace(/bg-primary\/20/g, 'bg-emerald-500/10'); // Or bg-emerald-500/20 depending on context
  content = content.replace(/bg-primary\/80/g, 'bg-emerald-700');
  content = content.replace(/bg-primary/g, 'bg-emerald-500');
  content = content.replace(/hover:bg-primary\/80/g, 'hover:bg-emerald-600');
  content = content.replace(/bg-gradient-to-r from-primary\/80 to-primary\/60/g, 'bg-gradient-to-r from-emerald-600 to-emerald-400');
  content = content.replace(/shadow-primary\/20/g, 'shadow-emerald-500/20');
  content = content.replace(/focus-within:border-primary\/50/g, 'focus-within:border-emerald-500/50');
  content = content.replace(/focus-visible:ring-primary/g, 'focus-visible:ring-emerald-500');
  
  content = content.replace(/border-primary\/50/g, 'border-emerald-500/50');
  content = content.replace(/border-primary/g, 'border-emerald-500');
  
  content = content.replace(/text-primary\/80/g, 'text-emerald-400');
  content = content.replace(/text-primary/g, 'text-emerald-500');
  content = content.replace(/hover:text-primary\/80/g, 'hover:text-emerald-400');
  content = content.replace(/from-primary\/80 to-primary\/60/g, 'from-emerald-500 to-emerald-400');
  content = content.replace(/text-primary-foreground\/60/g, 'text-emerald-100/60');
  content = content.replace(/text-primary-foreground\/80/g, 'text-emerald-50/80');

  // Fix up specific buttons or gradients missed by general replacement
  content = content.replace(/bg-emerald-500\/10 text-emerald-400/g, 'bg-emerald-500/10 text-emerald-400');
  
  // Inlayout, the back button was modified from text-muted-foreground hover:text-primary, 
  // since we replaced hover:text-primary with hover:text-white above, we fix the Volver button 
  // if we want it to glow emerald on hover, let's fix it explicitly:
  if (path.includes('layout.tsx')) {
      content = content.replace(/hover:text-white transition-colors">\s*<svg/g, 'hover:text-emerald-500 transition-colors">\n            <svg');
  }

  // Finally re-apply the structural text to white so that the body looks dark theme appropriate
  // The layout background was reset to #0f172a, let's make sure it's dark text.
  content = content.replace(/text-slate-200 overflow-hidden/g, 'text-white overflow-hidden'); // generic fix

  fs.writeFileSync(path, content);
}

revertFile('src/app/crm/page.tsx');
revertFile('src/app/crm/layout.tsx');
revertFile('src/app/crm/chat/page.tsx');
console.log('Reversión ejecutada');
