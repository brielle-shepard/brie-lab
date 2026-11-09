import type { Metadata } from "next";
import SiteWorkspace from "../../components/site-workspace";

export const metadata: Metadata = { title: "Projects — Brie’s Lab" };

export default function ProjectsPage() {
  return <SiteWorkspace screen="projects" />;
}
