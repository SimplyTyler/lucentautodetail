import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { AuthPanel } from "../../components/auth-panel";
import { Logo } from "../../components/logo";
import { getSession } from "../../lib/auth";
import { hasDatabase } from "../../lib/db";

export const metadata = { title: "Account" };

export default async function AccountPage({ searchParams }) {
  const session = await getSession();
  if (session) redirect("/portal");

  const params = await searchParams;
  const nextPath = typeof params?.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/portal";

  return (
    <main className="accountPage">
      <section className="accountVisual">
        <Image src="/lucent-hero-v2.jpg" alt="Freshly detailed graphite sports coupe" fill priority sizes="(max-width: 900px) 100vw, 54vw" />
        <div className="accountVisualOverlay" />
        <Logo />
        <div className="accountVisualCopy">
          <span className="kicker kickerIce">Lucent membership</span>
          <h2>Keep the finish. Lose the logistics.</h2>
          <ul><li><Check size={16} /> Every vehicle in one garage</li><li><Check size={16} /> Service requests and status</li><li><Check size={16} /> Secure subscription management</li></ul>
        </div>
      </section>
      <section className="accountFormSide">
        <Link className="backLink" href="/"><ArrowLeft size={16} /> Back home</Link>
        <AuthPanel initialMode={params?.mode} nextPath={nextPath} preview={!hasDatabase()} />
      </section>
    </main>
  );
}
