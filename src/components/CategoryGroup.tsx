import { useState } from "react";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import { ChannelItem } from "./ChannelItem";

export function CategoryGroup({ name, channels, canManage, onEdit, onDelete }: {
  name: string; channels: any[]; canManage: boolean;
  onEdit: (c: any) => void; onDelete: (c: any) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="space-y-1.5">
      <button onClick={() => setCollapsed((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent/20 transition-all text-sm font-medium text-foreground/70 group">
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        <Folder className="h-3.5 w-3.5 text-primary/60" />
        <span className="flex-1 text-left">{name}</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition">
          {channels.length}
        </span>
      </button>
      {!collapsed && (
        <div className="space-y-0.5 pl-4 border-l border-border/40">
          {channels.map((c: any) => (
            <ChannelItem key={c.id} channel={c} canManage={canManage}
              onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} />
          ))}
        </div>
      )}
    </div>
  );
}
