import { Suspense } from "react";
import ArenaUserAuthPanel from "@/components/arena/ArenaUserAuthPanel";

export default function ArenaSignupPage() {
  return (
    <Suspense fallback={null}>
      <ArenaUserAuthPanel mode="signup" />
    </Suspense>
  );
}
