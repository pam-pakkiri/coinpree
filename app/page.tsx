import SignalsTerminal from "@/components/SignalsTerminal";
import { getCombinedSignals } from "@/app/actions";

export default function Home() {
  return (
    <SignalsTerminal
      title="COMBINED SIGNALS (FUTURES + SPOT)"
      description="7/99 EMA ALGO - BINANCE FUTURES + SPOT"
      fetchAction={getCombinedSignals}
    />
  );
}
