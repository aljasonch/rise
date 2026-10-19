import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kamera dan pemantauan tidak boleh diinisialisasi dua kali saat dev.
  reactStrictMode: false,
};

export default nextConfig;
