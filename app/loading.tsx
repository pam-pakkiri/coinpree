import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Hero Skeleton */}
            <div className="text-center space-y-4 py-8">
                <Skeleton className="h-6 w-48 mx-auto rounded-full bg-white/5" />
                <Skeleton className="h-16 w-3/4 mx-auto rounded-xl bg-white/5" />
                <Skeleton className="h-6 w-1/2 mx-auto rounded-lg bg-white/5" />
            </div>

            {/* Bento Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-2xl bg-white/5 border border-white/5" />
                ))}
            </div>

            {/* Table Section Skeleton */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-48 bg-white/5" />
                    <Skeleton className="h-10 w-24 bg-white/5" />
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="p-4 space-y-4">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-lg bg-white/5" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
