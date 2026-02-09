
import SignalsTerminal from '@/components/SignalsTerminal';
import { getBinanceFuturesSignalsAction } from '@/app/actions';

export default function BinanceFuturesPage() {
    return (
        <SignalsTerminal
            title="BINANCE FUTURES "
            description=""
            fetchAction={getBinanceFuturesSignalsAction}
        />
    );
}
