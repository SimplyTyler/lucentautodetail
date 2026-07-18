import "./globals.css";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://lucentautodetail.onrender.com"),
  title: {
    default: "Lucent Auto Detail | Membership Car Care",
    template: "%s | Lucent Auto Detail"
  },
  description:
    "Recurring, detail-first vehicle care for daily drivers, collector cars, and business fleets.",
  openGraph: {
    title: "Lucent Auto Detail",
    description: "Precision detailing, built around your vehicles.",
    images: ["/lucent-hero-v2.jpg"]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
