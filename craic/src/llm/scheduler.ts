// Planificador de peticiones al modelo con prioridades.
// El modelo solo puede generar una cosa a la vez. La respuesta del personaje
// (prioridad alta) nunca espera: si hay una tarea de fondo en marcha (las
// correcciones), se interrumpe y se repite después, cuando el modelo esté libre.

export type Priority = "high" | "normal" | "low";
const RANK: Record<Priority, number> = { high: 3, normal: 2, low: 1 };

interface Job {
  run: () => Promise<string>;
  rank: number;
  seq: number;
  preempted: boolean;
  resolve: (v: string) => void;
  reject: (e: unknown) => void;
}

export class PriorityScheduler {
  private queue: Job[] = [];
  private running: Job | null = null;
  private seq = 0;

  /** `interrupt` corta la generación en curso (engine.interruptGenerate). */
  constructor(private interrupt: () => void) {}

  submit(run: () => Promise<string>, priority: Priority = "normal"): Promise<string> {
    return new Promise((resolve, reject) => {
      const job: Job = { run, rank: RANK[priority], seq: this.seq++, preempted: false, resolve, reject };
      this.queue.push(job);
      this.sort();
      // Una tarea más importante interrumpe a una de fondo en curso.
      if (this.running && job.rank > this.running.rank && this.running.rank === RANK.low) {
        this.running.preempted = true;
        this.interrupt();
      }
      void this.pump();
    });
  }

  get busy() {
    return !!this.running || this.queue.length > 0;
  }

  private sort() {
    this.queue.sort((a, b) => b.rank - a.rank || a.seq - b.seq);
  }

  private async pump() {
    if (this.running) return;
    const job = this.queue.shift();
    if (!job) return;
    this.running = job;
    try {
      const out = await job.run();
      if (job.preempted) {
        // Se repite desde el principio cuando le toque otra vez.
        job.preempted = false;
        this.queue.push(job);
        this.sort();
      } else {
        job.resolve(out);
      }
    } catch (err) {
      if (job.preempted) {
        job.preempted = false;
        this.queue.push(job);
        this.sort();
      } else {
        job.reject(err);
      }
    } finally {
      this.running = null;
      void this.pump();
    }
  }
}
