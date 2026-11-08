const fs = require('node:fs');

fs.mkdirSync('public/contracts', { recursive: true });
fs.copyFileSync('contracts/deployments/elysium-mainnet-99901.json', 'public/contracts/elysium-mainnet-99901.json');
const whitepaper = fs.readFileSync('docs/whitepaper.md', 'utf8')
  .replaceAll('(../contracts/deployments/elysium-mainnet-99901.json)', '(/contracts/elysium-mainnet-99901.json)')
  .replaceAll('(../contracts/README.md)', '(/docs#contract-ref)')
  .replaceAll('(tokenomics.md)', '(/#tokenomics)')
  .replaceAll('(platform-implementation-status.md)', '(/docs/vault)')
  .replaceAll('(launch-checklist.md)', '(/docs#security)');
fs.writeFileSync('public/whitepaper.md', whitepaper);
console.log('Synced public mainnet deployment record and whitepaper.');
