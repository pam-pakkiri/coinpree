
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

// Simple client-side auth guard
// In a real app, this should be server-side with NextAuth, but for this simpler request:
export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const auth = localStorage.getItem("coinpree_auth");

        // If on login page, don't check auth
        if (pathname === "/login") {
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
        }

        if (auth === "true") {
            setIsAuthenticated(true);
        } else {
            router.push("/login");
        }
        setIsLoading(false);
    }, [pathname, router]);

    // Show nothing while checking (or a minimal spinner) strictly to avoid flash of content
    if (isLoading) return null;

    // If on login page, render children (the login page itself)
    if (pathname === "/login") return <>{children}</>;

    // If authenticated, render app
    if (isAuthenticated) return <>{children}</>;

    // Otherwise render nothing (will redirect)
    return null;
}
