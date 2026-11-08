export function solanaSignInMessage(input: { host: string; address: string; uri: string; nonce: string; issuedAt: string; expirationTime: string; link?: boolean }) {
  return JSON.stringify({ app: "Raqio", family: "solana", domain: input.host, address: input.address, uri: input.uri, nonce: input.nonce, issuedAt: input.issuedAt, expirationTime: input.expirationTime, statement: input.link ? "Link this wallet to your Raqio account." : "Sign in to Raqio. No transaction, no fees." });
}
