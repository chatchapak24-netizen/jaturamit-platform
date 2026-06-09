import { Suspense } from "react";
import ArenaUserAuthPanel from "@/components/arena/ArenaUserAuthPanel";

export default function ArenaLoginPage() {
  return (
    <Suspense fallback={null}>
      <ArenaUserAuthPanel mode="login" />
    </Suspense>
  );
}
