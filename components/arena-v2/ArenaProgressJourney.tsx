type JourneyState = "completed" | "current" | "upcoming";

type ArenaProgressJourneyProps = {
  currentStep?: number;
};

const steps = [
  "รับการ์ด",
  "จัดทีม",
  "ส่งทีม",
  "รอแข่งขัน",
  "รับคะแนน",
  "ลุ้นอันดับ",
];

const markers = ["①", "②", "③", "④", "⑤", "⑥"];

function stateForStep(index: number, currentStep: number): JourneyState {
  if (index < currentStep) return "completed";
  if (index === currentStep) return "current";
  return "upcoming";
}

function classesForState(state: JourneyState) {
  if (state === "completed") {
    return "border-emerald-300/45 bg-emerald-300/12 text-emerald-100";
  }

  if (state === "current") {
    return "border-yellow-200 bg-yellow-200 text-zinc-950 shadow-[0_0_28px_rgba(250,204,21,0.22)]";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-500";
}

export default function ArenaProgressJourney({
  currentStep = 1,
}: ArenaProgressJourneyProps) {
  return (
    <section className="border-b border-white/10 bg-black/25 px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {steps.map((label, index) => {
          const state = stateForStep(index, currentStep);

          return (
            <div
              key={label}
              className={[
                "flex min-w-0 items-center gap-2 rounded-[12px] border px-3 py-3",
                classesForState(state),
              ].join(" ")}
            >
              <span className="text-lg font-black">{markers[index]}</span>
              <span className="text-sm font-black">{label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
