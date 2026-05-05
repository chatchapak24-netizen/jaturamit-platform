import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "จตุรมิตรราชบุรี ครั้งที่ 2",
  description: "Jaturamit Ratchaburi Web Platform",
};

const navItems = [
  { href: "/", label: "หน้าแรก" },
  { href: "/tournaments", label: "ทัวร์นาเมนต์" },
  { href: "/fixtures", label: "โปรแกรม" },
  { href: "/standings", label: "ตารางคะแนน" },
  { href: "/teams", label: "ทีม" },
  { href: "/players", label: "นักเตะ" },
  { href: "/news", label: "ข่าว" },
  { href: "/preorder", label: "พรีออเดอร์", highlight: true },
  { href: "/check-order", label: "เช็กออเดอร์", highlight: true },
  { href: "/sponsors", label: "สปอนเซอร์" },
  { href: "/scorers", label: "ดาวซัลโว" },
  { href: "/discipline", label: "ใบเหลือง/แดง" },
  { href: "/player-stats", label: "สถิติ" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <div className="min-h-screen bg-zinc-950 text-white">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
              <Link
                href="/"
                className="shrink-0 text-base font-black tracking-tight sm:text-lg"
              >
                จตุรมิตรราชบุรี
              </Link>

              <nav
                aria-label="เมนูหลัก"
                className="flex w-full items-center gap-3 overflow-x-auto whitespace-nowrap pb-1 text-sm text-zinc-300 md:w-auto md:overflow-visible md:pb-0"
              >
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 hover:text-white ${
                      item.highlight ? "font-bold text-red-200" : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}

                <Link
                  href="/admin/login"
                  className="shrink-0 rounded-full border border-red-400/40 px-4 py-2 font-bold text-red-200 hover:bg-red-500 hover:text-white"
                >
                  หลังบ้าน
                </Link>
              </nav>
            </div>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
