import React from 'react';
import { Boxes } from 'lucide-react';

export default function RecebimentoPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-barlow font-bold">Recebimento de Mercadoria</h2>
        <p className="text-muted-foreground text-sm">Registro e conferência de mercadorias recebidas</p>
      </div>
      <div className="card-base p-8 text-center text-muted-foreground">
        <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Módulo de recebimento em construção</p>
      </div>
    </div>
  );
}
