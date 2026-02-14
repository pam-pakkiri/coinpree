
import SignalsTerminal from '@/components/SignalsTerminal';
import { getBinanceFuturesSignalsAction } from '@/app/actions';

export default async function BinanceFuturesPage() {
    // Server-side data fetching
    const initialSignals = await getBinanceFuturesSignalsAction("1h");

    return (
        <SignalsTerminal
            title="EXCHANGE FUTURES MARKET"
            description="Futures Data"
            fetchAction={getBinanceFuturesSignalsAction}
            initialData={initialSignals}
        />
    );
}
