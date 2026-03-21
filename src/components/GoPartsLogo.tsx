import React from 'react';
import logoImg from '@/assets/logo-gomec.png';

export function GoPartsLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img src={logoImg} alt="GoMec" className="h-8 w-auto shrink-0" />
      {!collapsed && (
        <span className="text-lg font-barlow font-bold tracking-tight">
          <span className="text-sidebar-foreground/70">Go</span>
          <span className="text-primary">Easy</span>
        </span>
      )}
    </div>
  );
}
