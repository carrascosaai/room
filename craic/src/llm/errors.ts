export type AppErrorKind = "webgpu" | "f16" | "memory" | "network" | "storage" | "stall" | "unknown";

export interface AppError {
  kind: AppErrorKind;
  title: string;
  detail: string;
  raw?: string;
}

export function toAppError(err: unknown): AppError {
  const name = (err as { name?: string })?.name ?? "";
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const text = `${name} ${msg}`;

  if (/StallError|Sin progreso/i.test(text)) {
    return {
      kind: "stall",
      title: "La IA no termina de cargar",
      detail:
        "El motor se ha quedado parado en tu navegador. Prueba «Borrar el modelo y descargarlo de nuevo» (por si la copia guardada está dañada) o el otro modelo. Si sigue igual, cierra las demás pestañas de Craic y usa Chrome o Edge actualizados.",
      raw: msg,
    };
  }
  if (/Error en el motor de IA|comunicación con el motor/i.test(text)) {
    return {
      kind: "unknown",
      title: "El motor de IA ha fallado",
      detail: "Recarga la página. Si se repite, prueba a borrar el modelo y descargarlo de nuevo.",
      raw: msg,
    };
  }
  if (/ShaderF16SupportError|shader-f16/i.test(text)) {
    return {
      kind: "f16",
      title: "Tu GPU no admite el modo rápido",
      detail: "Probaremos con la variante compatible del modelo.",
      raw: msg,
    };
  }
  if (/WebGPUNotAvailable|WebGPUNotFound|requestAdapter|navigator\.gpu/i.test(text)) {
    return {
      kind: "webgpu",
      title: "WebGPU no está disponible",
      detail: "Este navegador o dispositivo no puede ejecutar el modelo. Mira las recomendaciones de navegador.",
      raw: msg,
    };
  }
  if (/QuotaExceeded|quota|storage/i.test(text)) {
    return {
      kind: "storage",
      title: "No hay espacio suficiente",
      detail: "Libera espacio en el dispositivo o prueba el modelo ligero. Si usas modo incógnito, sal de él: ahí el almacenamiento es muy limitado.",
      raw: msg,
    };
  }
  if (/DeviceLost|device was lost|out of memory|OutOfMemory|allocat|Maximum call stack|memory/i.test(text)) {
    return {
      kind: "memory",
      title: "Memoria insuficiente",
      detail: "El dispositivo se ha quedado sin memoria de GPU. Cierra otras pestañas y apps, y usa el modelo «Ligero». Después recarga la página.",
      raw: msg,
    };
  }
  if (/Failed to fetch|NetworkError|Load failed|network|fetch|ERR_|HTTP|404|503/i.test(text)) {
    return {
      kind: "network",
      title: "La descarga ha fallado",
      detail: "Comprueba tu conexión y vuelve a intentarlo. Lo que ya se descargó se conserva, así que continuará desde donde se quedó.",
      raw: msg,
    };
  }
  return {
    kind: "unknown",
    title: "Algo ha fallado",
    detail: "Recarga la página e inténtalo de nuevo. Si se repite, prueba el modelo «Ligero» o usa Chrome actualizado.",
    raw: msg,
  };
}
