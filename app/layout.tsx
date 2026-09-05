import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_TITLE } from "@/lib/config";
import EnvBanner from "@/components/EnvBanner";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "ระบบเบิกสินค้าแต่ละแพลตฟอร์ม",
};

export const viewport: Viewport = { themeColor: "#ee4d2d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* ใช้ขนาดตัวอักษรที่ผู้ใช้เลือกไว้ ตั้งแต่ก่อนวาดหน้า (กันจอกระพริบ) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem('sf_fontsize');if(v){document.documentElement.setAttribute('data-fontsize',v);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen"><EnvBanner />{children}</body>
    </html>
  );
}
