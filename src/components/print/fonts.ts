import { Barlow, Courier_Prime, VT323 } from "next/font/google";

/* Faces for the instruments: a pixel face for the printer paper, a typewriter face for the
   reader roll, and a narrow label face for panels. Loaded here so layout and pages share them. */
export const pixel = VT323({ variable: "--font-pixel", subsets: ["latin"], weight: "400", display: "block" });
export const typewriter = Courier_Prime({ variable: "--font-type", subsets: ["latin"], weight: ["400", "700"], display: "block" });
export const label = Barlow({ variable: "--font-label", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
