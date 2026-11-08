"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import SmoothScroll from "@/components/SmoothScroll";
import { wagmiConfig } from "@/lib/contracts/wagmi";

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5_000, refetchOnWindowFocus: false, retry: 1 } } }));
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={client}>
        <ToastProvider><SmoothScroll>{children}</SmoothScroll></ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
