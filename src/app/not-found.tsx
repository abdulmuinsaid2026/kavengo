import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass, Home, ShoppingBag } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-b from-stone-50 via-white to-stone-50 px-4">
      <div className="max-w-md w-full text-center py-12">
        <div className="size-20 bg-stone-100 text-stone-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Compass className="size-10 animate-spin-slow stroke-[1.5]" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider text-rose-600 mb-2">404 Error</p>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl">Page Not Found</h1>
        <p className="mt-3 text-base text-stone-600">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/">
            <Button className="w-full sm:w-auto gap-2">
              <Home className="size-4" />
              Back to Home
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <ShoppingBag className="size-4" />
              Explore Products
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
