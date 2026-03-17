import { Layout } from "@/components/layout";
import { useGetHistory, useDeleteHistory } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Loader2, Trash2, ChevronDown, ChevronUp, Image as ImageIcon, Clock } from "lucide-react";
import { useState } from "react";
import { PlatformIcon } from "@/components/platform-icon";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function History() {
  const { data: history, isLoading, refetch } = useGetHistory();
  const deleteMutation = useDeleteHistory();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this history record?")) {
      await deleteMutation.mutateAsync({ id });
      refetch();
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-10">
        <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Operations Log</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Review past generations and export historical captions.
        </p>
      </div>

      {!history || history.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center">
          <Clock className="w-16 h-16 text-white/10 mb-4" />
          <h3 className="text-xl font-serif text-white/50">No history found</h3>
          <p className="text-muted-foreground mt-2">Saved generations will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const dateStr = format(new Date(entry.createdAt), "MMM d, yyyy • HH:mm");
            
            return (
              <motion.div 
                key={entry.id}
                layout
                className="glass-panel rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <div className="p-4 md:p-6 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                    {entry.imageThumbnail ? (
                      <img src={`data:image/jpeg;base64,${entry.imageThumbnail}`} className="w-16 h-16 object-cover rounded-lg border border-white/10 bg-black/40" alt="Map Thumbnail" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-white/20" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider border border-primary/20">
                          {entry.mapType}
                        </span>
                        <span className="text-sm text-muted-foreground">{dateStr}</span>
                      </div>
                      <p className="text-foreground font-medium truncate">
                        {entry.contextNotes || "No context notes provided."}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive z-10" onClick={(e) => handleDelete(entry.id, e)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="text-muted-foreground">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5 bg-black/20 overflow-hidden"
                    >
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(entry.captions).map(([platform, text]) => (
                          <div key={platform} className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-semibold capitalize text-muted-foreground">
                              <PlatformIcon platform={platform} />
                              {platform}
                            </div>
                            <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-sm text-foreground/90 whitespace-pre-wrap">
                              {text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
