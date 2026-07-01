import "./globals.css";

export const metadata = {
  title: "Lucent Auto Detail | Premium Mobile & Studio Detailing",
  description:
    "Lucent Auto Detail provides meticulous exterior, interior, ceramic, and maintenance detailing for drivers who want their vehicle to look freshly finished."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
