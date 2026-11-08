export const RAQIO_STREAM_ABI = [
  { type: "event", name: "StreamCreated", inputs: [
    { name: "streamId", type: "uint256", indexed: true },
    { name: "sender", type: "address", indexed: true },
    { name: "recipient", type: "address", indexed: true },
    { name: "token", type: "address", indexed: false },
    { name: "deposit", type: "uint256", indexed: false },
    { name: "startTime", type: "uint256", indexed: false },
    { name: "cliffTime", type: "uint256", indexed: false },
    { name: "endTime", type: "uint256", indexed: false },
    { name: "cancelable", type: "bool", indexed: false },
  ]},
  { type: "event", name: "Claimed", inputs: [
    { name: "streamId", type: "uint256", indexed: true },
    { name: "recipient", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
  ]},
  { type: "event", name: "Canceled", inputs: [
    { name: "streamId", type: "uint256", indexed: true },
    { name: "senderAmount", type: "uint256", indexed: false },
    { name: "recipientAmount", type: "uint256", indexed: false },
  ]},
  { type: "event", name: "RecipientChanged", inputs: [
    { name: "streamId", type: "uint256", indexed: true },
    { name: "oldRecipient", type: "address", indexed: true },
    { name: "newRecipient", type: "address", indexed: true },
  ]},
  { type: "function", name: "createStream", stateMutability: "nonpayable", inputs: [
    { name: "recipient", type: "address" },
    { name: "token", type: "address" },
    { name: "deposit", type: "uint256" },
    { name: "startTime", type: "uint256" },
    { name: "cliffDuration", type: "uint256" },
    { name: "totalDuration", type: "uint256" },
    { name: "cancelable", type: "bool" },
  ], outputs: [{ name: "streamId", type: "uint256" }] },
  { type: "function", name: "createBatch", stateMutability: "nonpayable", inputs: [
    { name: "recipients", type: "address[]" },
    { name: "token", type: "address" },
    { name: "deposits", type: "uint256[]" },
    { name: "startTime", type: "uint256" },
    { name: "cliffDuration", type: "uint256" },
    { name: "totalDuration", type: "uint256" },
    { name: "cancelable", type: "bool" },
  ], outputs: [{ name: "streamIds", type: "uint256[]" }] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [
    { name: "streamId", type: "uint256" },
  ], outputs: [{ name: "amount", type: "uint256" }] },
  { type: "function", name: "cancel", stateMutability: "nonpayable", inputs: [
    { name: "streamId", type: "uint256" },
  ], outputs: [] },
  { type: "function", name: "changeRecipient", stateMutability: "nonpayable", inputs: [
    { name: "streamId", type: "uint256" },
    { name: "newRecipient", type: "address" },
  ], outputs: [] },
  { type: "function", name: "getStream", stateMutability: "view", inputs: [
    { name: "streamId", type: "uint256" },
  ], outputs: [{ name: "", type: "tuple", components: [
    { name: "sender", type: "address" },
    { name: "recipient", type: "address" },
    { name: "token", type: "address" },
    { name: "deposit", type: "uint256" },
    { name: "claimed", type: "uint256" },
    { name: "startTime", type: "uint256" },
    { name: "cliffTime", type: "uint256" },
    { name: "endTime", type: "uint256" },
    { name: "cancelable", type: "bool" },
    { name: "canceled", type: "bool" },
  ]}] },
  { type: "function", name: "claimable", stateMutability: "view", inputs: [
    { name: "streamId", type: "uint256" },
  ], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "nextStreamId", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const;

export const ERC20_ABI = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
] as const;
