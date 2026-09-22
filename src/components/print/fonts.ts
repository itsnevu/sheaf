import { VT323 } from "next/font/google";

/* The pixel face for the paper. Loaded here so both the layout and the page can reach it. */
export const pixel = VT323({ variable: "--font-pixel", subsets: ["latin"], weight: "400", display: "block" });
