import { Suspense } from "react";
import ArenaUserAuthPanel from "@/components/arena/ArenaUserAuthPanel";

export default function ArenaForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ArenaUserAuthPanel mode="forgot" />
    </Suspense>
  );
}
