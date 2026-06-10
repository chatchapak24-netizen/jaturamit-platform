"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AdminProfile = {
  name: string | null;
  email: string;
  role: string;
};

type AdminMenuItem = {
  title: string;
  description: string;
  href?: string;
  secondaryHref?: {
    href: string;
    label: string;
  };
  status?: "live" | "coming-soon";
  recommended?: boolean;
};

type AdminMenuSection = {
  title: string;
  description: string;
  items: AdminMenuItem[];
};

const priorityOperations: AdminMenuItem[] = [
  {
    title: "Match Center (ศูนย์จัดการแมตช์)",
    description:
      "Central hub for lineups, events, results, reports, and statistics.",
    status: "coming-soon",
    recommended: true,
  },
  {
    title: "Fixtures (โปรแกรมการแข่งขัน)",
    description: "Create and manage match schedule, kickoff, venue, and status.",
    href: "/admin/matches",
    recommended: true,
  },
  {
    title: "Teams & Squads (ทีมและรายชื่อนักกีฬา)",
    description: "Manage team database and active season player lists.",
    href: "/admin/teams",
    secondaryHref: {
      href: "/admin/players",
      label: "Players (นักกีฬา)",
    },
    recommended: true,
  },
  {
    title: "Seasons & Regulations (ซีซั่นและระเบียบการแข่งขัน)",
    description: "Manage competitions, seasons, and participating teams.",
    href: "/admin/tournaments",
  },
];

const menuSections: AdminMenuSection[] = [
  {
    title: "Competition Setup (ตั้งค่าการแข่งขัน)",
    description: "Core competition data before matchday operations.",
    items: [
      {
        title: "Seasons & Regulations (ซีซั่นและระเบียบการแข่งขัน)",
        description: "Tournaments, seasons, and participating teams.",
        href: "/admin/tournaments",
      },
      {
        title: "Teams (ทีม)",
        description: "Team records, schools, colors, logos, and labels.",
        href: "/admin/teams",
      },
      {
        title: "Players (นักกีฬา)",
        description: "Season squads, shirt numbers, positions, and player data.",
        href: "/admin/players",
      },
      {
        title: "Fixtures (โปรแกรมการแข่งขัน)",
        description: "Match schedule, kickoff times, venues, and rounds.",
        href: "/admin/matches",
      },
    ],
  },
  {
    title: "Match Operations (ปฏิบัติการวันแข่งขัน)",
    description: "Matchday workflow from team sheets to final reports.",
    items: [
      {
        title: "Match Center (ศูนย์จัดการแมตช์)",
        description: "Lineups, events, results, reports, and statistics.",
        status: "coming-soon",
        recommended: true,
      },
      {
        title: "Team Sheets (ใบรายชื่อ)",
        description: "Starting players, bench, minutes, and substitutions.",
        href: "/admin/lineups",
      },
      {
        title: "Result Entry (ใส่ผลการแข่งขัน)",
        description: "Scores, match status, events, and standings update.",
        href: "/admin/results",
      },
      {
        title: "Match Reports (รายงานการแข่งขัน)",
        description: "Post-match summaries and published match reports.",
        status: "coming-soon",
      },
    ],
  },
  {
    title: "Reports & Database (รายงานและฐานข้อมูล)",
    description: "Structured reference data and analysis surfaces.",
    items: [
      {
        title: "Player Database (ฐานข้อมูลนักกีฬา)",
        description: "Player records, squad membership, and fantasy settings.",
        href: "/admin/players",
      },
      {
        title: "Team Database (ฐานข้อมูลทีม)",
        description: "Team records, branding, school data, and short names.",
        href: "/admin/teams",
      },
      {
        title: "Statistics (สถิติ)",
        description: "Competition, team, match, and player statistics.",
        status: "coming-soon",
      },
      {
        title: "Search Database (ค้นหาฐานข้อมูล)",
        description: "Search players, teams, matches, orders, and reports.",
        status: "coming-soon",
      },
    ],
  },
  {
    title: "Jaturamit Arena (จตุรมิตร อารีนา)",
    description: "Fantasy operations and Arena game administration.",
    items: [
      {
        title: "Fantasy Dashboard",
        description: "Weeks, lineup status, scores, and leaderboard overview.",
        href: "/admin/fantasy",
      },
      {
        title: "Fantasy Weeks",
        description: "Open, lock, score, and finalize fantasy matchweeks.",
        status: "coming-soon",
      },
      {
        title: "Fantasy Players",
        description: "Star ratings, fantasy status, and position overrides.",
        href: "/admin/players",
      },
      {
        title: "Fantasy Scoring",
        description: "Scoring status and leaderboard operations.",
        href: "/admin/fantasy",
      },
    ],
  },
  {
    title: "Preorder System (ระบบพรีออเดอร์)",
    description: "Commerce workflows are grouped after competition operations.",
    items: [
      {
        title: "Orders (ออเดอร์)",
        description: "Order list, filters, payment status, and fulfillment.",
        href: "/admin/preorders",
      },
      {
        title: "Preorder Settings (ตั้งค่าพรีออเดอร์)",
        description: "Form fields, payment options, and preorder config.",
        href: "/admin/preorder",
      },
      {
        title: "Campaigns (แคมเปญ)",
        description: "Campaign rounds, conditions, and payment information.",
        href: "/admin/preorder-campaigns",
      },
      {
        title: "Products (สินค้า)",
        description: "Products, prices, images, and customization rules.",
        href: "/admin/preorder-products",
      },
      {
        title: "Preorder Teams (ทีมพรีออเดอร์)",
        description: "Teams, colors, logos, and preorder team status.",
        href: "/admin/preorder-teams",
      },
    ],
  },
  {
    title: "Content Management (จัดการคอนเทนต์)",
    description: "Public website content and presentation assets.",
    items: [
      {
        title: "News / Announcements (ข่าว / ประกาศ)",
        description: "Publish news, announcements, and public updates.",
        href: "/admin/news",
      },
      {
        title: "Sponsors (สปอนเซอร์)",
        description: "Sponsor logos, tiers, and public sponsor display.",
        href: "/admin/sponsors",
      },
      {
        title: "Season Covers (ภาพปกซีซั่น)",
        description: "Homepage season cover imagery.",
        href: "/admin/seasons",
      },
    ],
  },
  {
    title: "System Settings (ตั้งค่าระบบ)",
    description: "Lower-frequency configuration and administration.",
    items: [
      {
        title: "Website Settings (ตั้งค่าเว็บไซต์)",
        description: "Homepage season and public site defaults.",
        href: "/admin/settings",
      },
      {
        title: "Admin Users & Roles (ผู้ใช้หลังบ้านและสิทธิ์)",
        description: "Admin accounts, roles, and access status.",
        status: "coming-soon",
      },
      {
        title: "Audit Logs (บันทึกการใช้งาน)",
        description: "Operational history and change tracking.",
        status: "coming-soon",
      },
    ],
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function statusBadge(item: AdminMenuItem) {
  if (item.status === "coming-soon") return "Coming Soon";
  if (item.recommended) return "Recommended";
  return "Live";
}

function badgeClass(item: AdminMenuItem) {
  if (item.status === "coming-soon") {
    return "border-zinc-600 bg-zinc-800 text-zinc-400";
  }

  if (item.recommended) {
    return "border-yellow-200/60 bg-yellow-300/15 text-yellow-100";
  }

  return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
}

function AdminBadge({ item }: { item: AdminMenuItem }) {
  return (
    <span
      className={cx(
        "shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
        badgeClass(item),
      )}
    >
      {statusBadge(item)}
    </span>
  );
}

function AdminMenuCard({
  item,
  priority = false,
  feature = false,
}: {
  item: AdminMenuItem;
  priority?: boolean;
  feature?: boolean;
}) {
  const disabled = !item.href || item.status === "coming-soon";
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3
          className={cx(
            "font-black text-white",
            feature ? "text-3xl leading-tight" : "text-xl",
          )}
        >
          {item.title}
        </h3>
        <AdminBadge item={item} />
      </div>
      <p
        className={cx(
          "mt-3 leading-6 text-zinc-400",
          feature ? "max-w-2xl text-base" : "text-sm",
        )}
      >
        {item.description}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {disabled ? (
          <span className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
            Disabled
          </span>
        ) : (
          <span className="rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-100">
            Open
          </span>
        )}
        {item.secondaryHref ? (
          <Link
            href={item.secondaryHref.href}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-200 hover:border-white/30 hover:bg-white/10"
          >
            {item.secondaryHref.label}
          </Link>
        ) : null}
      </div>
    </>
  );

  if (disabled || !item.href) {
    return (
      <article
        className={cx(
          "border border-white/10 bg-zinc-950/70 p-5 opacity-80",
          feature
            ? "min-h-[260px] rounded-3xl border-red-300/25 bg-[linear-gradient(135deg,rgba(127,29,29,0.28),rgba(9,9,11,0.86))] p-7"
            : "min-h-40 rounded-2xl",
        )}
      >
        {content}
      </article>
    );
  }

  const href = item.href;

  return (
    <Link
      href={href}
      className={cx(
        "block border border-white/10 bg-zinc-900 transition hover:-translate-y-0.5 hover:border-red-300/50",
        priority
          ? "min-h-[220px] rounded-3xl p-6 shadow-[0_26px_80px_rgba(0,0,0,0.32)]"
          : "min-h-40 rounded-2xl p-5",
        feature
          ? "min-h-[260px] border-red-300/45 bg-[linear-gradient(135deg,rgba(127,29,29,0.44),rgba(9,9,11,0.9))] p-7 shadow-[0_0_55px_rgba(248,113,113,0.18)]"
          : "",
      )}
    >
      {content}
    </Link>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  useEffect(() => {
    async function loadAdmin() {
      const { data: userData } = await supabaseBrowser.auth.getUser();

      if (!userData.user) {
        router.push("/admin/login");
        return;
      }

      const { data: adminProfile, error } = await supabaseBrowser
        .from("admin_users")
        .select("name, email, role")
        .eq("auth_user_id", userData.user.id)
        .eq("status", "active")
        .single();

      if (error || !adminProfile) {
        await supabaseBrowser.auth.signOut();
        router.push("/admin/login");
        return;
      }

      setAdmin(adminProfile as AdminProfile);
      setLoading(false);
    }

    loadAdmin();
  }, [router]);

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-zinc-400">Checking admin access...</p>
      </main>
    );
  }

  const [matchCenter, ...priorityCards] = priorityOperations;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 md:px-6 md:py-10">
      <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
            Competition Operations
          </p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">
            Admin Dashboard (หลังบ้าน)
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Football operations command center for competition setup,
            matchday workflows, Arena fantasy, preorder, content, and system
            controls.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Signed in as {admin?.email} / Role {admin?.role}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10"
        >
          Logout (ออกจากระบบ)
        </button>
      </div>

      <section className="mb-10">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
              Priority Operations
            </p>
            <h2 className="mt-1 text-3xl font-black text-white">
              Run the Competition (ควบคุมการแข่งขัน)
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-zinc-400">
            Start here on matchday. Match Center is the intended hub, while
            fixtures, squads, and seasons remain available through existing
            routes.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <AdminMenuCard item={matchCenter} priority feature />
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            {priorityCards.map((item) => (
              <AdminMenuCard key={item.title} item={item} priority />
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-9">
        {menuSections.map((section) => (
          <section key={section.title}>
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">
                {section.title}
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">
                {section.description}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {section.items.map((item) => (
                <AdminMenuCard key={`${section.title}-${item.title}`} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
