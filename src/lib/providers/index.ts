import { executionMode } from "@/lib/config";
import { MockProvider } from "./mock";
import { RelayProvider } from "./relay";
import type { PaymentProvider } from "./types";

let mock: MockProvider | undefined;
let relay: RelayProvider | undefined;

/** Provider for a batch. The batch's own mode wins so a mode flip never re-routes old batches. */
export function providerFor(mode: "demo" | "real"): PaymentProvider {
  if (mode === "real") return (relay ??= new RelayProvider());
  return (mock ??= new MockProvider());
}

export function currentProvider(): PaymentProvider {
  return providerFor(executionMode());
}
