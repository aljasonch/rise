import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kamera dan proctor-sdk tidak boleh diinisialisasi dua kali saat dev.
  reactStrictMode: false,
};

export default nextConfig;
