import React from 'react';

export function GoPartsLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
        <circle cx="14" cy="14" r="12" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
        <circle cx="14" cy="14" r="4" fill="hsl(var(--primary))" />
        <rect x="13" y="2" width="2" height="4" rx="1" fill="hsl(var(--primary))" />
        <rect x="13" y="22" width="2" height="4" rx="1" fill="hsl(var(--primary))" />
        <rect x="22" y="13" width="4" height="2" rx="1" fill="hsl(var(--primary))" />
        <rect x="2" y="13" width="4" height="2" rx="1" fill="hsl(var(--primary))" />
        <rect x="20.5" y="5.5" width="2" height="3" rx="1" fill="hsl(var(--primary))" transform="rotate(45 21.5 7)" />
        <rect x="4.5" y="19.5" width="2" height="3" rx="1" fill="hsl(var(--primary))" transform="rotate(45 5.5 21)" />
      </svg>
      {!collapsed && (
        <span className="text-lg font-barlow font-bold tracking-tight">
          <span className="text-primary">Go</span>
          <span className="text-sidebar-foreground">Parts</span>
        </span>
      )}
    </div>
  );
}
