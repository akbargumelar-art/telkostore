/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude better-sqlite3 from client-side bundling
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
