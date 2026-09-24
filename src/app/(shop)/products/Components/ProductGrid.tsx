"use client";
import ProductCard from "@/app/components/ProductCard";
import ProductCardSkeleton from "@/app/components/ProductCardSkeleton";
import {
   Breadcrumb,
   BreadcrumbItem,
   BreadcrumbLink,
   BreadcrumbList,
   BreadcrumbPage,
   BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilterSidebar from "./FilterSidebar";
import { ProductPreview, ProductQueryOptions, SortOption } from "@/types/domains/product";
import { CategoryTree } from "@/types/domains/category";
import * as productServices from "@/services/product";
import { useAppSelector } from "@/store/hooks";
import { getPromotionForProduct } from "@/lib/utils";
import { SlidersHorizontal, X } from "lucide-react";

const PAGE_SIZE = 12;

const findCategoryById = (cats: CategoryTree[], id: number): CategoryTree | null => {
   for (const cat of cats) {
      if (cat.categoryId === id) return cat;
      if (cat.subcategories?.length) {
         const found = findCategoryById(cat.subcategories, id);
         if (found) return found;
      }
   }
   return null;
};

interface ProductGridProps {
   categories: CategoryTree[];
   products: ProductPreview[];
   onCategoryChange?: (categoryId: number | null) => void;
   selectedCategoryId?: number | null;
   searchQuery?: string | null;
}

const ProductGrid = ({
   categories,
   onCategoryChange: onCategoryChangeProp,
   selectedCategoryId: selectedCategoryIdProp,
   searchQuery: searchQueryProp,
}: ProductGridProps) => {
   const [gridColumns, setGridColumns] = useState(3);
   const userOverrideRef = useRef(false);
   const [sheetOpen, setSheetOpen] = useState(false);

   useEffect(() => {
      const getAutoColumns = () => window.innerWidth >= 1440 ? 4 : 3;
      setGridColumns(getAutoColumns());
      const handleResize = () => {
         if (!userOverrideRef.current) setGridColumns(getAutoColumns());
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
   }, []);
   const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(selectedCategoryIdProp ?? null);
   const [currentCategory, setCurrentCategory] = useState<CategoryTree | null>(null);
   const [sortBy, setSortBy] = useState<SortOption>(SortOption.POPULAR);
   const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

   const [products, setProducts] = useState<ProductPreview[]>([]);
   const [offset, setOffset] = useState(0);
   const [hasMore, setHasMore] = useState(true);
   const [isInitialLoading, setIsInitialLoading] = useState(true);
   const [isLoadingMore, setIsLoadingMore] = useState(false);
   const isFetchingRef = useRef(false);
   const sentinelRef = useRef<HTMLDivElement>(null);

   const promotions = useAppSelector((state) => state.promotions.items);

   const buildFilters = (
      o: number,
      cat: number | null,
      sort: SortOption,
      price: [number, number],
      search?: string | null
   ): ProductQueryOptions => {
      const f: ProductQueryOptions = { sortOption: sort, status: true, limit: PAGE_SIZE, offset: o };
      if (cat !== null) f.categoryId = cat;
      if (price[0] > 0) f.priceRangeMin = price[0];
      if (price[1] < 100000) f.priceRangeMax = price[1];
      if (search && search.trim()) f.searchInput = search.trim();
      return f;
   };

   // Reset and re-fetch when any filter changes
   const [priceMin, priceMax] = priceRange;
   useEffect(() => {
      let cancelled = false;
      isFetchingRef.current = true;
      setIsInitialLoading(true);
      setProducts([]);
      setOffset(0);
      setHasMore(true);

      productServices.getAllProducts(buildFilters(0, selectedCategoryId, sortBy, priceRange, searchQueryProp))
         .then((result) => {
            if (cancelled) return;
            if (result.success) {
               const data = result.data ?? [];
               const seen = new Set<number>();
               const unique = data.filter(p => {
                  if (seen.has(p.productId)) return false;
                  seen.add(p.productId);
                  return true;
               });
               setProducts(unique);
               setOffset(data.length);
               setHasMore(data.length === PAGE_SIZE);
            }
         })
         .catch((err) => {
            if (!cancelled) {
               console.error("Failed to load products:", err);
               setProducts([]);
            }
         })
         .finally(() => {
            if (!cancelled) {
               setIsInitialLoading(false);
               isFetchingRef.current = false;
            }
         });

      return () => { cancelled = true; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [sortBy, selectedCategoryId, priceMin, priceMax, searchQueryProp]);

   // Sync selected category from parent (URL navigation)
   useEffect(() => {
      if (selectedCategoryIdProp === undefined) return;
      setSelectedCategoryId(selectedCategoryIdProp);
      if (selectedCategoryIdProp !== null) {
         setCurrentCategory(findCategoryById(categories, selectedCategoryIdProp) ?? null);
      } else {
         setCurrentCategory(null);
      }
   }, [selectedCategoryIdProp, categories]);

   const router = useRouter();
   const searchParams = useSearchParams();

   const handleCategoryChange = (categoryId: number | null) => {
      setSelectedCategoryId(categoryId);
      setCurrentCategory(categoryId !== null ? (findCategoryById(categories, categoryId) ?? null) : null);
      onCategoryChangeProp?.(categoryId);
      const params = new URLSearchParams(searchParams.toString());
      if (categoryId !== null) {
         params.set("categoryId", String(categoryId));
      } else {
         params.delete("categoryId");
      }
      router.push(params.toString() ? `/products?${params.toString()}` : "/products");
   };

   // Load next page
   const loadMore = useCallback(async () => {
      if (isFetchingRef.current || !hasMore) return;
      isFetchingRef.current = true;
      setIsLoadingMore(true);
      try {
         const result = await productServices.getAllProducts(buildFilters(offset, selectedCategoryId, sortBy, priceRange, searchQueryProp));
         if (result.success) {
            const data = result.data ?? [];
            if (data.length === 0) {
               setHasMore(false);
            } else {
               setProducts(prev => {
                  const existingIds = new Set(prev.map(p => p.productId));
                  const uniqueNew = data.filter(p => !existingIds.has(p.productId));
                  return [...prev, ...uniqueNew];
               });
               setOffset(prev => prev + data.length);
               setHasMore(data.length === PAGE_SIZE);
            }
         }
      } catch (err) {
         console.error("Failed to load more products:", err);
      } finally {
         setIsLoadingMore(false);
         isFetchingRef.current = false;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [offset, hasMore, selectedCategoryId, sortBy, priceMin, priceMax, searchQueryProp]);

   const clearSearch = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("search");
      router.push(params.toString() ? `/products?${params.toString()}` : "/products");
   };

   // IntersectionObserver watches the sentinel div at the bottom
   useEffect(() => {
      const el = sentinelRef.current;
      if (!el || !hasMore || isInitialLoading) return;

      const observer = new IntersectionObserver(
         ([entry]) => { if (entry.isIntersecting) loadMore(); },
         { rootMargin: '400px' }
      );
      observer.observe(el);
      return () => observer.disconnect();
   }, [loadMore, hasMore, isInitialLoading]);

   const getGridClass = () => {
      switch (gridColumns) {
         case 2: return "grid-cols-2";
         case 3: return "grid-cols-2 md:grid-cols-3";
         case 4: return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
         default: return "grid-cols-2 md:grid-cols-3";
      }
   };

   return (
      <section className="bg-background">
         <div className="max-w-[1600px] mx-auto w-full px-6 md:px-10 py-8">

            <Breadcrumb className="mb-6">
               <BreadcrumbList>
                  <BreadcrumbItem>
                     <BreadcrumbLink href="/" className="text-muted-foreground hover:text-foreground">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                     <BreadcrumbLink href="/products" className="text-muted-foreground hover:text-foreground">Products</BreadcrumbLink>
                  </BreadcrumbItem>
                  {(currentCategory || selectedCategoryId !== null) && (
                     <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                           <BreadcrumbPage>{currentCategory?.name ?? "Category"}</BreadcrumbPage>
                        </BreadcrumbItem>
                     </>
                  )}
                  {searchQueryProp && (
                     <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                           <BreadcrumbPage>Search: &ldquo;{searchQueryProp}&rdquo;</BreadcrumbPage>
                        </BreadcrumbItem>
                     </>
                  )}
               </BreadcrumbList>
            </Breadcrumb>

            <div className="flex flex-col lg:flex-row gap-10">

               {/* Aside stretches full height of the flex row — sticky inner div moves inside it */}
               <aside className="hidden lg:block">
                  <div className="sticky top-[5.5rem]">
                     <FilterSidebar
                        categories={categories}
                        onCategoryChange={handleCategoryChange}
                        selectedCategoryId={selectedCategoryId}
                        priceRange={priceRange}
                        onPriceRangeChange={setPriceRange}
                     />
                  </div>
               </aside>

               <main className="flex-1 min-w-0">

                  {/* Active search query banner */}
                  {searchQueryProp && (
                     <div className="flex items-center justify-between mb-4 p-3 bg-muted/60 border border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">
                           Results for &ldquo;<span className="text-foreground font-semibold">{searchQueryProp}</span>&rdquo;
                        </p>
                        <button
                           onClick={clearSearch}
                           className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors font-medium"
                        >
                           Clear search
                        </button>
                     </div>
                  )}

                  {/* Active filter chips */}
                  {(selectedCategoryId !== null || priceRange[0] > 0 || priceRange[1] < 100000) && (
                     <div className="flex flex-wrap items-center gap-2 mb-4">
                        {currentCategory && (
                           <span className="flex items-center gap-1.5 px-3 py-1 text-xs tracking-wide border border-[#c9a84c]/40 bg-[#c9a84c]/10 text-foreground">
                              {currentCategory.name}
                              <button onClick={() => handleCategoryChange(null)} className="hover:text-[#c9a84c] transition-colors">
                                 <X className="h-3 w-3" />
                              </button>
                           </span>
                        )}
                        {(priceRange[0] > 0 || priceRange[1] < 100000) && (
                           <span className="flex items-center gap-1.5 px-3 py-1 text-xs tracking-wide border border-[#c9a84c]/40 bg-[#c9a84c]/10 text-foreground">
                              ${priceRange[0].toLocaleString()} – ${priceRange[1].toLocaleString()}
                              <button onClick={() => setPriceRange([0, 100000])} className="hover:text-[#c9a84c] transition-colors">
                                 <X className="h-3 w-3" />
                              </button>
                           </span>
                        )}
                        <button
                           onClick={() => {
                              handleCategoryChange(null);
                              setPriceRange([0, 100000]);
                              if (searchQueryProp) clearSearch();
                           }}
                           className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                        >
                           Clear all
                        </button>
                     </div>
                  )}

                  {/* Toolbar */}
                  <div className="flex items-center justify-between gap-4 mb-6 pb-5 border-b border-border">
                     <div className="flex items-center gap-3">

                        {/* Filters — mobile/tablet */}
                        <div className="lg:hidden">
                           <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                              <SheetTrigger asChild>
                                 <Button variant="outline" size="sm" className="rounded-none gap-2">
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    Filters
                                 </Button>
                              </SheetTrigger>
                              <SheetContent side="left" className="p-0 w-[90vw] sm:w-[360px] bg-background flex flex-col">
                                 <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
                                    <SheetTitle className="font-display text-xl font-medium text-foreground text-left">Filters</SheetTitle>
                                 </SheetHeader>
                                 <div className="flex-1 overflow-auto px-6 py-6">
                                    <FilterSidebar
                                       categories={categories}
                                       onCategoryChange={handleCategoryChange}
                                       selectedCategoryId={selectedCategoryId}
                                       priceRange={priceRange}
                                       onPriceRangeChange={setPriceRange}
                                       mobile
                                       onClose={() => setSheetOpen(false)}
                                    />
                                 </div>
                              </SheetContent>
                           </Sheet>
                        </div>

                        {/* Grid toggle — desktop */}
                        <div className="hidden sm:flex items-center gap-4">
                           {[
                              { cols: 2, icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 17 18" fill="none"><rect width="8" height="8" rx="1" fill="currentColor"/><rect y="9" width="8" height="8" rx="1" fill="currentColor"/><rect x="9" width="8" height="8" rx="1" fill="currentColor"/><rect x="9" y="9" width="8" height="8" rx="1" fill="currentColor"/></svg> },
                              { cols: 3, icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 26 18" fill="none"><rect width="8" height="8" rx="1" fill="currentColor"/><rect y="9" width="8" height="8" rx="1" fill="currentColor"/><rect x="9" width="8" height="8" rx="1" fill="currentColor"/><rect x="18" width="8" height="8" rx="1" fill="currentColor"/><rect x="9" y="9" width="8" height="8" rx="1" fill="currentColor"/><rect x="18" y="9" width="8" height="8" rx="1" fill="currentColor"/></svg> },
                              { cols: 4, icon: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="16" viewBox="0 0 23 18" fill="none"><rect y="12" width="5" height="5" rx="1" fill="currentColor"/><rect x="6" y="12" width="5" height="5" rx="1" fill="currentColor"/><rect x="12" y="12" width="5" height="5" rx="1" fill="currentColor"/><rect x="18" y="12" width="5" height="5" rx="1" fill="currentColor"/><rect y="6" width="5" height="5" rx="1" fill="currentColor"/><rect x="6" y="6" width="5" height="5" rx="1" fill="currentColor"/><rect x="12" y="6" width="5" height="5" rx="1" fill="currentColor"/><rect x="18" y="6" width="5" height="5" rx="1" fill="currentColor"/><rect width="5" height="5" rx="1" fill="currentColor"/><rect x="6" width="5" height="5" rx="1" fill="currentColor"/><rect x="12" width="5" height="5" rx="1" fill="currentColor"/><rect x="18" width="5" height="5" rx="1" fill="currentColor"/></svg> },
                           ].map(({ cols, icon }) => (
                              <button
                                 key={cols}
                                 onClick={() => { userOverrideRef.current = true; setGridColumns(cols); }}
                                 className={`transition-colors duration-200 ${gridColumns === cols ? "text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                              >
                                 {icon}
                              </button>
                           ))}
                        </div>
                     </div>

                     {/* Sort */}
                     <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground tracking-wide shrink-0 hidden sm:block">Sort by</span>
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                           <SelectTrigger className="w-44 h-8 text-sm rounded-sm border-border/60">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value={SortOption.POPULAR}>Popular</SelectItem>
                              <SelectItem value={SortOption.NEWEST}>Newest</SelectItem>
                              <SelectItem value={SortOption.PRICE_LOW_TO_HIGH}>Price: Low to High</SelectItem>
                              <SelectItem value={SortOption.PRICE_HIGH_TO_LOW}>Price: High to Low</SelectItem>
                           </SelectContent>
                        </Select>
                     </div>
                  </div>

                  {/* Product count */}
                  {!isInitialLoading && products.length > 0 && (
                     <p className="text-xs text-muted-foreground mb-5 tracking-wide">
                        {products.length} {products.length === 1 ? "work" : "works"} loaded
                     </p>
                  )}

                  {/* Grid */}
                  <div className={`grid ${getGridClass()} gap-x-5 gap-y-10`}>
                     {isInitialLoading ? (
                        Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)
                     ) : products.length > 0 ? (
                        products.map((product, index) => (
                           <ProductCard
                              key={product.productId}
                              product={product}
                              promo={getPromotionForProduct(product, promotions)}
                              priority={index < 4}
                           />
                        ))
                     ) : (
                        <div className="col-span-full text-center py-20">
                           <p className="font-display text-2xl font-light text-foreground mb-2">
                              {searchQueryProp ? `No works found for "${searchQueryProp}"` : "No works found"}
                           </p>
                           <p className="text-sm text-muted-foreground">
                              {searchQueryProp ? "Try checking your spelling or adjusting your filters" : "Try adjusting your filters"}
                           </p>
                           {searchQueryProp && (
                              <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={clearSearch}
                                 className="mt-4 text-xs tracking-wider uppercase rounded-none"
                              >
                                 Clear Search
                              </Button>
                           )}
                        </div>
                     )}
                  </div>

                  {/* Infinite scroll sentinel */}
                  <div ref={sentinelRef} className="h-1 mt-10" />

                  {/* Loading more spinner */}
                  {isLoadingMore && (
                     <div className="flex justify-center py-8">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                     </div>
                  )}

                  {/* All loaded */}
                  {!hasMore && products.length > 0 && !isLoadingMore && (
                     <p className="text-center text-[11px] text-muted-foreground py-8 tracking-[0.15em] uppercase">
                        All {products.length} works shown
                     </p>
                  )}

               </main>
            </div>
         </div>
      </section>
   );
};

export default ProductGrid;
