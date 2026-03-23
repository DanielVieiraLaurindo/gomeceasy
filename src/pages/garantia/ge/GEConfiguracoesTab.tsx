import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function GEConfiguracoesTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-barlow font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">Configurações do módulo de devoluções</p>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Em desenvolvimento</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">As configurações do sistema serão disponibilizadas em breve.</p></CardContent>
      </Card>
    </div>
  );
}
