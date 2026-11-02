import type { Metadata } from "next";
import { env } from "@/lib/env";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invites · Otakuva admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <Dashboard defaultTestLink={env().DEFAULT_TEST_LINK} />;
}
