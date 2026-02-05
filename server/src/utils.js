export function formatVND(n) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export function now() {
  return Date.now();
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function genRoomCode6() {
  return String(randInt(100000, 999999));
}

export function upper(s) {
  return (s ?? "").toString().trim().toUpperCase();
}
