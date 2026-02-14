import SignalsTerminal from "@/components/SignalsTerminal";
import { getMACrossoverSignals } from "@/app/actions";

export default async function ExchangeFuturesPage() {
  // Server-side data fetching
  const initialSignals = await getMACrossoverSignals("1h");

  return (
    <SignalsTerminal
      title="EXCHANGE FUTURES"
      description="Market Data"
      fetchAction={getMACrossoverSignals}
      initialData={initialSignals}
    />
  );
}
