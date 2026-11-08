import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { elysiumTestnet } from "./config";

export const wagmiConfig = createConfig({
  chains: [elysiumTestnet],
  connectors: [injected()],
  transports: {
    [elysiumTestnet.id]: http(),
  },
  ssr: true,
});
