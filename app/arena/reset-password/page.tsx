import { Suspense } from "react";
import ArenaUserAuthPanel from "@/components/arena/ArenaUserAuthPanel";

export default function ArenaResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ArenaUserAuthPanel mode="reset" />
    </Suspense>
  );
}
