import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="18" fill="#C8FF3D" />
      <path d="M22 50V18h12.5c7.2 0 11.5 4.1 11.5 10.4S41.7 39 34.5 39H29v11h-7Zm7-17.6h5c3.2 0 5-1.5 5-4s-1.8-4-5-4h-5v8Z" fill="#10140A" />
      <circle cx="47" cy="47" r="5" fill="#FF4D7E" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="PLANEA — inicio">
      <LogoMark size={30} />
      <span className="font-display text-xl font-extrabold tracking-tight">planea</span>
    </Link>
  );
}
