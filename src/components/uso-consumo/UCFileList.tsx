import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Trash2 } from "lucide-react";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string | null;
  uploaded_by: string;
  created_at: string;
}

interface FileListProps {
  requestId: string;
  refreshKey?: number;
}

export default function UCFileList({ requestId, refreshKey }: FileListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = async () => {
    const { data } = await supabase
      .from("request_attachments")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    setAttachments((data as Attachment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAttachments();
  }, [requestId, refreshKey]);

  const handleDownload = async (attachment: Attachment) => {
    const { data, error } = await supabase.storage
      .from("request-attachments")
      .createSignedUrl(attachment.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Erro", description: "Não foi possível baixar o arquivo", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (attachment: Attachment) => {
    await supabase.storage.from("request-attachments").remove([attachment.file_path]);
    await supabase.from("request_attachments").delete().eq("id", attachment.id);
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    toast({ title: "Arquivo removido" });
  };

  if (loading) return null;
  if (attachments.length === 0) return <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>;

  return (
    <div className="space-y-2">
      {attachments.map((a) => (
        <div key={a.id} className="flex items-center gap-2 p-2 rounded-md bg-muted text-sm">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate flex-1">{a.file_name}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{(a.file_size / 1024).toFixed(0)} KB</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(a)}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          {user?.id === a.uploaded_by && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
