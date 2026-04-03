import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Tag } from 'lucide-react';
import { useBrands } from '@/hooks/useEnvios';
import { useUserBrands, useToggleUserBrand } from '@/hooks/useUserBrands';

export default function MinhasMarcasPage() {
  const { data: brands = [], isLoading: brandsLoading } = useBrands();
  const { data: myBrands = [], isLoading: myBrandsLoading } = useUserBrands();
  const { addBrand, removeBrand } = useToggleUserBrand();
  const [search, setSearch] = useState('');

  const myBrandIds = useMemo(() => new Set(myBrands.map(ub => ub.brand_id)), [myBrands]);

  const activeBrands = useMemo(() => {
    const list = (brands as any[]).filter((b: any) => b.ativo !== false);
    const s = search.toLowerCase();
    if (!s) return list;
    return list.filter((b: any) => b.nome.toLowerCase().includes(s) || (b.nome_completo || '').toLowerCase().includes(s));
  }, [brands, search]);

  const isLoading = brandsLoading || myBrandsLoading;

  const handleToggle = (brandId: string) => {
    if (myBrandIds.has(brandId)) {
      removeBrand.mutate(brandId);
    } else {
      addBrand.mutate(brandId);
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Tag className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Minhas Marcas</h2>
          <p className="text-sm text-muted-foreground">
            Selecione as marcas que você atende. Pedidos de compras dessas marcas serão atribuídos automaticamente a você.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar marca..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Badge variant="outline" className="px-3 py-1.5">
          {myBrandIds.size} selecionada{myBrandIds.size !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeBrands.map((brand: any) => {
          const isSelected = myBrandIds.has(brand.id);
          return (
            <Card
              key={brand.id}
              className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
              onClick={() => handleToggle(brand.id)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Checkbox checked={isSelected} className="pointer-events-none" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{brand.nome}</p>
                  {brand.nome_completo && (
                    <p className="text-xs text-muted-foreground truncate">{brand.nome_completo}</p>
                  )}
                  {brand.categoria && (
                    <Badge variant="outline" className="text-xs mt-1">{brand.categoria}</Badge>
                  )}
                </div>
                {isSelected && (
                  <Badge className="bg-primary/15 text-primary border-primary/30 shrink-0">Ativa</Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
        {activeBrands.length === 0 && (
          <p className="col-span-full text-center py-8 text-muted-foreground">Nenhuma marca encontrada</p>
        )}
      </div>
    </div>
  );
}
