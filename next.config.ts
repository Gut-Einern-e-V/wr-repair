import type { NextConfig } from "next";

/* Die Partnerlogos kommen aus dem oeffentlichen Bucket `partner-logos` und
   laufen durch den Bildoptimierer (components/partner-strip.tsx). Freigegeben
   ist nur dieser Bucket des eigenen Projekts, keine anderen Hosts. */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [new URL("/storage/v1/object/public/partner-logos/**", supabaseUrl)]
      : [],
  },
};

export default nextConfig;
