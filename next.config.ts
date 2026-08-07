import type { NextConfig } from "next";

// نجيب الـ hostname من NEXT_PUBLIC_SUPABASE_URL تلقائيًا عشان miss لو الـ project ref اتغير
// (fallback على الـ hostname الحالي لو الـ env متاح وقت الـ build)
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
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: getSupabaseHostname(),
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default nextConfig;