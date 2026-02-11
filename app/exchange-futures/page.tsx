import SignalsTerminal from "@/components/SignalsTerminal";
import { getMACrossoverSignals } from "@/app/actions";

export default function Home() {
  return (
    <SignalsTerminal
      title="EXCHANGE FUTURES"
      description="CoinGecko Market Data"
      fetchAction={getMACrossoverSignals}
    />
  );
}
