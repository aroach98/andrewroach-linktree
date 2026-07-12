import "./globals.css";

export const metadata = {
  title: "andrewroach.xyz",
  description: "Andrew Roach — links",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
