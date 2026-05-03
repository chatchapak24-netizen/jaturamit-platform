import { supabase } from "@/lib/supabase";

export default async function DebugPage() {
  const teams = await supabase.from("teams").select("*");
  const matches = await supabase.from("matches").select("*");
  const standings = await supabase.from("standings").select("*");

  return (
    <main style={{ padding: 24, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      <h1>Supabase Debug</h1>

      <h2>ENV</h2>
      <pre>
        {JSON.stringify(
          {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
            keyStart: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20),
          },
          null,
          2
        )}
      </pre>

      <h2>Teams</h2>
      <pre>
        {JSON.stringify(
          {
            count: teams.data?.length ?? 0,
            error: teams.error,
            data: teams.data,
          },
          null,
          2
        )}
      </pre>

      <h2>Matches</h2>
      <pre>
        {JSON.stringify(
          {
            count: matches.data?.length ?? 0,
            error: matches.error,
            data: matches.data,
          },
          null,
          2
        )}
      </pre>

      <h2>Standings</h2>
      <pre>
        {JSON.stringify(
          {
            count: standings.data?.length ?? 0,
            error: standings.error,
            data: standings.data,
          },
          null,
          2
        )}
      </pre>
    </main>
  );
}