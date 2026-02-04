import Swal from "sweetalert2";
import confetti from "canvas-confetti";

export function moneyVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export function showWin(amountText: string) {
  confetti({ particleCount: 120, spread: 75, origin: { y: 0.65 } });

  Swal.fire({
    title: `<span style="color:#F59E0B">🧧 CHÚC MỪNG! 🧧</span>`,
    html: `
      <div style="font-size:2.2rem;margin:14px 0">💵</div>
      <div style="font-size:2rem;font-weight:1000;color:#F59E0B">${amountText}</div>
    `,
    background: "linear-gradient(135deg,#1E3A5F,#0F172A)",
    color: "#fff",
    confirmButtonText: "TUYỆT VỜI! 🎉",
    confirmButtonColor: "#F59E0B",
    allowOutsideClick: false
  });
}

export function showTroll(text: string) {
  Swal.fire({
    title: `<span style="color:#EC4899">😈 OH NO! 😈</span>`,
    html: `<div style="font-size:2.2rem;margin:14px 0">🎲</div>
           <div style="font-size:1.5rem;font-weight:1000;color:#EC4899">${text
            
           }</div>`,
    background: "linear-gradient(135deg,#1E3A5F,#0F172A)",
    color: "#fff",
    confirmButtonText: "Chấp nhận 😭",
    confirmButtonColor: "#EC4899",
    allowOutsideClick: false
  });
}

export function toastErr(msg: string) {
  Swal.fire({
    icon: "error",
    title: "Oops...",
    text: msg,
    background: "linear-gradient(135deg,#1E3A5F,#0F172A)",
    color: "#fff",
    confirmButtonColor: "#DC2626"
  });
}
