export function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export function now() {
  return Date.now();
}

export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function genRoomCode6(): string {
  // 6 digits like screenshots
  return String(randInt(100000, 999999));
}

export function upper(s: string) {
  return (s ?? "").toString().trim().toUpperCase();
}
