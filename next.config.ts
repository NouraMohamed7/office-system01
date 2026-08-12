import type { NextConfig } from "next";

function getSupabaseHostname(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      return new URL(url).hostname;
    } catch {
      // تجاهل لو الـ env value مش URL صحيح، هنستخدم الـ fallback تحت
    }
  }
  return "vzrvljthnmzcjcodjbfz.supabase.co";
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: getSupabaseHostname(),
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: getSupabaseHostname(),
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default nextConfig;