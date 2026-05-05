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
        <p className="text-zinc-400">กำลังตรวจสอบสิทธิ์...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
            Admin Dashboard
          </p>
          <h1 className="mt-2 text-4xl font-black">หลังบ้านจตุรมิตรราชบุรี</h1>
          <p className="mt-2 text-zinc-400">
            เข้าสู่ระบบในชื่อ {admin?.email} · สิทธิ์ {admin?.role}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10"
        >
          ออกจากระบบ
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
       <Link
  href="/admin/settings"
  className="rounded-3xl border border-white/10 bg-zinc-900 p-6 hover:border-red-400/50"
>
  <h2 className="text-2xl font-black">ตั้งค่าเว็บไซต์</h2>
  <p className="mt-3 text-sm text-zinc-400">
    เลือกซีซั่นหลักที่จะแสดงบนหน้าแรก
  </p>
</Link>
<Link
  href="/admin/preorder"
  className="rounded-3xl border border-white/10 bg-zinc-900 p-6 hover:border-red-400/50"
>
  <h2 className="text-2xl font-black">ตั้งค่าพรีออเดอร์</h2>
  <p className="mt-3 text-sm text-zinc-400">
    เปิด/ปิดช่องชื่อบนเสื้อและเบอร์เสื้อในฟอร์มสั่งซื้อ
  </p>
</Link>
        <Link
  href="/admin/players"
  className="rounded-3xl border border-white/10 bg-zinc-900 p-6 hover:border-red-400/50"
>
  <h2 className="text-2xl font-black">จัดการนักเตะ</h2>
  <p className="mt-3 text-sm text-zinc-400">
    เพิ่มรายชื่อ เบอร์เสื้อ ตำแหน่ง และทีม
  </p>
</Link>
<Link
  href="/admin/teams"
  className="rounded-3xl border border-white/10 bg-zinc-900 p-6 hover:border-red-400/50"
>
  <h2 className="text-2xl font-black">จัดการทีม</h2>
  <p className="mt-3 text-sm text-zinc-400">
    เพิ่มและแก้ไขข้อมูลทีม โลโก้ สี และฉายาทีม
  </p>
</Link>
        <Link
          href="/admin/results"
          className="rounded-3xl border border-white/10 bg-zinc-900 p-6 hover:border-red-400/50"
        >
          <h2 className="text-2xl font-black">ใส่ผลการแข่งขัน</h2>
          <p className="mt-3 text-sm text-zinc-400">
            อัปเดตสกอร์ และคำนวณตารางคะแนน
          </p>
        </Link>

        <Link
          href="/admin/matches"
          className="rounded-3xl border border-white/10 bg-zinc-900 p-6 hover:border-red-400/50"
        >
          <h2 className="text-2xl font-black">จัดการโปรแกรม</h2>
          <p className="mt-3 text-sm text-zinc-400">
            เพิ่ม แก้ไข วันแข่ง เวลา สนาม
          </p>
        </Link>

     
        <Link
  href="/admin/lineups"
  className="rounded-3xl border border-white/10 bg-zinc-900 p-6 hover:border-red-400/50"
>
  <h2 className="text-2xl font-black">จัดตัวจริง / สำรอง</h2>
  <p className="mt-3 text-sm text-zinc-400">
    บันทึกตัวจริง ตัวสำรอง นาทีลงเล่น และการเปลี่ยนตัว
  </p>
</Link>

        <Link
          href="/admin/news"
          className="rounded-3xl border border-white/10 bg-zinc-900 p-6 hover:border-red-400/50"
        >
          <h2 className="text-2xl font-black">ข่าว / ประกาศ</h2>
          <p className="mt-3 text-sm text-zinc-400">
            ลงข่าวประชาสัมพันธ์รายการ
          </p>
        </Link>

        <Link
          href="/admin/sponsors"
          className="rounded-3xl border border-white/10 bg-zinc-900 p-6 hover:border-red-400/50"
        >
          <h2 className="text-2xl font-black">สปอนเซอร์</h2>
          <p className="mt-3 text-sm text-zinc-400">
            จัดการโลโก้และระดับผู้สนับสนุน
          </p>
        </Link>
        
        <Link
  href="/admin/seasons"
  className="rounded-3xl border border-white/10 bg-zinc-900 p-6 hover:border-red-400/50"
>
  <h2 className="text-2xl font-black">ภาพปกซีซั่น</h2>
  <p className="mt-3 text-sm text-zinc-400">
    ตั้งค่าภาพปกสำหรับกล่องใหญ่หน้าแรก
  </p>
</Link>

        <Link
  href="/admin/tournaments"
  className="rounded-3xl border border-white/10 bg-zinc-900 p-6 hover:border-red-400/50"
>
  <h2 className="text-2xl font-black">ทัวร์นาเมนต์ / ซีซั่น</h2>
  <p className="mt-3 text-sm text-zinc-400">
    เปิดรายการใหม่ ซีซั่นใหม่ และเลือกทีมเข้าร่วม
  </p>
</Link>
      </div>
    </main>
  );
}
