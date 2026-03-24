import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Camera, ZoomIn } from 'lucide-react';

export default function GEGaleriaTab() {
  const [search, setSearch] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ['ge-gallery-photos'],
    queryFn: async () => {
      const { data: cases, error } = await supabase
        .from('return_cases')
        .select('id, case_number, client_name, photo_product_1, photo_product_2, photo_product_3, photo_label, photo_package, status, case_type')
        .or('photo_product_1.neq.,photo_product_2.neq.,photo_product_3.neq.,photo_label.neq.,photo_package.neq.')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: casePhotos } = await supabase
        .from('case_photos')
        .select('*')
        .order('created_at', { ascending: false });

      const allPhotos: any[] = [];

      (cases || []).forEach((c: any) => {
        ['photo_product_1', 'photo_product_2', 'photo_product_3', 'photo_label', 'photo_package'].forEach(field => {
          if (c[field]) {
            allPhotos.push({
              url: c[field],
              case_number: c.case_number,
              client_name: c.client_name,
              type: field.replace('photo_', ''),
              status: c.status,
              case_type: c.case_type,
            });
          }
        });
      });

      (casePhotos || []).forEach((p: any) => {
        allPhotos.push({
          url: p.photo_url,
          case_number: null,
          client_name: null,
          type: p.photo_type,
          original_name: p.original_name,
          created_at: p.created_at,
        });
      });

      return allPhotos;
    },
  });

  const filtered = useMemo(() => {
    if (!photos) return [];
    if (!search) return photos;
    const s = search.toLowerCase();
    return photos.filter((p: any) =>
      String(p.case_number || '').includes(s) ||
      (p.client_name || '').toLowerCase().includes(s) ||
      (p.type || '').toLowerCase().includes(s)
    );
  }, [photos, search]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
            <Camera className="w-5 h-5 text-info" />
          </div>
          <div>
            <h1 className="text-2xl font-barlow font-bold">Galeria de Fotos</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} fotos encontradas</p>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por caso ou cliente..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma foto encontrada</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((photo: any, i: number) => (
            <div
              key={i}
              className="group relative aspect-square rounded-lg overflow-hidden border bg-card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.url}
                alt={`Caso ${photo.case_number || ''}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={e => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <div className="text-white">
                  {photo.case_number && <p className="text-sm font-bold">#{photo.case_number}</p>}
                  {photo.client_name && <p className="text-xs opacity-80">{photo.client_name}</p>}
                  <Badge variant="secondary" className="text-[10px] mt-1">{photo.type}</Badge>
                </div>
                <ZoomIn className="absolute top-3 right-3 w-5 h-5 text-white" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedPhoto.case_number && <span>Caso #{selectedPhoto.case_number}</span>}
                  {selectedPhoto.client_name && <span className="text-muted-foreground font-normal">— {selectedPhoto.client_name}</span>}
                  <Badge variant="outline" className="text-xs ml-auto">{selectedPhoto.type}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img
                  src={selectedPhoto.url}
                  alt="Foto do caso"
                  className="max-h-[70vh] rounded-lg object-contain"
                  onError={e => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
