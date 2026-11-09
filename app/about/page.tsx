import type { Metadata } from "next";
import SiteWorkspace from "../../components/site-workspace";

export const metadata: Metadata = { title: "About — Brie’s Lab" };

export default function AboutPage() {
  return <SiteWorkspace screen="about" />;
}
