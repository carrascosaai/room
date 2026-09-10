"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 176 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#08080a", light: "#f4f4f5" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      alive = false;
    };
  }, [value, size]);

  return (
    <div
      className="overflow-hidden rounded-2xl bg-[var(--text)] p-1.5"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="QR code to join the room" width={size} height={size} />
      ) : (
        <div className="h-full w-full animate-pulse-soft rounded-xl bg-[var(--surface)]" />
      )}
    </div>
  );
}
