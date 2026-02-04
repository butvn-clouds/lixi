export class ShakeDetector {
  private last = 0;
  private lx: number | null = null;
  private ly: number | null = null;
  private lz: number | null = null;
  private enabled = false;

  constructor(
    private opts: { threshold?: number; cooldownMs?: number; onShake: (energy: number) => void }
  ) {}

  async requestPermission(): Promise<boolean> {
    const Any = DeviceMotionEvent as any;
    if (Any?.requestPermission && typeof Any.requestPermission === "function") {
      try {
        const p = await Any.requestPermission();
        return p === "granted";
      } catch {
        return false;
      }
    }
    return true;
  }

  start() {
    if (this.enabled) return;
    this.enabled = true;
    window.addEventListener("devicemotion", this.onMotion, { passive: true });
  }

  stop() {
    if (!this.enabled) return;
    this.enabled = false;
    window.removeEventListener("devicemotion", this.onMotion);
  }

  private onMotion = (e: DeviceMotionEvent) => {
    if (!this.enabled) return;
    const now = Date.now();
    const cooldown = this.opts.cooldownMs ?? 1200;
    if (now - this.last < cooldown) return;

    const a = e.accelerationIncludingGravity;
    if (!a) return;

    const x = a.x ?? 0;
    const y = a.y ?? 0;
    const z = a.z ?? 0;

    if (this.lx != null) {
      const energy = Math.abs(x - this.lx) + Math.abs(y - (this.ly ?? 0)) + Math.abs(z - (this.lz ?? 0));
      const th = this.opts.threshold ?? 15;
      if (energy > th) {
        this.last = now;
        this.opts.onShake(energy);
      }
    }

    this.lx = x; this.ly = y; this.lz = z;
  };
}
