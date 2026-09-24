"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-b from-stone-50 via-white to-stone-50 px-4">
      <div className="max-w-md w-full text-center py-12">
        <div className="size-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="size-10 stroke-[1.5]" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider text-rose-600 mb-2">Something went wrong</p>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl">Application Error</h1>
        <p className="mt-3 text-base text-stone-600">
          We encountered an unexpected issue while processing your request. Please try again or return to the homepage.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={() => reset()} className="w-full sm:w-auto gap-2">
            <RefreshCw className="size-4" />
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <Home className="size-4" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
