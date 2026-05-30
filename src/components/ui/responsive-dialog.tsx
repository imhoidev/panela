import { type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";

interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function ResponsiveDialog({
  open, onOpenChange, trigger, title, description, children, className, contentClassName,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent className={className}>
          <DrawerHeader className="text-left">
            {title && <DrawerTitle>{title}</DrawerTitle>}
            <DrawerDescription className="sr-only">{description || title || "Diálogo"}</DrawerDescription>
          </DrawerHeader>
          <div className={`px-4 pb-6 ${contentClassName ?? ""}`}>{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={className}>
        <DialogHeader>
          {title && <DialogTitle>{title}</DialogTitle>}
          <DialogDescription className="sr-only">{description || title || "Diálogo"}</DialogDescription>
        </DialogHeader>
        <div className={contentClassName}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
