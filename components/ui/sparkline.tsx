"use client";

import { useMemo, memo } from "react";

interface SparklineProps {
    data: number[] | { close: number }[];
    width?: number;
    height?: number;
    color?: string;
    fill?: boolean;
    className?: string;
}

export const Sparkline = memo(({
    data,
    width = 100,
    height = 30,
    color = "currentColor",
    fill = false,
    className
}: SparklineProps) => {
    const points = useMemo(() => {
        if (!data || data.length === 0) return "";

        const values = data.map(d => typeof d === 'number' ? d : d.close);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const padding = 2;
        const availableHeight = height - (padding * 2);

        const pts = values.map((val, i) => {
            const x = (i / (values.length - 1)) * width;
            const normalizedY = (val - min) / range;
            const y = height - padding - (normalizedY * availableHeight);
            return `${x},${y}`;
        });

        return pts.join(" ");
    }, [data, width, height]);

    if (!points) return null;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            preserveAspectRatio="none"
        >
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {fill && (
                <polygon
                    fill={color}
                    fillOpacity="0.1"
                    stroke="none"
                    points={`0,${height} ${points} ${width},${height}`}
                />
            )}
        </svg>
    );
});

Sparkline.displayName = "Sparkline";

export const TinyCandle = memo(({
    data,
    width = 100,
    height = 30
}: {
    data: { open: number, high: number, low: number, close: number }[],
    width?: number,
    height?: number
}) => {
    const contents = useMemo(() => {
        if (!data || data.length === 0) return null;

        const allHighs = data.map(d => d.high);
        const allLows = data.map(d => d.low);
        const minRaw = Math.min(...allLows);
        const maxRaw = Math.max(...allHighs);
        const range = maxRaw - minRaw || 1;

        const candleSpace = width / data.length;
        const gap = Math.max(1, candleSpace * 0.2);
        const candleWidth = Math.max(1, candleSpace - gap);

        const paddingY = 2;
        const availableHeight = height - (paddingY * 2);

        return data.map((d, i) => {
            const x = i * candleSpace;
            const normalize = (val: number) => height - paddingY - ((val - minRaw) / range * availableHeight);

            const yHigh = normalize(d.high);
            const yLow = normalize(d.low);
            const yOpen = normalize(d.open);
            const yClose = normalize(d.close);

            const isGreen = d.close >= d.open;
            const fill = isGreen ? "#22c55e" : "#ef4444";
            const yBodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1);
            const wickX = x + (candleWidth / 2);

            return (
                <g key={i}>
                    <line x1={wickX} y1={yHigh} x2={wickX} y2={yLow} stroke={fill} strokeWidth="1" opacity={0.8} />
                    <rect x={x} y={yBodyTop} width={candleWidth} height={bodyHeight} fill={fill} rx={0.5} />
                </g>
            );
        });
    }, [data, width, height]);

    if (!contents) return null;

    return (
        <svg width={width} height={height} className="overflow-hidden" preserveAspectRatio="none">
            {contents}
        </svg>
    );
});

TinyCandle.displayName = "TinyCandle";
