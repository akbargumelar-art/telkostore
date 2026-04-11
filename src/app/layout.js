import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AuthProvider from "@/components/AuthProvider";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata = {
  title: "Telko.Store — Beli Pulsa & Paket Data Semua Operator Murah",
  description:
    "Marketplace pulsa, paket data, voucher internet & voucher game semua operator Indonesia. Proses instan, harga murah, tanpa perlu daftar akun!",
  keywords: "pulsa murah, paket data, voucher internet, voucher game, top up game, telkomsel, indosat, xl, tri, smartfren",
  icons: {
    icon: [
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon/favicon.svg",
  },
  manifest: "/favicon/site.webmanifest",
  openGraph: {
    title: "Telko.Store — Pulsa & Paket Data Semua Operator",
    description: "Beli pulsa & paket data semua operator murah. Express checkout, tanpa ribet!",
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
        <meta name="theme-color" content="#ED0226" />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased overflow-x-hidden">
        <AuthProvider>
          <ScrollToTop />
          <Header />
          <main className="safe-bottom">{children}</main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
