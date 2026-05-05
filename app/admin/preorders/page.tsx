"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type PreorderStatus =
  | "pending"
  | "paid"
  | "confirmed"
  | "production"
  | "ready"
  | "shipped"
  | "cancelled";

type PreorderOrder = {
  order_code: string | null;
  created_at: string | null;
  updated_at: string | null;
  full_name: string | null;
  phone: string | null;
  team: string | null;
  size: string | null;
  shirt_name: string | null;
  shirt_number: string | null;
  quantity: number | null;
  delivery_method: string | null;
  address: string | null;
  note: string | null;
  payment_note: string | null;
  total_amount: number | null;
  status: PreorderStatus | string | null;
};

type FilterValue = "all" | string;

const STATUS_OPTIONS: PreorderStatus[] = [
  "pending",
  "paid",
  "confirmed",
  "production",
  "ready",
  "shipped",
  "cancelled",
];

const TEAM_OPTIONS = [
  { value: "photha", label: "โพธา" },
  { value: "benjamarachutit", label: "เบญจมราชูทิศ" },
  { value: "daruna", label: "ดรุณาราชบุรี" },
  { value: "sarasit", label: "สารสิทธิ์พิทยาลัย" },
];

const SIZE_OPTIONS = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

const DELIVERY_OPTIONS = [
  { value: "pickup", label: "รับเอง" },
  { value: "shipping", label: "จัดส่ง" },
];

const statusLabels: Record<PreorderStatus, string> = {
  pending: "รอตรวจสอบ",
  paid: "ชำระแล้ว",
  confirmed: "ยืนยันแล้ว",
  production: "กำลังผลิต",
  ready: "พร้อมรับ/ส่ง",
  shipped: "จัดส่งแล้ว",
  cancelled: "ยกเลิก",
};

function teamLabel(team: string | null) {
  return TEAM_OPTIONS.find((item) => item.value === team)?.label || team || "-";
}

function deliveryLabel(method: string | null) {
  return (
    DELIVERY_OPTIONS.find((item) => item.value === method)?.label ||
    method ||
    "-"
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value: number | null) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function csvCell(value: number | string | null) {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

function buildPreorderCsv(orders: PreorderOrder[]) {
  const columns = [
    "order_code",
    "team",
    "size",
    "shirt_name",
    "shirt_number",
    "quantity",
    "full_name",
    "phone",
    "delivery_method",
    "address",
    "status",
    "note",
    "payment_note",
    "created_at",
  ];
  const rows = orders.map((order) => [
    order.order_code,
    teamLabel(order.team),
    order.size,
    order.shirt_name,
    order.shirt_number,
    order.quantity || 0,
    order.full_name,
    order.phone,
    deliveryLabel(order.delivery_method),
    order.address,
    order.status || "pending",
    order.note,
    order.payment_note,
    order.created_at,
  ]);

  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
}

function statusClass(status: string | null) {
  switch (status) {
    case "paid":
    case "confirmed":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
    case "production":
    case "ready":
      return "border-amber-400/40 bg-amber-500/10 text-amber-200";
    case "shipped":
      return "border-blue-400/40 bg-blue-500/10 text-blue-200";
    case "cancelled":
      return "border-zinc-500/40 bg-zinc-700/30 text-zinc-300";
    default:
      return "border-red-400/40 bg-red-500/10 text-red-200";
  }
}

export default function AdminPreordersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<PreorderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderCode, setUpdatingOrderCode] = useState("");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<PreorderOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterValue>("all");
  const [teamFilter, setTeamFilter] = useState<FilterValue>("all");
  const [sizeFilter, setSizeFilter] = useState<FilterValue>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<FilterValue>("all");
  const [searchText, setSearchText] = useState("");

  const checkAdmin = useCallback(async () => {
    const { data: userData } = await supabaseBrowser.auth.getUser();

    if (!userData.user) {
      router.push("/admin/login");
      return false;
    }

    const { data: adminProfile } = await supabaseBrowser
      .from("admin_users")
      .select("id")
      .eq("auth_user_id", userData.user.id)
      .eq("status", "active")
      .single();

    if (!adminProfile) {
      await supabaseBrowser.auth.signOut();
      router.push("/admin/login");
      return false;
    }

    return true;
  }, [router]);

  const loadOrders = useCallback(async () => {
    setErrorText("");
    setRefreshing(true);

    const { data, error } = await supabaseBrowser
      .from("preorders")
      .select(
        "order_code, created_at, updated_at, full_name, phone, team, size, shirt_name, shirt_number, quantity, delivery_method, address, note, payment_note, total_amount, status",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      setErrorText(error.message);
      setRefreshing(false);
      return;
    }

    setOrders((data || []) as PreorderOrder[]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      await loadOrders();
      setLoading(false);
    }

    init();
  }, [checkAdmin, loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      const matchesTeam = teamFilter === "all" || order.team === teamFilter;
      const matchesSize = sizeFilter === "all" || order.size === sizeFilter;
      const matchesDelivery =
        deliveryFilter === "all" || order.delivery_method === deliveryFilter;
      const matchesSearch =
        !query ||
        [order.full_name, order.phone, order.order_code].some((value) =>
          (value || "").toLowerCase().includes(query),
        );

      return (
        matchesStatus &&
        matchesTeam &&
        matchesSize &&
        matchesDelivery &&
        matchesSearch
      );
    });
  }, [
    deliveryFilter,
    orders,
    searchText,
    sizeFilter,
    statusFilter,
    teamFilter,
  ]);

  const summary = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalQuantity = filteredOrders.reduce(
      (sum, order) => sum + (order.quantity || 0),
      0,
    );
    const totalAmount = filteredOrders.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0,
    );
    const teamCounts = TEAM_OPTIONS.map((team) => ({
      ...team,
      count: filteredOrders
        .filter((order) => order.team === team.value)
        .reduce((sum, order) => sum + (order.quantity || 0), 0),
    }));

    return { teamCounts, totalAmount, totalOrders, totalQuantity };
  }, [filteredOrders]);

  const productionSummary = useMemo(() => {
    const rows = TEAM_OPTIONS.map((team) => {
      const sizeCounts = SIZE_OPTIONS.map((size) => ({
        size,
        count: filteredOrders
          .filter((order) => order.team === team.value && order.size === size)
          .reduce((sum, order) => sum + (order.quantity || 0), 0),
      }));
      const total = sizeCounts.reduce((sum, item) => sum + item.count, 0);

      return { ...team, sizeCounts, total };
    });
    const total = rows.reduce((sum, row) => sum + row.total, 0);

    return { rows, total };
  }, [filteredOrders]);

  function exportCsv() {
    setMessage("");
    setErrorText("");

    if (filteredOrders.length === 0) {
      setErrorText("ไม่มีออเดอร์สำหรับ export จากตัวกรองปัจจุบัน");
      return;
    }

    const csv = `\uFEFF${buildPreorderCsv(filteredOrders)}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    link.href = url;
    link.download = `preorders-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage(`Export CSV ${filteredOrders.length} ออเดอร์เรียบร้อยแล้ว`);
  }

  async function updateStatus(order: PreorderOrder, nextStatus: PreorderStatus) {
    if (!order.order_code) {
      setErrorText("ไม่พบ order_code สำหรับอัปเดตสถานะออเดอร์นี้");
      return;
    }

    setMessage("");
    setErrorText("");
    setUpdatingOrderCode(order.order_code);

    const { error } = await supabaseBrowser
      .from("preorders")
      .update({ status: nextStatus })
      .eq("order_code", order.order_code);

    if (error) {
      setErrorText(error.message);
      setUpdatingOrderCode("");
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((item) =>
        item.order_code === order.order_code
          ? { ...item, status: nextStatus, updated_at: new Date().toISOString() }
          : item,
      ),
    );
    setSelectedOrder((currentOrder) =>
      currentOrder?.order_code === order.order_code
        ? { ...currentOrder, status: nextStatus, updated_at: new Date().toISOString() }
        : currentOrder,
    );
    setMessage(`อัปเดตสถานะ ${order.order_code} เรียบร้อยแล้ว`);
    setUpdatingOrderCode("");
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="text-zinc-400">กำลังโหลดข้อมูลพรีออเดอร์...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
            Admin / Preorders
          </p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            พรีออเดอร์เสื้อ
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            ดูรายการสั่งซื้อ ตรวจข้อมูลลูกค้า และจัดการสถานะงานผลิตเสื้อจตุรมิตรราชบุรี ครั้งที่ 2
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-white/10"
          >
            กลับหลังบ้าน
          </Link>
          <button
            onClick={exportCsv}
            disabled={filteredOrders.length === 0}
            className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
          >
            Export CSV
          </button>
          <button
            onClick={loadOrders}
            disabled={refreshing}
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-500 disabled:opacity-60"
          >
            {refreshing ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm text-emerald-100">
          {message}
        </div>
      )}

      {errorText && (
        <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
          {errorText}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Orders
          </p>
          <p className="mt-2 text-3xl font-black">{summary.totalOrders}</p>
          <p className="mt-1 text-sm text-zinc-400">ออเดอร์ตามตัวกรอง</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Shirts
          </p>
          <p className="mt-2 text-3xl font-black">{summary.totalQuantity}</p>
          <p className="mt-1 text-sm text-zinc-400">จำนวนเสื้อทั้งหมด</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Revenue
          </p>
          <p className="mt-2 text-3xl font-black">
            {formatMoney(summary.totalAmount)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">ยอดเงินรวม</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Teams
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {summary.teamCounts.map((team) => (
              <div
                key={team.value}
                className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2"
              >
                <p className="truncate text-zinc-400">{team.label}</p>
                <p className="font-black text-white">{team.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
              Production Summary
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              สรุปจำนวนผลิตตามทีมและไซส์
            </h2>
          </div>
          <p className="text-sm font-bold text-zinc-300">
            รวมทั้งหมด {productionSummary.total} ตัว
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.15em] text-zinc-500">
              <tr>
                <th className="px-3 py-3">Team</th>
                {SIZE_OPTIONS.map((size) => (
                  <th key={size} className="px-3 py-3 text-center">
                    {size}
                  </th>
                ))}
                <th className="px-3 py-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {productionSummary.rows.map((row) => (
                <tr key={row.value}>
                  <td className="px-3 py-3 font-bold text-white">{row.label}</td>
                  {row.sizeCounts.map((item) => (
                    <td
                      key={`${row.value}-${item.size}`}
                      className="px-3 py-3 text-center text-zinc-300"
                    >
                      {item.count}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center font-black text-white">
                    {row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
              Search
            </span>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="ชื่อ / เบอร์ / order_code"
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-red-400"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-red-400"
            >
              <option value="all">ทั้งหมด</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
              Team
            </span>
            <select
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-red-400"
            >
              <option value="all">ทั้งหมด</option>
              {TEAM_OPTIONS.map((team) => (
                <option key={team.value} value={team.value}>
                  {team.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
              Size
            </span>
            <select
              value={sizeFilter}
              onChange={(event) => setSizeFilter(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-red-400"
            >
              <option value="all">ทั้งหมด</option>
              {SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
              Delivery
            </span>
            <select
              value={deliveryFilter}
              onChange={(event) => setDeliveryFilter(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-red-400"
            >
              <option value="all">ทั้งหมด</option>
              {DELIVERY_OPTIONS.map((delivery) => (
                <option key={delivery.value} value={delivery.value}>
                  {delivery.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-zinc-950 text-xs uppercase tracking-[0.15em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredOrders.map((order, index) => (
                <tr
                  key={order.order_code || `${order.phone}-${index}`}
                  className="hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-4 font-bold text-white">
                    {order.order_code || "-"}
                  </td>
                  <td className="px-4 py-4 text-zinc-300">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-4 text-white">{order.full_name || "-"}</td>
                  <td className="px-4 py-4 text-zinc-300">{order.phone || "-"}</td>
                  <td className="px-4 py-4 text-zinc-300">
                    {teamLabel(order.team)}
                  </td>
                  <td className="px-4 py-4 font-bold text-white">
                    {order.size || "-"}
                  </td>
                  <td className="px-4 py-4 text-zinc-300">
                    {order.shirt_name || "-"}
                  </td>
                  <td className="px-4 py-4 text-zinc-300">
                    {order.shirt_number || "-"}
                  </td>
                  <td className="px-4 py-4 font-bold text-white">
                    {order.quantity || 0}
                  </td>
                  <td className="px-4 py-4 text-zinc-300">
                    {deliveryLabel(order.delivery_method)}
                  </td>
                  <td className="px-4 py-4 font-bold text-white">
                    {formatMoney(order.total_amount)}
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={(order.status || "pending") as PreorderStatus}
                      onChange={(event) =>
                        updateStatus(order, event.target.value as PreorderStatus)
                      }
                      disabled={
                        !order.order_code ||
                        updatingOrderCode === order.order_code
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none disabled:opacity-60 ${statusClass(
                        order.status,
                      )}`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10"
                    >
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-zinc-400">
                    ไม่พบออเดอร์จากตัวกรองนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                  Order Detail
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {selectedOrder.order_code || "ไม่มี order_code"}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
              >
                ปิด
              </button>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Address
                </dt>
                <dd className="mt-2 whitespace-pre-wrap text-zinc-100">
                  {selectedOrder.address || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Payment Note
                </dt>
                <dd className="mt-2 whitespace-pre-wrap text-zinc-100">
                  {selectedOrder.payment_note || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Note
                </dt>
                <dd className="mt-2 whitespace-pre-wrap text-zinc-100">
                  {selectedOrder.note || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Updated
                </dt>
                <dd className="mt-2 text-zinc-100">
                  {formatDate(selectedOrder.updated_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Created
                </dt>
                <dd className="mt-2 text-zinc-100">
                  {formatDate(selectedOrder.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Status
                </dt>
                <dd className="mt-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                      selectedOrder.status,
                    )}`}
                  >
                    {statusLabels[
                      (selectedOrder.status || "pending") as PreorderStatus
                    ] || selectedOrder.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </main>
  );
}
