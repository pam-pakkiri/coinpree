import SignalsTerminal from "@/components/SignalsTerminal";
import { getCombinedSignals } from "@/app/actions";

export default function Home() {
  return (
    <SignalsTerminal
      title="COMBINED SIGNALS (FUTURES )"
      description="Derivatives Market"
      fetchAction={getCombinedSignals}
    />
  );
}
