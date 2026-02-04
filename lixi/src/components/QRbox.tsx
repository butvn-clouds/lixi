import React from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QRBox({ joinUrl }: { joinUrl: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    alert("Copied!");
  };

  return (
    <div className="sv-box">
      <div className="sv-box-title">QUÉT MÃ THAM GIA</div>
      <div className="sv-qr-wrap">
        <QRCodeCanvas value={joinUrl} size={190} />
      </div>
      <div className="sv-copy-row">
        <div className="sv-copy-link">{joinUrl}</div>
        <button className="sv-copy-btn" onClick={copy}>COPY</button>
      </div>
    </div>
  );
}
