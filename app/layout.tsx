import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "จตุรมิตรราชบุรี ครั้งที่ 2",
  description: "Jaturamit Ratchaburi Web Platform",
};

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
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="font-black tracking-tight">
                จตุรมิตรราชบุรี
              </Link>

              <nav className="flex items-center gap-4 text-sm text-zinc-300">
  <Link href="/" className="hover:text-white">
    หน้าแรก
  </Link>
  <Link href="/tournaments" className="hover:text-white">
  ทัวร์นาเมนต์
</Link>
  <Link href="/fixtures" className="hover:text-white">
    โปรแกรม
  </Link>
  <Link href="/standings" className="hover:text-white">
    ตารางคะแนน
  </Link>
  <Link href="/teams" className="hover:text-white">
    ทีม
  </Link>
  <Link href="/players" className="hover:text-white">
  นักเตะ
</Link>
  <Link href="/news" className="hover:text-white">
  ข่าว
</Link>
<Link href="/sponsors" className="hover:text-white">
  สปอนเซอร์
</Link>
  <Link href="/scorers" className="hover:text-white">
  ดาวซัลโว
</Link>
<Link href="/discipline" className="hover:text-white">
  ใบเหลือง/แดง
</Link>
<Link href="/player-stats" className="hover:text-white">
  สถิติ
</Link>
  <Link
    href="/admin/login"
    className="rounded-full border border-red-400/40 px-4 py-2 font-bold text-red-200 hover:bg-red-500 hover:text-white"
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