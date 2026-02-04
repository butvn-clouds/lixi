export const formatMoney = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + "đ";
