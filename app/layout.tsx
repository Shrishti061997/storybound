import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Inter } from "next/font/google";
import { SeasonProvider } from "@/components/Season";
import "./globals.css";
import "./screens.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"], display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["500"], display: "swap" });

export const metadata: Metadata = {
  title: "Storybound · Your trip, one chapter a day",
  description: "A small piece to open each day of your trip, made for where you'll be.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBF7EF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-season="summer" className={`${fraunces.variable} ${inter.variable} ${caveat.variable}`}>
      <body>
        <SeasonProvider>
          <div className="phone">
            {children}
            <footer className="footer">Art from the places you go · designed with AI · made by Arcade.</footer>
          </div>
        </SeasonProvider>
      </body>
    </html>
  );
}
