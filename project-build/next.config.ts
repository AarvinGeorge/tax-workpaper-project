import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg uses native-optional requires; keep it out of the server bundle.
  serverExternalPackages: ["pg"],
  // The packet and the AI payload are read from disk at runtime (process.cwd()/data/...); ship both with every server
  // function, or the AI section silently disappears in production.
  outputFileTracingIncludes: { "/**": ["./data/packet.json", "./data/ai-suggestions.json"] },
};

export default nextConfig;
