import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { elysiumMainnet } from "./config";

export const wagmiConfig = createConfig({
  chains: [elysiumMainnet],
  connectors: [injected()],
  transports: {
    [elysiumMainnet.id]: http(),
  },
  ssr: true,
});
