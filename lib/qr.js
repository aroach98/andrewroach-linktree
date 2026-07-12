import QRCode from "qrcode";

// Renders a QR code for the given URL as an inline SVG string (no external
// requests, no client JS). Cached for the life of the server instance.
export async function qrSvg(url) {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0a0a0a", light: "#00000000" }, // transparent background
  });
}
