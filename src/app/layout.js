import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export const metadata = {
  title: "Telko.Store — Beli Pulsa & Paket Data Telkomsel Murah",
  description:
    "Marketplace pulsa, paket data, voucher internet & voucher game Telkomsel. Proses instan, harga murah, tanpa perlu daftar akun!",
  keywords: "pulsa telkomsel, paket data, voucher internet, voucher game, top up game",
  openGraph: {
    title: "Telko.Store — Produk Virtual Telkomsel",
    description: "Beli pulsa & paket data Telkomsel murah. Express checkout, tanpa ribet!",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased overflow-x-hidden">
        <Header />
        <main className="safe-bottom">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
