"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  FormMessage,
  PageHeader,
  useRequireActiveAdmin,
} from "@/components/admin/preorder/shared";

type PreorderStatus =
  | "pending"
  | "paid"
  | "confirmed"
  | "production"
  | "ready"
  | "shipped"
  | "cancelled";

type FilterValue = "all" | string;

type PreorderOrder = {
  id: string;
  order_code: string | null;
  full_name: string | null;
  phone: string | null;
  team: string | null;
  size: string | null;
  shirt_name: string | null;
  shirt_number: string | null;
  quantity: number | null;
  unit_price: number | null;
  delivery_method: string | null;
  address: string | null;
  note: string | null;
  payment_note: string | null;
  total_amount: number | null;
  status: PreorderStatus | string | null;
  created_at: string | null;
  updated_at: string | null;
  campaign_id: string | null;
};

type PreorderItem = {
  id: string;
  preorder_id: string;
  product_id: string | null;
  team_slug_snapshot: string | null;
  team_name_snapshot: string | null;
  product_name_snapshot: string | null;
  product_type_snapshot: string | null;
  unit_price_snapshot: number | null;
  quantity: number | null;
  size: string | null;
  custom_name: string | null;
  custom_number: string | null;
  line_total: number | null;
  created_at: string | null;
};

type Campaign = {
  id: string;
  name: string;
  slug: string;
};

type DisplayItem = {
  id: string;
  productName: string;
  productType: string;
  team: string;
  teamSlug: string;
  size: string;
  customName: string;
  customNumber: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isLegacy: boolean;
};

type DisplayOrder = PreorderOrder & {
  items: DisplayItem[];
  totalQuantity: number;
  isLegacy: boolean;
};

const STATUS_OPTIONS: Array<{ value: PreorderStatus; label: string }> = [
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "paid", label: "ชำระเงินแล้ว" },
  { value: "confirmed", label: "ยืนยันออเดอร์แล้ว" },
  { value: "production", label: "ส่งผลิตแล้ว" },
  { value: "ready", label: "พร้อมรับ" },
  { value: "shipped", label: "จัดส่งแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];

const DELIVERY_OPTIONS = [
  { value: "pickup", label: "รับที่หน้างาน" },
  { value: "shipping", label: "จัดส่ง" },
];

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  jersey: "เสื้อแข่ง",
  shorts: "กางเกง",
  socks: "ถุงเท้า",
  training_shirt: "เสื้อซ้อม",
  scarf: "ผ้าพันคอ",
  souvenir: "ของที่ระลึก",
  other: "อื่น ๆ",
};

const PREORDER_ITEM_BATCH_SIZE = 50;
const PREORDER_ITEM_SELECT =
  "id, preorder_id, product_id, team_slug_snapshot, team_name_snapshot, product_name_snapshot, product_type_snapshot, unit_price_snapshot, quantity, size, custom_name, custom_number, line_total, created_at";

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function statusLabel(status: string | null) {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.label ||
    status ||
    "รอตรวจสอบ"
  );
}

function deliveryLabel(method: string | null) {
  return (
    DELIVERY_OPTIONS.find((option) => option.value === method)?.label ||
    method ||
    "-"
  );
}

function productTypeLabel(type: string) {
  return PRODUCT_TYPE_LABELS[type] || type || "-";
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

function csvCell(value: number | string | null) {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<number | string | null>>) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toDisplayItems(order: PreorderOrder, items: PreorderItem[]) {
  if (items.length > 0) {
    return items.map((item) => ({
      id: item.id,
      productName: item.product_name_snapshot || "Preorder item",
      productType: item.product_type_snapshot || "other",
      team: item.team_name_snapshot || item.team_slug_snapshot || "-",
      teamSlug: item.team_slug_snapshot || "other",
      size: item.size || "-",
      customName: item.custom_name || "-",
      customNumber: item.custom_number || "-",
      quantity: item.quantity || 0,
      unitPrice: item.unit_price_snapshot || 0,
      lineTotal: item.line_total || 0,
      isLegacy: false,
    }));
  }

  const quantity = order.quantity || 0;
  const unitPrice = order.unit_price || 0;

  return [
    {
      id: `${order.id}-legacy`,
      productName: "Legacy preorder item",
      productType: "jersey",
      team: order.team || "-",
      teamSlug: order.team || "other",
      size: order.size || "-",
      customName: order.shirt_name || "-",
      customNumber: order.shirt_number || "-",
      quantity,
      unitPrice,
      lineTotal: order.total_amount || unitPrice * quantity,
      isLegacy: true,
    },
  ];
}

function itemSummary(order: DisplayOrder) {
  return order.items
    .slice(0, 2)
    .map((item) => `${item.productName} x${item.quantity}`)
    .join(", ");
}

function isWithinDateRange(order: DisplayOrder, fromDate: string, toDate: string) {
  if (!order.created_at) return true;

  const createdTime = new Date(order.created_at).getTime();
  const afterFrom = fromDate
    ? createdTime >= new Date(`${fromDate}T00:00:00`).getTime()
    : true;
  const beforeTo = toDate
    ? createdTime <= new Date(`${toDate}T23:59:59`).getTime()
    : true;

  return afterFrom && beforeTo;
}

export default function AdminPreordersPage() {
  const router = useRouter();
  const requireActiveAdmin = useRequireActiveAdmin(router);

  const [orders, setOrders] = useState<PreorderOrder[]>([]);
  const [items, setItems] = useState<PreorderItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<DisplayOrder | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterValue>("all");
  const [campaignFilter, setCampaignFilter] = useState<FilterValue>("all");
  const [teamFilter, setTeamFilter] = useState<FilterValue>("all");
  const [productTypeFilter, setProductTypeFilter] = useState<FilterValue>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<FilterValue>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadOrders = useCallback(async () => {
    setErrorText("");
    setRefreshing(true);

    const { data: campaignRows } = await supabaseBrowser
      .from("preorder_campaigns")
      .select("id, name, slug")
      .order("sort_order", { ascending: true });

    setCampaigns((campaignRows || []) as Campaign[]);

    const { data: orderRows, error: orderError } = await supabaseBrowser
      .from("preorders")
      .select(
        "id, order_code, full_name, phone, team, size, shirt_name, shirt_number, quantity, unit_price, delivery_method, address, note, payment_note, total_amount, status, created_at, updated_at, campaign_id",
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    if (orderError) {
      setErrorText(orderError.message);
      setRefreshing(false);
      return;
    }

    const loadedOrders = (orderRows || []) as PreorderOrder[];
    setOrders(loadedOrders);

    const orderIds = loadedOrders.map((order) => order.id).filter(Boolean);
    if (orderIds.length === 0) {
      setItems([]);
      setRefreshing(false);
      return;
    }

    const loadedItems: PreorderItem[] = [];

    // Batch IDs to avoid long PostgREST URLs when the dashboard has many orders.
    for (const orderIdBatch of chunkArray(orderIds, PREORDER_ITEM_BATCH_SIZE)) {
      const { data: itemRows, error: itemError } = await supabaseBrowser
        .from("preorder_order_items")
        .select(PREORDER_ITEM_SELECT)
        .in("preorder_id", orderIdBatch)
        .order("created_at", { ascending: true });

      if (itemError) {
        setErrorText(
          "ไม่สามารถโหลดรายการสินค้าในออเดอร์ได้ กรุณาลองรีเฟรชอีกครั้ง",
        );
        setItems([]);
        setRefreshing(false);
        return;
      }

      loadedItems.push(...((itemRows || []) as PreorderItem[]));
    }

    setItems(loadedItems);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const isAdmin = await requireActiveAdmin();
      if (!isAdmin) return;

      await loadOrders();
      setLoading(false);
    }

    init();
  }, [loadOrders, requireActiveAdmin]);

  const itemMap = useMemo(() => {
    const map = new Map<string, PreorderItem[]>();

    items.forEach((item) => {
      const currentItems = map.get(item.preorder_id) || [];
      currentItems.push(item);
      map.set(item.preorder_id, currentItems);
    });

    return map;
  }, [items]);

  const displayOrders = useMemo<DisplayOrder[]>(() => {
    return orders.map((order) => {
      const orderItems = toDisplayItems(order, itemMap.get(order.id) || []);
      const totalQuantity = orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      return {
        ...order,
        items: orderItems,
        totalQuantity,
        isLegacy: orderItems.every((item) => item.isLegacy),
      };
    });
  }, [itemMap, orders]);

  const filteredOrders = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return displayOrders.filter((order) => {
      const matchesSearch =
        !query ||
        [order.order_code, order.full_name, order.phone].some((value) =>
          (value || "").toLowerCase().includes(query),
        );
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      const matchesCampaign =
        campaignFilter === "all" || order.campaign_id === campaignFilter;
      const matchesTeam =
        teamFilter === "all" ||
        order.items.some((item) => item.teamSlug === teamFilter);
      const matchesProductType =
        productTypeFilter === "all" ||
        order.items.some((item) => item.productType === productTypeFilter);
      const matchesDelivery =
        deliveryFilter === "all" || order.delivery_method === deliveryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCampaign &&
        matchesTeam &&
        matchesProductType &&
        matchesDelivery &&
        isWithinDateRange(order, fromDate, toDate)
      );
    });
  }, [
    campaignFilter,
    deliveryFilter,
    displayOrders,
    fromDate,
    productTypeFilter,
    searchText,
    statusFilter,
    teamFilter,
    toDate,
  ]);

  const summary = useMemo(() => {
    const statusCounts = new Map<string, number>();
    const teamCounts = new Map<string, number>();
    let totalQuantity = 0;
    let totalAmount = 0;

    filteredOrders.forEach((order) => {
      statusCounts.set(
        order.status || "pending",
        (statusCounts.get(order.status || "pending") || 0) + 1,
      );
      totalAmount += order.total_amount || 0;

      order.items.forEach((item) => {
        totalQuantity += item.quantity;
        teamCounts.set(item.team, (teamCounts.get(item.team) || 0) + item.quantity);
      });
    });

    return { statusCounts, teamCounts, totalQuantity, totalAmount };
  }, [filteredOrders]);

  const productionSummary = useMemo(() => {
    const productMap = new Map<string, { team: string; product: string; size: string; quantity: number }>();
    const sizeMap = new Map<string, number>();

    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const productKey = `${item.team}|${item.productName}|${item.size}`;
        const current = productMap.get(productKey) || {
          team: item.team,
          product: item.productName,
          size: item.size,
          quantity: 0,
        };
        current.quantity += item.quantity;
        productMap.set(productKey, current);
        sizeMap.set(item.size, (sizeMap.get(item.size) || 0) + item.quantity);
      });
    });

    return {
      products: Array.from(productMap.values()).sort((a, b) =>
        `${a.team}${a.product}${a.size}`.localeCompare(
          `${b.team}${b.product}${b.size}`,
          "th",
        ),
      ),
      sizes: Array.from(sizeMap.entries()).map(([size, quantity]) => ({
        size,
        quantity,
      })),
    };
  }, [filteredOrders]);

  const teamOptions = useMemo(() => {
    const teams = new Map<string, string>();

    displayOrders.forEach((order) => {
      order.items.forEach((item) => teams.set(item.teamSlug, item.team));
    });

    return Array.from(teams.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [displayOrders]);

  const productTypeOptions = useMemo(() => {
    const productTypes = new Set<string>();

    displayOrders.forEach((order) => {
      order.items.forEach((item) => productTypes.add(item.productType));
    });

    return Array.from(productTypes.values());
  }, [displayOrders]);

  async function updateStatus(order: DisplayOrder, status: PreorderStatus) {
    setSavingOrderId(order.id);
    setMessage("");
    setErrorText("");

    const { error } = await supabaseBrowser
      .from("preorders")
      .update({ status })
      .eq("id", order.id);

    if (error) {
      setErrorText(error.message);
      setSavingOrderId("");
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.id === order.id ? { ...currentOrder, status } : currentOrder,
      ),
    );
    setMessage("อัปเดตสถานะออเดอร์เรียบร้อยแล้ว");
    setSavingOrderId("");
  }

  function exportOrdersCsv() {
    const rows: Array<Array<number | string | null>> = [
      [
        "order_code",
        "created_at",
        "full_name",
        "phone",
        "delivery_method",
        "address",
        "status",
        "total_amount",
        "note",
        "payment_note",
      ],
      ...filteredOrders.map((order) => [
        order.order_code,
        order.created_at,
        order.full_name,
        order.phone,
        deliveryLabel(order.delivery_method),
        order.address,
        statusLabel(order.status),
        order.total_amount || 0,
        order.note,
        order.payment_note,
      ]),
    ];

    downloadCsv("preorder-orders.csv", rows);
  }

  function exportProductionCsv() {
    const rows: Array<Array<number | string | null>> = [
      [
        "order_code",
        "created_at",
        "customer_name",
        "phone",
        "team",
        "product_name",
        "product_type",
        "size",
        "custom_name",
        "custom_number",
        "quantity",
        "unit_price",
        "line_total",
        "delivery_method",
        "address",
        "status",
        "note",
      ],
    ];

    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        rows.push([
          order.order_code,
          order.created_at,
          order.full_name,
          order.phone,
          item.team,
          item.productName,
          productTypeLabel(item.productType),
          item.size,
          item.customName === "-" ? "" : item.customName,
          item.customNumber === "-" ? "" : item.customNumber,
          item.quantity,
          item.unitPrice,
          item.lineTotal,
          deliveryLabel(order.delivery_method),
          order.address,
          statusLabel(order.status),
          order.note,
        ]);
      });
    });

    downloadCsv("preorder-production.csv", rows);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="text-zinc-400">กำลังตรวจสอบสิทธิ์...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          eyebrow="Admin / Preorders"
          title="ออเดอร์พรีออเดอร์"
          description="ดูรายการสั่งซื้อ จัดการสถานะ และ export CSV สำหรับตรวจยอดหรือส่งผลิต"
        />

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadOrders}
            disabled={refreshing}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-white/10 disabled:opacity-60"
          >
            {refreshing ? "กำลังโหลด..." : "รีเฟรช"}
          </button>
          <button
            onClick={exportOrdersCsv}
            className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 hover:bg-red-500/20"
          >
            Export Orders CSV
          </button>
          <button
            onClick={exportProductionCsv}
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500"
          >
            Export Production CSV
          </button>
        </div>
      </div>

      <FormMessage message={message} tone="success" />
      <FormMessage message={errorText} tone="error" />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="ออเดอร์ทั้งหมด" value={filteredOrders.length} />
        <SummaryCard label="จำนวนสินค้ารวม" value={summary.totalQuantity} />
        <SummaryCard label="ยอดเงินรวม" value={formatMoney(summary.totalAmount)} />
        <SummaryCard label="สถานะรอตรวจสอบ" value={summary.statusCounts.get("pending") || 0} />
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="ค้นหา order_code, ชื่อ, เบอร์โทร"
            className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-red-300"
          />
          <SelectFilter value={statusFilter} onChange={setStatusFilter}>
            <option value="all">ทุกสถานะ</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter value={campaignFilter} onChange={setCampaignFilter}>
            <option value="all">ทุกแคมเปญ</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter value={teamFilter} onChange={setTeamFilter}>
            <option value="all">ทุกทีม</option>
            {teamOptions.map((team) => (
              <option key={team.value} value={team.value}>
                {team.label}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter value={productTypeFilter} onChange={setProductTypeFilter}>
            <option value="all">ทุกประเภทสินค้า</option>
            {productTypeOptions.map((type) => (
              <option key={type} value={type}>
                {productTypeLabel(type)}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter value={deliveryFilter} onChange={setDeliveryFilter}>
            <option value="all">ทุกวิธีรับสินค้า</option>
            {DELIVERY_OPTIONS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </SelectFilter>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-red-300"
          />
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-red-300"
          />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-zinc-950/80 text-xs uppercase tracking-[0.18em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3">ลูกค้า</th>
                  <th className="px-4 py-3">รายการ</th>
                  <th className="px-4 py-3">จำนวน</th>
                  <th className="px-4 py-3">ยอดรวม</th>
                  <th className="px-4 py-3">รับสินค้า</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="align-top text-zinc-200">
                    <td className="px-4 py-4 font-bold">
                      {order.order_code || "-"}
                      {order.isLegacy ? (
                        <span className="mt-2 block rounded-full border border-amber-400/30 px-2 py-1 text-xs text-amber-200">
                          legacy
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold">{order.full_name || "-"}</p>
                      <p className="text-zinc-400">{order.phone || "-"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{itemSummary(order) || "-"}</p>
                      {order.items.length > 2 ? (
                        <p className="text-xs text-zinc-500">
                          +{order.items.length - 2} รายการ
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 font-bold">{order.totalQuantity}</td>
                    <td className="px-4 py-4 font-bold text-red-100">
                      {formatMoney(order.total_amount)}
                    </td>
                    <td className="px-4 py-4">{deliveryLabel(order.delivery_method)}</td>
                    <td className="px-4 py-4">
                      <select
                        value={order.status || "pending"}
                        disabled={savingOrderId === order.id}
                        onChange={(event) =>
                          updateStatus(order, event.target.value as PreorderStatus)
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none ${statusClass(order.status)}`}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
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
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">
              ไม่พบออเดอร์ตามเงื่อนไขที่เลือก
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <SummaryPanel title="จำนวนตามทีม" entries={Array.from(summary.teamCounts.entries())} />
          <ProductionSummary
            productRows={productionSummary.products}
            sizeRows={productionSummary.sizes}
          />
        </aside>
      </section>

      {selectedOrder ? (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      ) : null}
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function SelectFilter({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-red-300"
    >
      {children}
    </select>
  );
}

function SummaryPanel({
  title,
  entries,
}: {
  title: string;
  entries: Array<[string, number]>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 space-y-2">
        {entries.length > 0 ? (
          entries.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">{label}</span>
              <span className="font-bold text-white">{value}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">ยังไม่มีข้อมูล</p>
        )}
      </div>
    </div>
  );
}

function ProductionSummary({
  productRows,
  sizeRows,
}: {
  productRows: Array<{
    team: string;
    product: string;
    size: string;
    quantity: number;
  }>;
  sizeRows: Array<{ size: string; quantity: number }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
      <h2 className="text-lg font-black">สรุปส่งผลิต</h2>
      <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
        {productRows.slice(0, 20).map((row) => (
          <div
            key={`${row.team}-${row.product}-${row.size}`}
            className="rounded-xl bg-zinc-950/70 p-3 text-sm"
          >
            <p className="font-bold text-white">{row.product}</p>
            <p className="text-zinc-400">
              {row.team} / ไซส์ {row.size} / รวม {row.quantity}
            </p>
          </div>
        ))}
        {productRows.length === 0 ? (
          <p className="text-sm text-zinc-500">ยังไม่มีข้อมูล</p>
        ) : null}
      </div>
      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-sm font-bold text-zinc-300">รวมตามไซส์</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {sizeRows.map((row) => (
            <span
              key={row.size}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300"
            >
              {row.size}: {row.quantity}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderDetailPanel({
  order,
  onClose,
}: {
  order: DisplayOrder;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm">
      <div className="ml-auto h-full max-w-3xl overflow-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-red-300">
              Order Detail
            </p>
            <h2 className="mt-2 text-2xl font-black">
              {order.order_code || "-"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-zinc-200 hover:bg-white/10"
          >
            ปิด
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Detail label="วันที่สั่ง" value={formatDate(order.created_at)} />
          <Detail label="อัปเดตล่าสุด" value={formatDate(order.updated_at)} />
          <Detail label="ชื่อลูกค้า" value={order.full_name || "-"} />
          <Detail label="เบอร์โทร" value={order.phone || "-"} />
          <Detail label="วิธีรับสินค้า" value={deliveryLabel(order.delivery_method)} />
          <Detail label="สถานะ" value={statusLabel(order.status)} />
          <Detail label="ยอดรวม" value={formatMoney(order.total_amount)} />
          <Detail label="ที่อยู่" value={order.address || "-"} wide />
          <Detail label="หมายเหตุ" value={order.note || "-"} wide />
          <Detail label="หมายเหตุการชำระเงิน" value={order.payment_note || "-"} wide />
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-black">รายการสินค้า</h3>
          {order.items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black text-white">{item.productName}</p>
                  <p className="text-sm text-zinc-400">
                    {item.team} / {productTypeLabel(item.productType)}
                  </p>
                </div>
                <p className="font-bold text-red-100">
                  {formatMoney(item.lineTotal)}
                </p>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-4">
                <span>ไซส์: {item.size}</span>
                <span>ชื่อ: {item.customName}</span>
                <span>เบอร์: {item.customNumber}</span>
                <span>จำนวน: {item.quantity}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                ราคา {formatMoney(item.unitPrice)} / ชิ้น
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-zinc-900/70 p-4 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-zinc-100">
        {value}
      </p>
    </div>
  );
}
