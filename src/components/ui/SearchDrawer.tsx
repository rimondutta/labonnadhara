"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, ArrowRight, PackageX } from "lucide-react";
import Button from "@/components/ui/Button";
import { trackSearch } from "@/lib/fbPixel";

export interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickTags = ["Kid Toy", "", "Sneakers", "Jackets", "Accessories"];

export default function SearchDrawer({ isOpen, onClose }: SearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);

  // Fetch featured products on mount
  useEffect(() => {
    fetch("/api/store/products?limit=4")
      .then((r) => r.json())
      .then((d) => setFeatured(d.products || []))
      .catch(() => { });
  }, []);

  // Fetch search results with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/store/products?search=${encodeURIComponent(query)}`)
        .then((d) => {
          setResults(d.products || []);
          if (d.products?.length > 0) {
            try { trackSearch(query); } catch { /* noop */ }
          }
        })
        .catch(() => { });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset query when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setQuery(""), 300); // Wait for exit animation
    }
  }, [isOpen]);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog open={isOpen} onClose={onClose} className="relative z-[1000]">
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-300 ease-out"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200 ease-in"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        {/* Drawer Panel */}
        <TransitionChild
          as={Fragment}
          enter="transform transition duration-300 ease-out"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="transform transition duration-200 ease-in"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <DialogPanel className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Search</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close search"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Search Input Area */}
            <div className="px-6 py-6 border-b border-gray-100 bg-gray-50/50">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors">
                  <Search size={20} strokeWidth={2} />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What are you looking for?"
                  className="w-full bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-2xl py-4 pl-12 pr-12 text-base outline-none focus:border-black focus:ring-1 focus:ring-black shadow-sm transition-all"
                  autoFocus
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {/* Quick Tags */}
              <div className="flex flex-wrap gap-2 mt-5">
                {quickTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:border-black hover:text-black hover:shadow-sm transition-all active:scale-95"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
              {query.trim() === "" ? (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">Featured Drops</h3>
                  <div className="flex flex-col gap-2">
                    {featured.map((product) => (
                      <Link
                        key={product._id}
                        href={`/products/${product.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-4 p-3 -mx-3 rounded-2xl hover:bg-gray-50 group transition-all"
                      >
                        <div className="w-16 h-16 relative overflow-hidden bg-gray-100 rounded-xl shrink-0">
                          <Image
                            src={(product.images?.[0]?.url) ? product.images[0].url : "/placeholder.jpg"}
                            alt={product.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="64px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-black transition-colors">{product.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">৳{Math.round(product.price).toLocaleString()}</span>
                            {product.compareAtPrice && product.compareAtPrice > product.price && (
                              <span className="text-xs text-gray-400 line-through">৳{Math.round(product.compareAtPrice).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-sm">
                          <ArrowRight size={14} className="text-gray-900" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                      Results for "{query}"
                    </h3>
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {results.length} found
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {results.map((product) => (
                      <Link
                        key={product._id}
                        href={`/products/${product.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-4 p-3 -mx-3 rounded-2xl hover:bg-gray-50 group transition-all"
                      >
                        <div className="w-16 h-16 relative overflow-hidden bg-gray-100 rounded-xl shrink-0">
                          <Image
                            src={(product.images?.[0]?.url) ? product.images[0].url : "/placeholder.jpg"}
                            alt={product.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="64px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-black transition-colors">{product.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">৳{Math.round(product.price).toLocaleString()}</span>
                            {product.compareAtPrice && product.compareAtPrice > product.price && (
                              <span className="text-xs text-gray-400 line-through">৳{Math.round(product.compareAtPrice).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-sm">
                          <ArrowRight size={14} className="text-gray-900" />
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link href={`/products?search=${query}`} onClick={onClose} className="block w-full pt-4">
                    <Button variant="outline" className="w-full rounded-xl py-6 font-medium text-sm">
                      View All Results
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                  <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-4">
                    <PackageX size={32} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No results found</h3>
                  <p className="text-sm text-gray-500">
                    We couldn't find anything for "<span className="text-gray-900 font-medium">{query}</span>". Try adjusting your search.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
              <Link href="/products" onClick={onClose} className="block">
                <Button className="w-full bg-black text-white hover:bg-gray-800 rounded-xl py-6 font-medium">
                  Browse All Products
                </Button>
              </Link>
            </div>

          </DialogPanel>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}