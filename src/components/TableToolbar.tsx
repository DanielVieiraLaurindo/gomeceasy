import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Upload, Download, FileDown, Trash2 } from 'lucide-react';
import { exportToExcel } from '@/lib/export-utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface TableToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  // Import
  onImport?: (rows: Record<string, any>[]) => void;
  importLabel?: string;
  // Export
  exportData?: Record<string, any>[];
  exportFilename?: string;
  // Template
  templateColumns?: string[];
  templateFilename?: string;
  // Bulk
  selectedCount?: number;
  onBulkDelete?: () => void;
  bulkActions?: React.ReactNode;
  // Extra
  children?: React.ReactNode;
}

export function TableToolbar({
  search, onSearchChange, searchPlaceholder = 'Buscar...',
  onImport, importLabel = 'Importar',
  exportData, exportFilename = 'export',
  templateColumns, templateFilename = 'modelo',
  selectedCount = 0, onBulkDelete, bulkActions,
  children
}: TableToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
      onImport(json);
    } catch {
      toast.error('Erro ao ler arquivo');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = () => {
    if (!templateColumns) return;
    const ws = XLSX.utils.aoa_to_sheet([templateColumns]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, `${templateFilename}.xlsx`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => onSearchChange(e.target.value)} placeholder={searchPlaceholder} className="pl-9 h-9" />
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
          <span className="text-xs font-medium">{selectedCount} selecionado(s)</span>
          {onBulkDelete && (
            <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={onBulkDelete}>
              <Trash2 className="w-3 h-3" /> Excluir
            </Button>
          )}
          {bulkActions}
        </div>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        {children}
        {onImport && (
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => fileRef.current?.click()}>
              <Upload className="w-3 h-3" /> {importLabel}
            </Button>
          </>
        )}
        {exportData && exportData.length > 0 && (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => exportToExcel(exportData, exportFilename)}>
            <Download className="w-3 h-3" /> Exportar
          </Button>
        )}
        {templateColumns && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={downloadTemplate}>
            <FileDown className="w-3 h-3" /> Modelo
          </Button>
        )}
      </div>
    </div>
  );
}