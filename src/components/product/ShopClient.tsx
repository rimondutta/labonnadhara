"use client";

import { useState, useMemo, Suspense, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import ProductCardNike from "@/components/ui/product-card-nike";
import { cn } from "@/lib/utils";

function FilterPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "font-display font-semibold text-sm px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap",
        selected
          ? "bg-joy-cobalt text-white shadow-[0_4px_12px_rgba(45,91,227,0.3)]"
          : "bg-joy-mist text-joy-navy hover:bg-joy-cobalt/10 hover:text-joy-cobalt"
      )}
    >
      {label}
    </button>
  );
}

function SidebarFilterItem({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full group py-1.5"
    >
      <div className={cn(
        "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all",
        selected ? "bg-joy-cobalt border-joy-cobalt" : "border-joy-rule bg-white group-hover:border-joy-cobalt/50"
      )}>
        {selected && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
      </div>
      <span className={cn("font-display font-medium text-sm transition-colors", selected ? "text-joy-navy" : "text-joy-muted group-hover:text-joy-navy")}>
        {label}
      </span>
    </button>
  );
}

function ShopGridPure({
  initialProducts,
  categoryParam,
  ageParam,
  searchParam
}: {
  initialProducts: any[],
  categoryParam: string | null,
  ageParam: string | null,
  searchParam: string | null
}) {
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;
  const [isPending, startTransition] = useTransition();

  const [sortBy, setSortBy] = useState("featured");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const updateFilters = (key: string, value: string | null) => {
    const currentParams = new URLSearchParams();
    if (categoryParam) currentParams.set("category", categoryParam);
    if (ageParam) currentParams.set("age", ageParam);
    if (searchParam) currentParams.set("search", searchParam);

    if (value === null) currentParams.delete(key);
    else currentParams.set(key, value);

    startTransition(() => {
      router.push(`/products?${currentParams.toString()}`, { scroll: false });
    });
  };

  const categories = useMemo(() => {
    const m = new Map<string, string>();
    initialProducts.forEach((p: any) => {
      if (p.category?.name && p.category?.slug) m.set(p.category.slug, p.category.name);
    });
    return Array.from(m.entries()).map(([slug, name]) => ({ slug, name }));
  }, [initialProducts]);

  const ageRanges = ["0-1", "1-3", "3-5", "5-8", "8+"];

  const filteredProducts = useMemo(() => {
    let result = initialProducts.filter((p: any) => {
      const catMatch = !categoryParam || p.category?.slug === categoryParam || p.category?.name === categoryParam;
      const ageMatch = !ageParam || p.ageRange === ageParam;
      const searchMatch = !searchParam || p.title.toLowerCase().includes(searchParam.toLowerCase());
      return catMatch && ageMatch && searchMatch;
    });
    if (sortBy === "price-low") result.sort((a: any, b: any) => a.price - b.price);
    if (sortBy === "price-high") result.sort((a: any, b: any) => b.price - a.price);
    if (sortBy === "newest") result.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [initialProducts, categoryParam, ageParam, sortBy, searchParam]);

  const clearFilters = () => {
    startTransition(() => {
      router.push("/products", { scroll: false });
    });
  };

  const activeFilterCount = [categoryParam, ageParam].filter(Boolean).length;

  return (
    <div suppressHydrationWarning className="flex-1 bg-joy-cream min-h-screen text-joy-navy font-body">
      <section className="relative bg-joy-cream pb-4 pt-32 lg:pt-36">
        <div className="px-4 sm:px-8 lg:px-[5vw] py-5 flex items-end justify-between border-b border-joy-rule">
          <h1 className="font-display font-bold text-4xl md:text-5xl text-joy-navy tracking-tight">
            {categoryParam || "All products"}
          </h1>
          <span className="font-body text-sm text-joy-muted mb-1">
            {filteredProducts.length} products
          </span>
        </div>

        <div className="px-4 sm:px-8 lg:px-[5vw] py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => setIsMobileFiltersOpen(true)}
            className={cn(
              "lg:hidden flex items-center gap-2 font-display font-semibold text-sm px-4 py-2.5 rounded-xl border-2 transition-all",
              activeFilterCount > 0 ? "border-joy-cobalt text-joy-cobalt bg-joy-cobalt/5" : "border-joy-rule text-joy-navy hover:border-joy-cobalt/50"
            )}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-joy-cobalt text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">{activeFilterCount}</span>
            )}
          </button>

          <div className="hidden lg:flex items-center gap-2 flex-wrap">
            <FilterPill label="All" selected={!categoryParam} onClick={() => updateFilters("category", null)} />
            {categories.map((cat) => (
              <FilterPill
                key={cat.slug}
                label={cat.name}
                selected={categoryParam === cat.name || categoryParam === cat.slug}
                onClick={() => updateFilters("category", categoryParam === cat.name ? null : cat.name)}
              />
            ))}
          </div>

          <div className="flex-1 hidden lg:block" />

          <div className="relative flex items-center gap-3 shrink-0">
            <span className="font-display font-medium text-sm text-joy-muted hidden sm:block">Sort by:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none font-display font-semibold text-sm text-joy-navy bg-joy-mist px-4 py-2 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-joy-cobalt/30 cursor-pointer"
                suppressHydrationWarning
              >
                <option value="featured">Featured</option>
                <option value="newest">New Arrivals</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-joy-muted pointer-events-none" />
            </div>
          </div>

          {(categoryParam || ageParam) && (
            <button
              onClick={clearFilters}
              className="hidden lg:flex items-center gap-1 font-display font-semibold text-sm text-joy-coral hover:text-joy-coral/70 ml-2"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </section>

      <div className={cn("px-4 sm:px-8 lg:px-[5vw] py-10 flex flex-col lg:flex-row gap-10", isPending && "opacity-70 pointer-events-none transition-opacity")}>
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-32 space-y-8 bg-white border border-joy-rule rounded-2xl p-6">
            <div className="space-y-3">
              <h4 className="font-display font-bold text-joy-navy text-sm uppercase tracking-wide">Category</h4>
              <div className="space-y-1">
                <SidebarFilterItem label="All Products" selected={!categoryParam} onClick={() => updateFilters("category", null)} />
                {categories.map((cat) => (
                  <SidebarFilterItem
                    key={cat.slug}
                    label={cat.name}
                    selected={categoryParam === cat.name || categoryParam === cat.slug}
                    onClick={() => updateFilters("category", categoryParam === cat.name ? null : cat.name)}
                  />
                ))}
              </div>
            </div>

            <div className="border-t border-joy-rule" />

            <div className="space-y-3">
              <h4 className="font-display font-bold text-joy-navy text-sm uppercase tracking-wide">Age Range</h4>
              <div className="space-y-1">
                {ageRanges.map((age) => (
                  <SidebarFilterItem
                    key={age}
                    label={`${age} Years`}
                    selected={ageParam === age}
                    onClick={() => updateFilters("age", ageParam === age ? null : age)}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-12">
              {filteredProducts.map((product: any, idx: number) => (
                <ProductCardNike
                  key={product._id}
                  product={product}
                  priority={idx < 4}
                  index={idx + 1}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-joy-mist flex items-center justify-center text-3xl">
                ✨
              </div>
              <p className="font-display font-semibold text-xl text-joy-navy">
                Nothing here yet.
              </p>
              <p className="font-body text-joy-muted text-sm">
                Try adjusting your filters to find what you're looking for.
              </p>
              <button
                onClick={clearFilters}
                className="bg-joy-cobalt text-white px-6 py-3 rounded-xl font-display font-bold text-sm hover:bg-joy-cobalt/90 transition-colors shadow-[0_4px_16px_rgba(45,91,227,0.3)]"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isMobileFiltersOpen && (
          <>
            <m.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink-black/40 z-[1000]"
              onClick={() => setIsMobileFiltersOpen(false)}
            />
            <m.div
              initial={reduced ? { opacity: 0 } : { y: "100%" }}
              animate={reduced ? { opacity: 1 } : { y: 0 }}
              exit={reduced ? { opacity: 0 } : { y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 h-[82vh] bg-joy-cream z-[1001] flex flex-col overflow-hidden rounded-t-3xl shadow-[0_-20px_60px_rgba(26,31,58,0.15)]"
            >
              <div className="flex justify-between items-center px-6 py-5 border-b border-joy-rule">
                <h2 className="font-display font-bold text-xl text-joy-navy">Filters</h2>
                <button onClick={() => setIsMobileFiltersOpen(false)} className="text-joy-muted hover:text-joy-navy transition-colors bg-joy-mist p-2 rounded-xl">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="font-body text-sm font-medium text-ink-black">Sort by</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "featured", label: "Featured" },
                      { value: "newest", label: "Newest" },
                      { value: "price-low", label: "Price ↑" },
                      { value: "price-high", label: "Price ↓" },
                    ].map((opt) => (
                      <FilterPill
                        key={opt.value}
                        label={opt.label}
                        selected={sortBy === opt.value}
                        onClick={() => setSortBy(opt.value)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-body text-sm font-medium text-ink-black">Category</h3>
                  <div className="flex flex-wrap gap-2">
                    <FilterPill label="All" selected={!categoryParam} onClick={() => updateFilters("category", null)} />
                    {categories.map((cat) => (
                      <FilterPill
                        key={cat.slug}
                        label={cat.name}
                        selected={categoryParam === cat.name}
                        onClick={() => updateFilters("category", categoryParam === cat.name ? null : cat.name)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-body text-sm font-medium text-ink-black">Age Range</h3>
                  <div className="flex flex-wrap gap-2">
                    {ageRanges.map((age) => (
                      <FilterPill
                        key={age}
                        label={`${age} yrs`}
                        selected={ageParam === age}
                        onClick={() => updateFilters("age", ageParam === age ? null : age)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-joy-rule bg-white space-y-3">
                <button
                  className="w-full bg-joy-cobalt text-white font-display font-bold text-sm py-4 rounded-xl hover:bg-joy-cobalt/90 transition-colors shadow-[0_4px_16px_rgba(45,91,227,0.3)]"
                  onClick={() => setIsMobileFiltersOpen(false)}
                >
                  View {filteredProducts.length} {filteredProducts.length === 1 ? "Product" : "Products"}
                </button>
                {(categoryParam || ageParam) && (
                  <button
                    onClick={() => { clearFilters(); setIsMobileFiltersOpen(false); }}
                    className="w-full py-2 font-display font-semibold text-sm text-joy-coral hover:opacity-70 transition-opacity"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShopContent({ initialProducts }: { initialProducts: any[] }) {
  const searchParams = useSearchParams();

  return (
    <ShopGridPure
      initialProducts={initialProducts}
      categoryParam={searchParams.get("category")}
      ageParam={searchParams.get("age")}
      searchParam={searchParams.get("search")}
    />
  );
}

export default function ShopClient({ initialProducts }: { initialProducts: any[] }) {
  return (
    <Suspense
      fallback={
        <ShopGridPure
          initialProducts={initialProducts}
          categoryParam={null}
          ageParam={null}
          searchParam={null}
        />
      }
    >
      <ShopContent initialProducts={initialProducts} />
    </Suspense>
  );
}
