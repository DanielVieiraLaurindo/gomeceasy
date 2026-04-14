import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

export default function TransferenciaPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-barlow font-bold">Transferência</h2>
        <p className="text-muted-foreground text-sm">Transferências entre lojas e centros de distribuição</p>
      </div>
      <div className="card-base p-8 text-center text-muted-foreground">
        <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Módulo de transferências em construção</p>
      </div>
    </div>
  );
}
