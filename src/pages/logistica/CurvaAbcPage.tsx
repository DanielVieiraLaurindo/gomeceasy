import React from 'react';
import { BarChart2 } from 'lucide-react';

export default function CurvaAbcPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-barlow font-bold">Curva ABC</h2>
        <p className="text-muted-foreground text-sm">Classificação ABC de produtos</p>
      </div>
      <div className="card-base p-8 text-center text-muted-foreground">
        <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Módulo de Curva ABC em construção</p>
      </div>
    </div>
  );
}
