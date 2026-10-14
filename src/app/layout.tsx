import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OMEKH - Beyond Human Perception",
  description: "Percepcion multimodal local-first para computadora y celular.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "OMEKH", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: "if ('serviceWorker' in navigator) { window.addEventListener('load', function(){ navigator.serviceWorker.register('/sw.js').catch(function(){}) }); }",
          }}
        />
      </body>
    </html>
  );
}