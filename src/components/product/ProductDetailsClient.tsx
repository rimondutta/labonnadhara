"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { useCart } from "@/components/providers/CartProvider";
import { useWishlist } from "@/store/wishlistStore";
import { useToast } from "@/components/playshelf/Toast";
import ProductGridNike from "@/components/ui/product-grid-nike";
import { Star, Truck, RefreshCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackViewContent, trackAddToCart, trackAddToWishlist } from "@/lib/fbPixel";

// ─── Breadcrumb underline link ───
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="relative group font-mono text-[11px] uppercase tracking-[0.1em] text-ink-black">
      {children}
      <span className="absolute -bottom-0.5 left-0 h-[1px] bg-ink-black w-[50%] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full" />
    </Link>
  );
}

export default function ProductDetailsClient({ product: initialProduct, relatedProducts }: { product: any; relatedProducts?: any[] }) {
  const router = useRouter();
  const { addItem, openCart } = useCart();
  const { showToast } = useToast();
  const { toggleItem, isWishlisted } = useWishlist();
  const reduced = useReducedMotion() ?? false;

  const product = initialProduct;
  const wishlisted = isWishlisted(product._id);

  // Track ViewContent when the product page is viewed
  useEffect(() => {
    try {
      trackViewContent(product);
    } catch {
      // Never let pixel errors crash the page
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id]);

  const handleWishlistClick = () => {
    toggleItem(product._id);
    if (!wishlisted) {
      showToast("Added to wishlist!", "success");
      try { trackAddToWishlist(product); } catch { /* noop */ }
    } else {
      showToast("Removed from wishlist", "info");
    }
  };

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState("description");

  // Size Guide State
  const [sizeGuide, setSizeGuide] = useState<{ enabled: boolean; content: string } | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  useEffect(() => {
    fetch("/api/settings/size-guide")
      .then(res => res.json())
      .then(data => {
        if (data.sizeGuide) setSizeGuide(data.sizeGuide);
      })
      .catch(console.error);
  }, []);

  // Variations State
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Find matching variant based on selected options
  const matchingVariant = product.hasVariations && product.variants?.length > 0
    ? product.variants.find((v: any) =>
      v.isActive &&
      v.combination.every((c: any) =>
        selectedOptions[c.variationType._id] === c.variationValue._id
      )
    )
    : null;

  // Initialize default options
  useEffect(() => {
    if (product.hasVariations && product.variants?.length > 0 && Object.keys(selectedOptions).length === 0) {
      const firstActiveVariant = product.variants.find((v: any) => v.isActive && v.stock > 0) || product.variants.find((v: any) => v.isActive) || product.variants[0];
      if (firstActiveVariant) {
        const defaults: Record<string, string> = {};
        firstActiveVariant.combination.forEach((c: any) => {
          defaults[c.variationType._id] = c.variationValue._id;
        });
        setSelectedOptions(defaults);

        // If variant has its own images, set active image to 0 to show it
        if (firstActiveVariant.images && firstActiveVariant.images.length > 0) {
          setActiveImage(0);
        }
      }
    }
  }, [product.hasVariations, product.variants, selectedOptions]);

  const [isWritingReview, setIsWritingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", text: "", name: "" });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product._id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm)
      });
      if (!res.ok) throw new Error("Failed to submit review");
      showToast("Review submitted successfully!", "success");
      setIsWritingReview(false);
      setReviewForm({ rating: 5, title: "", text: "", name: "" });
      router.refresh();
    } catch {
      showToast("Error submitting review. Please try again.", "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAddToCart = () => {
    addItem({
      id: product._id,
      slug: product.slug,
      title: matchingVariant?.combinationLabel ? `${product.title} - ${matchingVariant.combinationLabel}` : product.title,
      price: matchingVariant ? matchingVariant.price : product.price,
      quantity,
      image: matchingVariant?.images?.[0] || product.images?.[0]?.url || "/placeholder.jpg",
      variantId: matchingVariant?._id
    });
    try { trackAddToCart(product, quantity); } catch { /* noop */ }
    showToast(`Added ${quantity} to your bag!`, "success");
    openCart();
  };

  const handleBuyNow = () => {
    addItem({
      id: product._id,
      slug: product.slug,
      title: matchingVariant?.combinationLabel ? `${product.title} - ${matchingVariant.combinationLabel}` : product.title,
      price: matchingVariant ? matchingVariant.price : product.price,
      quantity,
      image: matchingVariant?.images?.[0] || product.images?.[0]?.url || "/placeholder.jpg",
      variantId: matchingVariant?._id
    });
    try { trackAddToCart(product, quantity); } catch { /* noop */ }
    router.push("/checkout");
  };

  const WHATSAPP_NUMBER = "8801616921965";
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi! I'm interested in the ${encodeURIComponent(product.title)}. Is it available?`;

  // Determine final price and static discount based on database fields
  const currentPrice = matchingVariant ? matchingVariant.price : product.price;
  const currentComparePrice = matchingVariant?.comparePrice || product.compareAtPrice;
  const currentInventory = matchingVariant ? matchingVariant.stock : product.inventory;

  // Use actual discount logic (strictly derived from standard database prices)
  const hasDiscount = Boolean(currentComparePrice && currentComparePrice > currentPrice);

  const discountPercentage = hasDiscount
    ? Math.round(((currentComparePrice - currentPrice) / currentComparePrice) * 100)
    : 0;

  const effectiveComparePrice = currentComparePrice;

  // Determine current image gallery (variant images override product images if they exist)
  const currentGallery = matchingVariant?.images?.length > 0
    ? matchingVariant.images.map((url: string) => ({ url, alt: product.title }))
    : product.images || [];

  const totalImages = currentGallery.length || 0;
  const prevImage = () => setActiveImage(activeImage === 0 ? totalImages - 1 : activeImage - 1);
  const nextImage = () => setActiveImage(activeImage === totalImages - 1 ? 0 : activeImage + 1);

  // Group variation values for rendering UI
  const variationGroups = product.hasVariations ? product.variationTypes?.map((vt: any) => {
    // Find all unique values for this type across all active variants
    const uniqueValues = new Map();
    product.variants?.forEach((v: any) => {
      if (!v.isActive) return;
      const c = v.combination.find((combo: any) => combo.variationType._id === vt._id);
      if (c && !uniqueValues.has(c.variationValue._id)) {
        uniqueValues.set(c.variationValue._id, c.variationValue);
      }
    });
    return { ...vt, values: Array.from(uniqueValues.values()) };
  }) : [];

  return (
    <div className="bg-white min-h-screen text-black font-sans pb-16">

      {/* ═══ PRODUCT SHOWCASE ═══ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-[88px]">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 py-4 mb-4 text-xs tracking-widest text-gray-500 uppercase">
          <NavLink href="/">Home</NavLink>
          <span>/</span>
          <NavLink href="/products">Shop</NavLink>
          <span>/</span>
          <span className="text-black">{product.category?.name || "Jewelry"}</span>
        </nav>

        {/* Main two-column layout */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 xl:gap-20">

          {/* ── LEFT: Gallery ── */}
          <div className="w-full lg:w-[55%] flex flex-col md:flex-row gap-4 lg:sticky lg:top-24 h-fit">

            {/* Desktop thumbnails — left column */}
            {currentGallery.length > 1 && (
              <div className="hidden md:flex flex-col gap-3 w-[72px] shrink-0">
                {currentGallery.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={cn(
                      "relative w-[72px] h-[90px] overflow-hidden transition-all duration-300",
                      activeImage === idx
                        ? "ring-1 ring-black ring-offset-2"
                        : "opacity-60 hover:opacity-100"
                    )}
                  >
                    <Image src={img.url} alt={img.alt || "Thumbnail"} fill className="object-cover" sizes="72px" />
                  </button>
                ))}
              </div>
            )}

            {/* Main image */}
            <div className="relative flex-1 aspect-[4/5] bg-gray-50 overflow-hidden">
              {currentGallery[activeImage] && (
                <Image
                  src={currentGallery[activeImage].url}
                  alt={currentGallery[activeImage].alt || product.title}
                  fill
                  className="object-cover transition-opacity duration-300"
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
              )}

              {/* Arrow navigation */}
              {totalImages > 1 && (
                <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 flex justify-between px-4 pointer-events-none">
                  <button
                    onClick={prevImage}
                    className="w-10 h-10 bg-white/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto hover:bg-white shadow-sm rounded-full transition-all"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={20} className="text-black" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="w-10 h-10 bg-white/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto hover:bg-white shadow-sm rounded-full transition-all"
                    aria-label="Next image"
                  >
                    <ChevronRight size={20} className="text-black" />
                  </button>
                </div>
              )}

              {/* Out of stock badge */}
              {currentInventory !== undefined && currentInventory <= 0 && (
                <div className="absolute top-4 left-4 bg-black text-white font-semibold text-[10px] px-3 py-1.5 uppercase tracking-widest">
                  Sold Out
                </div>
              )}
            </div>

            {/* Mobile thumbnails */}
            {currentGallery.length > 1 && (
              <div className="flex md:hidden gap-3 overflow-x-auto no-scrollbar pb-2">
                {currentGallery.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={cn(
                      "relative w-16 h-20 shrink-0 transition-all duration-300 overflow-hidden",
                      activeImage === idx ? "ring-1 ring-black ring-offset-1" : "opacity-60"
                    )}
                  >
                    <Image src={img.url} alt={img.alt || "Thumbnail"} fill className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Info panel ── */}
          <div className="w-full lg:w-[42%] flex flex-col pt-2">

            {/* "New" badge */}
            {product.isNew && (
              <span className="inline-block border border-black text-black text-[10px] uppercase tracking-widest px-3 py-1 mb-4 w-fit">
                New Arrival
              </span>
            )}

            {/* Product title */}
            <h1 className="text-3xl md:text-4xl text-black mb-4 tracking-tight font-medium">
              {product.title}
            </h1>

            {/* Star rating */}
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < Math.floor(product.rating || 0) ? "fill-black text-black" : "fill-gray-200 text-gray-200"}
                    />
                  ))}
                </div>
                <a href="#reviews" className="text-sm text-gray-500 hover:text-black transition-colors underline underline-offset-4">
                  {product.reviewCount} reviews
                </a>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl font-medium text-black">
                ৳{currentPrice.toLocaleString()}
              </span>
              {hasDiscount && effectiveComparePrice && (
                <span className="text-lg text-gray-400 line-through">৳{effectiveComparePrice.toLocaleString()}</span>
              )}
              {hasDiscount && (
                <span className="text-xs text-white bg-black font-semibold px-2.5 py-1 uppercase tracking-widest">
                  Save {discountPercentage}%
                </span>
              )}
            </div>

            {/* Short Description */}
            {product.description && (
              <div className="mb-6 text-sm text-gray-600 leading-relaxed line-clamp-3">
                {product.description}
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-gray-200 mb-6" />

            {/* Variations */}
            {product.hasVariations && variationGroups && variationGroups.length > 0 && (
              <div className="flex flex-col gap-6 mb-6">
                {variationGroups.map((vt: any) => (
                  <div key={vt._id}>
                    {/* Label row */}
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">
                      {vt.name}
                      {selectedOptions[vt._id] && (
                        <span className="text-black font-medium normal-case ml-2">
                          {vt.values.find((val: any) => val._id === selectedOptions[vt._id])?.value}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {vt.values.map((val: any) => {
                        const isSelected = selectedOptions[vt._id] === val._id;
                        if (vt.displayType === 'swatch' && val.colorHex) {
                          return (
                            <button
                              key={val._id}
                              onClick={() => setSelectedOptions(p => ({ ...p, [vt._id]: val._id }))}
                              className={cn(
                                "w-9 h-9 rounded-full border-2 transition-all duration-200",
                                isSelected ? "border-black scale-110 shadow-sm" : "border-transparent hover:scale-105"
                              )}
                              style={{ backgroundColor: val.colorHex }}
                              aria-label={val.value}
                            />
                          );
                        }
                        return (
                          <button
                            key={val._id}
                            onClick={() => setSelectedOptions(p => ({ ...p, [vt._id]: val._id }))}
                            className={cn(
                              "px-5 py-2.5 text-sm border transition-all duration-200",
                              isSelected
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-gray-300 hover:border-black"
                            )}
                          >
                            {val.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Size guide link */}
            {sizeGuide?.enabled && sizeGuide.content && (
              <div className="flex items-center justify-end mb-4">
                <button 
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-black uppercase tracking-widest underline underline-offset-4 hover:opacity-70 transition-opacity"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 3H3v18h18V3z"/><path d="M9 3v4M12 3v2M15 3v4M3 9h4M3 12h2M3 15h4"/></svg>
                  Size Guide
                </button>
              </div>
            )}

            {/* Quantity selector */}
            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Quantity</p>
              <div className="flex items-center border border-black w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-5 py-3 text-lg text-black hover:bg-gray-100 transition-colors leading-none"
                  aria-label="Decrease quantity"
                >−</button>
                <span className="w-12 text-center text-sm text-black font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-5 py-3 text-lg text-black hover:bg-gray-100 transition-colors leading-none"
                  aria-label="Increase quantity"
                >+</button>
              </div>
            </div>

            {/* Add to Bag — full width dark green */}
            <button
              onClick={handleAddToCart}
              disabled={currentInventory <= 0}
              className="w-full py-4 bg-black text-white font-medium text-sm uppercase tracking-widest hover:bg-gray-900 disabled:opacity-50 transition-colors mb-3"
            >
              {currentInventory <= 0 ? "Out of Stock" : "Add to Cart"}
            </button>

            {/* Buy Now */}
            <button
              onClick={handleBuyNow}
              disabled={currentInventory <= 0}
              className="w-full py-4 bg-black text-white font-medium text-sm uppercase tracking-widest border border-black hover:bg-gray-900 disabled:opacity-50 transition-colors mb-4"
            >
              Buy it Now
            </button>

            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-transparent border border-gray-200 text-black font-medium text-sm flex items-center justify-center gap-2 hover:border-black transition-colors mb-6"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
              </svg>
              Chat with an Expert
            </a>



            {/* Wishlist toggle */}
            <button
              onClick={handleWishlistClick}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors mb-6 group w-fit",
                wishlisted ? "text-black" : "text-gray-500 hover:text-black"
              )}
            >
              <svg width="16" height="16" fill={wishlisted ? "black" : "none"} stroke={wishlisted ? "black" : "currentColor"} strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="underline underline-offset-4">{wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}</span>
            </button>

            {/* Trust bar — shipping & returns */}
            <div className="bg-gray-50 p-5 rounded-sm">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-black shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-black">Free Shipping</p>
                    <p className="text-sm text-gray-500">On all orders over ৳1,500.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RefreshCcw className="w-5 h-5 text-black shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-black">Easy Returns</p>
                    <p className="text-sm text-gray-500">30-day return policy for unused items.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta — SKU / Category */}
            <div className="mt-6 mb-8 flex gap-6">
              <p className="text-xs text-gray-500">
                SKU: <span className="text-black">{(product._id || "").slice(-6).toUpperCase()}</span>
              </p>
              {product.category?.name && (
                <p className="text-xs text-gray-500">
                  Category: <Link href="/products" className="text-black hover:underline">{product.category.name}</Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TABS — Description & Reviews ═══ */}
      <section id="reviews" className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24 border-t border-gray-200">
        <div className="max-w-4xl mx-auto">

          {/* Tab headers */}
          <div className="flex gap-8 mb-12 border-b border-gray-200">
            {[
              { key: "description", label: "Description" },
              { key: "reviews", label: `Reviews${product.reviewCount ? ` (${product.reviewCount})` : ""}` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "py-4 text-sm tracking-widest uppercase transition-all duration-300 relative",
                  activeTab === key
                    ? "text-black font-semibold"
                    : "text-gray-500 hover:text-black"
                )}
              >
                {label}
                {activeTab === key && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-black" />
                )}
              </button>
            ))}
          </div>

          <div className="min-h-[300px]">
            {/* Description */}
            {activeTab === "description" && (
              <div className="animate-in fade-in duration-500">
                <div className="mb-10">
                  <p className="text-base text-gray-700 leading-relaxed max-w-3xl">{product.description}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-10 mb-10">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-black mb-4">Highlights</h4>
                    <ul className="space-y-3">
                      {["Premium materials", "Exquisite craftsmanship", "Ethically sourced"].map(f => (
                        <li key={f} className="text-sm text-gray-600 flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-black mb-4">Details</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {product.longDescription || "Experience the perfect blend of elegance and durability. Made from premium materials, it stands out beautifully on any occasion."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews */}
            {activeTab === "reviews" && (
              <div className="animate-in fade-in duration-500 space-y-12">
                <div className="flex flex-col md:flex-row gap-12 items-start border-b border-gray-200 pb-12">

                  {/* Rating summary */}
                  <div className="flex flex-col w-full md:w-1/3">
                    <h3 className="text-xl font-medium text-black mb-6">Customer Reviews</h3>
                    <div className="flex items-end gap-4 mb-4">
                      <span className="text-5xl font-medium text-black leading-none">{product.rating || 0}</span>
                      <div className="flex pb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={18} className={i < Math.floor(product.rating || 0) ? "fill-black text-black" : "fill-gray-200 text-gray-200"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-8">Based on {product.reviewCount || 0} reviews</p>
                    
                    {!isWritingReview && (
                      <button
                        onClick={() => setIsWritingReview(true)}
                        className="w-full py-4 border border-black text-black font-medium text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                      >
                        Write a Review
                      </button>
                    )}
                  </div>

                  {/* Reviews Form */}
                  {isWritingReview && (
                    <div className="w-full md:w-2/3 bg-gray-50 p-6 md:p-8 rounded-sm">
                      <form onSubmit={submitReview} className="space-y-6">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-lg font-medium text-black">Write a Review</h4>
                          <button type="button" onClick={() => setIsWritingReview(false)} className="text-sm text-gray-500 hover:text-black underline underline-offset-4">Cancel</button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">Rating</label>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                type="button"
                                key={star}
                                onClick={() => setReviewForm(p => ({ ...p, rating: star }))}
                                className="transition-transform hover:scale-110"
                              >
                                <Star size={24} className={star <= reviewForm.rating ? "fill-black text-black" : "fill-gray-200 text-gray-200"} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-medium text-black mb-2">Name</label>
                            <input required type="text" value={reviewForm.name}
                              onChange={e => setReviewForm(p => ({ ...p, name: e.target.value }))}
                              className="w-full border border-gray-300 px-4 py-3 text-sm text-black bg-white outline-none focus:border-black transition-colors"
                              placeholder="Your name" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black mb-2">Review Title</label>
                            <input required type="text" value={reviewForm.title}
                              onChange={e => setReviewForm(p => ({ ...p, title: e.target.value }))}
                              className="w-full border border-gray-300 px-4 py-3 text-sm text-black bg-white outline-none focus:border-black transition-colors"
                              placeholder="Summarize your experience" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">Review</label>
                          <textarea required value={reviewForm.text}
                            onChange={e => setReviewForm(p => ({ ...p, text: e.target.value }))}
                            className="w-full border border-gray-300 px-4 py-3 text-sm text-black bg-white outline-none focus:border-black transition-colors min-h-[120px] resize-y"
                            placeholder="Tell us what you think..." />
                        </div>
                        <button
                          type="submit"
                          disabled={isSubmittingReview}
                          className="w-full py-4 bg-black text-white font-medium text-sm uppercase tracking-widest hover:bg-gray-900 disabled:opacity-50 transition-colors"
                        >
                          {isSubmittingReview ? "Submitting..." : "Submit Review"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Existing Reviews List */}
                <div className="w-full pt-4">
                  {product.reviews && product.reviews.length > 0 ? (
                    <div className="space-y-10">
                      {product.reviews
                        .filter((r: any) => r.status !== 'pending')
                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((review: any, i: number) => (
                        <div key={i} className="border-b border-gray-100 pb-10 last:border-0">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex">
                              {[...Array(5)].map((_, idx) => (
                                <Star
                                  key={idx}
                                  size={14}
                                  className={idx < review.rating ? "fill-black text-black" : "fill-gray-200 text-gray-200"}
                                />
                              ))}
                            </div>
                            <h4 className="font-medium text-black">{review.title}</h4>
                          </div>
                          <span className="block text-xs text-gray-500 mb-4">
                            {review.name} on {new Date(review.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {review.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !isWritingReview && (
                      <div className="py-12 text-center">
                        <p className="text-gray-500 mb-4">No reviews yet. Be the first to share your experience!</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Size Guide Modal */}
      <Transition show={isSizeGuideOpen} as={Fragment}>
        <Dialog onClose={() => setIsSizeGuideOpen(false)} className="relative z-[999]">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden bg-white p-6 md:p-8 text-left align-middle shadow-2xl transition-all relative">
                  <button
                    onClick={() => setIsSizeGuideOpen(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                  >
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <h3 className="text-xl font-medium text-black mb-6 border-b border-gray-200 pb-4">
                    Size Guide
                  </h3>
                  <div 
                    className="prose prose-sm max-w-none text-gray-700 font-mono"
                    dangerouslySetInnerHTML={{ __html: sizeGuide?.content || '' }}
                  />
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}