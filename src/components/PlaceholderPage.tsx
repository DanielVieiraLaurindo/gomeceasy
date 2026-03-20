import React from 'react';
import { Package } from 'lucide-react';

export default function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="card-base p-16 text-center text-muted-foreground">
        <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="font-barlow font-bold text-lg">Em Desenvolvimento</p>
        <p className="text-sm mt-1">Este módulo será implementado em breve.</p>
      </div>
    </div>
  );
}
