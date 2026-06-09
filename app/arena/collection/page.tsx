import ArenaCollectionPanel from "@/components/arena/ArenaCollectionPanel";
import ArenaShell from "@/components/arena-v2/ArenaShell";

export const dynamic = "force-dynamic";

export default function ArenaCollectionPage() {
  return (
    <ArenaShell active="collection" title="Collection Binder">
      <ArenaCollectionPanel />
    </ArenaShell>
  );
}
