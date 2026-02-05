
import SignalsTerminal from '@/components/SignalsTerminal';
import { getBinanceFuturesSignalsAction } from '@/app/actions';

export default function BinanceFuturesPage() {
    return (
        <SignalsTerminal
            title="BINANCE FUTURES CROSSOVER"
            description="7/99 EMA ALGO (USDT-M)"
            fetchAction={getBinanceFuturesSignalsAction}
        />
    );
}
