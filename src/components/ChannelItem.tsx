import { Volume2, Hash, Pencil, ScrollText, MessageSquare, MessageSquareText, X, GripVertical } from "lucide-react";

const channelMeta = (type: string) => {
  switch (type) {
    case "voice": return { icon: Volume2, color: "text-emerald-500" };
    case "announcement": return { icon: MessageSquare, color: "text-amber-500" };
    case "rules": return { icon: ScrollText, color: "text-rose-500" };
    case "forum": return { icon: MessageSquareText, color: "text-violet-500" };
    default: return { icon: Hash, color: "text-primary/70" };
  }
};

export function ChannelItem({ channel, canManage, onEdit, onDelete }: any) {
  const { icon: ChanIcon, color: chanColor } = channelMeta(channel.type);

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-accent/30 transition-all group">
      {canManage && <GripVertical className="h-3.5 w-3.5 text-muted-foreground/20 cursor-grab active:cursor-grabbing" />}
      <div className={`h-7 w-7 rounded-md grid place-items-center ${chanColor.replace("text-", "bg-").replace("500", "500/15")}`}>
        <ChanIcon className={`h-3.5 w-3.5 ${chanColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">{channel.name}</p>
        {channel.topic && <p className="text-[11px] text-muted-foreground/60 truncate">{channel.topic}</p>}
      </div>
      {canManage && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={onEdit}
            className="p-1.5 rounded text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-all" title="Editar canal">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all" title="Deletar canal">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
