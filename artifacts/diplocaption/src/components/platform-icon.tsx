import { cn } from "@/lib/utils";

export function PlatformIcon({ platform, className }: { platform: string, className?: string }) {
  const p = platform.toLowerCase();
  let emoji = "📱";
  
  switch(p) {
    case 'instagram': emoji = "📸"; break;
    case 'facebook': emoji = "👥"; break;
    case 'substack': emoji = "📧"; break;
    case 'x': emoji = "𝕏"; break;
    case 'bluesky': emoji = "🦋"; break;
  }

  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
      {emoji}
    </span>
  );
}
