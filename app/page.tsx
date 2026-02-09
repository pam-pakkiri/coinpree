import SignalsTerminal from "@/components/SignalsTerminal";
import { getCombinedSignals } from "@/app/actions";

export default function Home() {
  return (
    <SignalsTerminal
      title="EXCHANGE FUTURES"
      description="Combined Market Data"
      fetchAction={getCombinedSignals}
    />
  );
}
