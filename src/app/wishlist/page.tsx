"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchWishlistItems, removeFromWishlistAsync } from "@/store/slices/wishlistSlice";
import { Heart, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";

export default function WishlistPage() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.wishlist);
  const { authenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchWishlistItems());
  }, [dispatch]);

  const handleRemove = (productVariantId: number) => {
    dispatch(removeFromWishlistAsync(productVariantId));
  };

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-stone-50 via-white to-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-stone-200 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl flex items-center gap-3">
              <Heart className="size-8 text-rose-500 fill-rose-500" />
              My Wishlist
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Your saved premium wall arts, canvas prints, and handmade rugs.
            </p>
          </div>
          <Link href="/products">
            <Button variant="outline" className="gap-2">
              <ShoppingBag className="size-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-stone-500">
            <Spinner className="size-8 text-primary mb-3" />
            <p className="text-sm font-medium">Loading your wishlist...</p>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-100 shadow-sm max-w-xl mx-auto px-6">
            <div className="size-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">Your wishlist is empty</h3>
            <p className="mt-2 text-sm text-stone-600 max-w-md mx-auto">
              {authenticated
                ? "You haven't saved any items to your wishlist yet. Explore our curated catalog of canvas wall art and rugs."
                : "Sign in to save your favorite products and sync them across all your devices."}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/products">
                <Button className="gap-2">
                  Browse Products
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              {!authenticated && (
                <Link href="/auth/login">
                  <Button variant="outline">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* Wishlist Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => {
              const variantId = item.productVariant?.productVariantId;
              const price = item.productVariant?.price ?? 0;
              const productUrl = item.productId ? `/products/${item.productId}` : "/products";

              return (
                <div
                  key={item.wishlistItemId}
                  className="group relative bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                  {/* Image container */}
                  <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
                    {item.productImageUrl ? (
                      <img
                        src={item.productImageUrl}
                        alt={item.productTitle || "Product Image"}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <ShoppingBag className="size-12 stroke-[1.5]" />
                      </div>
                    )}
                    <button
                      onClick={() => variantId && handleRemove(variantId)}
                      title="Remove from wishlist"
                      aria-label="Remove from wishlist"
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-stone-500 hover:text-rose-600 hover:bg-white shadow transition-all"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <div>
                      <Link href={productUrl}>
                        <h3 className="font-semibold text-stone-900 group-hover:text-primary line-clamp-2 transition-colors">
                          {item.productTitle || "Kavengo Wall Art"}
                        </h3>
                      </Link>
                      {item.productVariant?.sku && (
                        <p className="text-xs text-stone-500 mt-1">SKU: {item.productVariant.sku}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-lg font-bold text-stone-900">
                        ${price.toFixed(2)}
                      </span>
                      <Link href={productUrl}>
                        <Button size="sm" variant="default" className="gap-1.5 text-xs">
                          View Item
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}