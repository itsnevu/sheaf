import webpack from "next/dist/compiled/webpack/webpack-lib.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // wagmi's connectors pull in Coinbase's SDK whose x402 helpers import optional packages
    // that are not installed. We never use that path; ignore it instead of shipping it.
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }));
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@react-native-async-storage\/async-storage$/ }));
    return config;
  },
};
export default nextConfig;
