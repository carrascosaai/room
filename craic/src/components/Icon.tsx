// Iconos de línea (estilo ISSEN). Trazos de 1.8 px, heredan el color del texto.
const PATHS: Record<string, string> = {
  mic: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  phone: "M3 14.5c5-4.7 13-4.7 18 0l-2.3 2.6-3.4-1.6v-2.6a13 13 0 0 0-6.6 0v2.6l-3.4 1.6L3 14.5Z",
  chevron: "M6 9l6 6 6-6",
  call: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  volume: "M4 9v6h4l5 4V5L8 9H4Zm12.5-1a5 5 0 0 1 0 8M19 5.5a8.5 8.5 0 0 1 0 13",
  send: "M5 12h13M12 5l7 7-7 7",
  sliders: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6",
  back: "M15 5l-7 7 7 7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6L6 18",
  flame: "M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.3 1.6 1.1 2.6 2.3 3.1C11 9 11.2 5.8 12 3Z",
  cards: "M7 4h11a2 2 0 0 1 2 2v11M4 8h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  chat: "M4 5h16v11H9l-5 4V5Z",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
};

export function Icon({ name, className, size = 22 }: { name: keyof typeof PATHS | string; className?: string; size?: number }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}
