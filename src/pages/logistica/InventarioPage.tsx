import React from 'react';
import { ClipboardList } from 'lucide-react';

export default function InventarioPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-barlow font-bold">Inventário</h2>
        <p className="text-muted-foreground text-sm">Controle e contagem de inventário</p>
      </div>
      <div className="card-base p-8 text-center text-muted-foreground">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Módulo de inventário em construção</p>
      </div>
    </div>
  );
}
