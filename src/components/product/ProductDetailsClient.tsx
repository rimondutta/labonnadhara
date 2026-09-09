"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
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
    <div className="bg-white min-h-screen text-[#1a1208] font-body pb-16">

      {/* ═══ PRODUCT SHOWCASE ═══ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-[88px]">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 py-4 mb-2 text-[11px] uppercase tracking-[0.12em] text-[#9b8f85]">
          <NavLink href="/">Home</NavLink>
          <span>/</span>
          <NavLink href="/products">Shop</NavLink>
          <span>/</span>
          <span className="text-[#1a1208]">{product.category?.name || "Jewelry"}</span>
        </nav>

        {/* Main two-column layout */}
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-10 xl:gap-16">

          {/* ── LEFT: Gallery ── */}
          <div className="w-full lg:w-[58%] flex flex-col md:flex-row gap-3 lg:sticky lg:top-20 h-fit">

            {/* Desktop thumbnails — left column */}
            {currentGallery.length > 1 && (
              <div className="hidden md:flex flex-col gap-2 w-[64px] shrink-0">
                {currentGallery.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={cn(
                      "relative w-[64px] h-[64px] overflow-hidden border transition-all duration-200",
                      activeImage === idx
                        ? "border-[#1a1208]"
                        : "border-transparent opacity-55 hover:opacity-90 hover:border-[#d4c9bf]"
                    )}
                  >
                    <Image src={img.url} alt={img.alt || "Thumbnail"} fill className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
            )}

            {/* Main image — no border-radius */}
            <div className="relative flex-1 aspect-square md:aspect-[4/5] bg-[#f5f2ee] overflow-hidden">
              {currentGallery[activeImage] && (
                <Image
                  src={currentGallery[activeImage].url}
                  alt={currentGallery[activeImage].alt || product.title}
                  fill
                  className="object-cover transition-opacity duration-300"
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
              )}

              {/* Arrow navigation */}
              {totalImages > 1 && (
                <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 flex justify-between px-3 pointer-events-none">
                  <button
                    onClick={prevImage}
                    className="w-9 h-9 bg-white/90 backdrop-blur-sm flex items-center justify-center pointer-events-auto hover:bg-white shadow-sm transition-all"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={16} className="text-[#1a1208]" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="w-9 h-9 bg-white/90 backdrop-blur-sm flex items-center justify-center pointer-events-auto hover:bg-white shadow-sm transition-all"
                    aria-label="Next image"
                  >
                    <ChevronRight size={16} className="text-[#1a1208]" />
                  </button>
                </div>
              )}

              {/* Out of stock badge */}
              {currentInventory !== undefined && currentInventory <= 0 && (
                <div className="absolute top-4 left-4 bg-[#1a1208] text-white font-display font-semibold text-[10px] px-3 py-1 uppercase tracking-widest">
                  Sold Out
                </div>
              )}
            </div>

            {/* Mobile thumbnails */}
            {currentGallery.length > 1 && (
              <div className="flex md:hidden gap-2 overflow-x-auto no-scrollbar pb-2">
                {currentGallery.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={cn(
                      "relative w-14 h-14 shrink-0 border transition-all duration-200 overflow-hidden",
                      activeImage === idx ? "border-[#1a1208]" : "border-transparent opacity-50"
                    )}
                  >
                    <Image src={img.url} alt={img.alt || "Thumbnail"} fill className="object-cover" sizes="56px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Info panel ── */}
          <div className="w-full lg:w-[42%] flex flex-col pt-2">

            {/* "New" badge */}
            {product.isNew && (
              <span className="inline-block border border-[#1a1208] text-[#1a1208] font-body text-[10px] uppercase tracking-[0.15em] px-2.5 py-1 mb-4 w-fit">
                New
              </span>
            )}

            {/* Product title — serif */}
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 }}
              className="text-[1.65rem] md:text-[2rem] leading-[1.2] text-[#1a1208] mb-4 tracking-tight">
              {product.title}
            </h1>

            {/* Star rating */}
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      className={i < Math.floor(product.rating || 0) ? "fill-[#c9a84c] text-[#c9a84c]" : "fill-[#e0d9d2] text-[#e0d9d2]"}
                    />
                  ))}
                </div>
                <a href="#reviews" className="font-body text-xs text-[#9b8f85] hover:text-[#1a1208] transition-colors underline underline-offset-2">
                  {product.reviewCount} reviews
                </a>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-[1.4rem] font-semibold text-[#1a1208]">
                ৳{currentPrice.toLocaleString()}
              </span>
              {hasDiscount && effectiveComparePrice && (
                <span className="text-sm text-[#9b8f85] line-through">৳{effectiveComparePrice.toLocaleString()}</span>
              )}
              {hasDiscount && (
                <span className="text-xs text-white bg-[#b33a2a] font-semibold px-2 py-0.5">
                  -{discountPercentage}%
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#e8e2db] mb-6" />

            {/* Variations */}
            {product.hasVariations && variationGroups && variationGroups.length > 0 && (
              <div className="flex flex-col gap-6 mb-6">
                {variationGroups.map((vt: any) => (
                  <div key={vt._id}>
                    {/* Label row */}
                    <p className="font-body text-xs uppercase tracking-[0.12em] text-[#9b8f85] mb-3">
                      {vt.name}
                      {selectedOptions[vt._id] && (
                        <span className="text-[#1a1208] font-semibold normal-case ml-2">
                          {vt.values.find((val: any) => val._id === selectedOptions[vt._id])?.value}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {vt.values.map((val: any) => {
                        const isSelected = selectedOptions[vt._id] === val._id;
                        if (vt.displayType === 'swatch' && val.colorHex) {
                          return (
                            <button
                              key={val._id}
                              onClick={() => setSelectedOptions(p => ({ ...p, [vt._id]: val._id }))}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 transition-all duration-200",
                                isSelected ? "border-[#1a1208] scale-110 shadow-md" : "border-transparent hover:scale-105"
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
                              "px-4 py-2 font-body text-sm border transition-all duration-200",
                              isSelected
                                ? "bg-[#1a1208] text-white border-[#1a1208]"
                                : "bg-white text-[#1a1208] border-[#d4c9bf] hover:border-[#1a1208]"
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
            <div className="flex items-center justify-end mb-5">
              <button className="flex items-center gap-1 text-[11px] text-[#1a1208] uppercase tracking-[0.1em] underline underline-offset-2 hover:opacity-70 transition-opacity">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 3H3v18h18V3z"/><path d="M9 3v4M12 3v2M15 3v4M3 9h4M3 12h2M3 15h4"/></svg>
                Size Guide
              </button>
            </div>

            {/* Quantity selector */}
            <div className="mb-3">
              <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#9b8f85] mb-2">Quantity</p>
              <div className="flex items-center border border-[#d4c9bf] w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2.5 font-body text-lg text-[#1a1208] hover:bg-[#f5f2ee] transition-colors leading-none"
                  aria-label="Decrease quantity"
                >−</button>
                <span className="w-10 text-center font-body text-sm text-[#1a1208]">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2.5 font-body text-lg text-[#1a1208] hover:bg-[#f5f2ee] transition-colors leading-none"
                  aria-label="Increase quantity"
                >+</button>
              </div>
            </div>

            {/* Add to Bag — full width dark green */}
            <button
              onClick={handleAddToCart}
              disabled={currentInventory <= 0}
              className="w-full py-4 bg-[#043224] text-white font-body font-semibold text-sm uppercase tracking-[0.12em] hover:bg-[#032a1e] disabled:opacity-60 transition-colors mb-3"
            >
              {currentInventory <= 0 ? "Out of Stock" : "Add to Bag"}
            </button>

            {/* Buy Now */}
            <button
              onClick={handleBuyNow}
              disabled={currentInventory <= 0}
              className="w-full py-4 bg-white text-[#1a1208] font-body font-semibold text-sm uppercase tracking-[0.12em] border border-[#1a1208] hover:bg-[#f5f2ee] disabled:opacity-60 transition-colors mb-4"
            >
              Buy Now
            </button>

            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-[#25D366] text-white font-body font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-colors mb-5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
              </svg>
              Chat on WhatsApp
            </a>

            {/* Divider */}
            <div className="h-px bg-[#e8e2db] mb-5" />

            {/* Q&A card */}
            <div className="bg-[#f9f7f4] border border-[#e8e2db] p-5 mb-5">
              <p className="font-body text-xs text-[#9b8f85] uppercase tracking-[0.12em] mb-3">Question about this product? Ask away!</p>
              <div className="flex flex-col gap-2 mb-3">
                {[
                  "Can I adjust the length of this item?",
                  "What material is it made from?",
                  "Is gift wrapping available?",
                ].map((q) => (
                  <button
                    key={q}
                    className="text-left text-xs text-[#43392f] bg-white border border-[#e8e2db] px-3 py-2 hover:border-[#1a1208] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#043224] uppercase tracking-[0.1em] hover:opacity-70 transition-opacity"
              >
                Ask Us →
              </a>
            </div>

            {/* Wishlist toggle */}
            <button
              onClick={handleWishlistClick}
              className={cn(
                "flex items-center gap-2 font-body text-sm transition-colors mb-5 group",
                wishlisted ? "text-[#b33a2a]" : "text-[#9b8f85] hover:text-[#1a1208]"
              )}
            >
              <svg width="15" height="15" fill={wishlisted ? "#b33a2a" : "none"} stroke={wishlisted ? "#b33a2a" : "currentColor"} strokeWidth="1.6" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {wishlisted ? "Wishlisted" : "Add to Wishlist"}
            </button>

            {/* Trust bar — shipping & returns */}
            <div className="border border-[#e8e2db] divide-y divide-[#e8e2db]">
              <div className="flex items-center gap-3 px-4 py-3">
                <Truck className="w-4 h-4 text-[#9b8f85] shrink-0" />
                <p className="font-body text-xs text-[#43392f]">Free shipping on orders over ৳1,500</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <RefreshCcw className="w-4 h-4 text-[#9b8f85] shrink-0" />
                <p className="font-body text-xs text-[#43392f]">Easy 30-day returns</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <svg className="w-4 h-4 text-[#9b8f85] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <p className="font-body text-xs text-[#43392f]">Authenticity guaranteed</p>
              </div>
            </div>

            {/* Meta — SKU / Category */}
            <div className="mt-5 flex flex-col gap-1.5">
              <p className="font-body text-xs text-[#9b8f85]">
                SKU: <span className="text-[#1a1208]">{(product._id || "").slice(-6).toUpperCase()}</span>
              </p>
              {product.category?.name && (
                <p className="font-body text-xs text-[#9b8f85]">
                  Category: <Link href="/products" className="text-[#1a1208] hover:underline">{product.category.name}</Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TABS — Description & Reviews ═══ */}
      <section id="reviews" className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-14 md:py-20 border-t border-[#e8e2db]">
        <div className="max-w-[960px]">

          {/* Tab headers */}
          <div className="flex gap-2 mb-12">
            {[
              { key: "description", label: "Description" },
              { key: "reviews", label: `Reviews${product.reviewCount ? ` (${product.reviewCount})` : ""}` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "px-5 py-2.5 font-display font-bold text-sm rounded-xl transition-all duration-200",
                  activeTab === key
                    ? "bg-[#D5AEFD] text-black shadow-[0_4px_12px_rgba(213,174,253,0.3)]"
                    : "bg-joy-mist text-joy-muted hover:text-joy-navy"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-[300px]">
            {/* Description */}
            {activeTab === "description" && (
              <div>
                <div className="mb-8">
                  <h3 className="font-display font-bold text-2xl text-joy-navy mb-4">{product.title}</h3>
                  <p className="font-body text-sm text-joy-navy leading-relaxed">{product.description}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="font-display font-bold text-sm text-joy-navy mb-3">Why This Product?</h4>
                    <ul className="list-none space-y-2">
                      {["Non-toxic, child-safe materials", "Open-ended, creative play", "Sustainably sourced & eco-friendly"].map(f => (
                        <li key={f} className="font-body text-sm text-joy-navy flex gap-2">
                          <span className="text-joy-cobalt mt-0.5">✓</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-joy-navy mb-3">Product Details</h4>
                    <p className="font-body text-sm text-joy-navy leading-relaxed">
                      {product.longDescription || "Experience the perfect blend of fun and learning. Made from premium, child-safe materials, it stands up to enthusiastic play and looks beautiful in any playroom."}
                    </p>
                  </div>
                </div>
                <div className="bg-joy-mist rounded-2xl p-6 mt-4">
                  <h4 className="font-display font-bold text-sm text-joy-navy mb-4">Shipping & Returns</h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <Truck className="w-5 h-5 text-joy-cobalt shrink-0 mt-0.5" />
                      <p className="font-body text-sm text-joy-navy">Free standard shipping on orders over ৳1,500.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <RefreshCcw className="w-5 h-5 text-joy-cobalt shrink-0 mt-0.5" />
                      <p className="font-body text-sm text-joy-navy">Return within 30 days of receiving your order.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews */}
            {activeTab === "reviews" && (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-start">

                  {/* Rating summary */}
                  <div className="flex flex-col items-center justify-center bg-joy-mist p-10 rounded-2xl w-full md:w-auto min-w-[240px]">
                    <span className="font-display font-bold text-7xl text-joy-navy leading-none mb-3">{product.rating || 0}</span>
                    <div className="flex mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={20} className={i < Math.floor(product.rating || 0) ? "fill-joy-sun text-joy-sun" : "fill-joy-rule text-joy-rule"} />
                      ))}
                    </div>
                    <span className="font-display font-medium text-sm text-joy-muted">
                      {product.reviewCount || 0} reviews
                    </span>
                    {!isWritingReview && (
                      <button
                        onClick={() => setIsWritingReview(true)}
                        className="mt-6 w-full py-3 px-4 bg-joy-cobalt text-white font-display font-bold text-sm rounded-xl hover:bg-joy-cobalt/90 transition-colors shadow-[0_4px_12px_rgba(45,91,227,0.3)]"
                      >
                        Write a Review
                      </button>
                    )}
                  </div>

                  {/* Reviews list + form */}
                  <div className="flex-1 w-full space-y-8">
                    {isWritingReview && (
                      <form onSubmit={submitReview} className="bg-joy-mist p-6 md:p-8 space-y-5 rounded-2xl border border-joy-rule">
                        <div className="flex justify-between items-center">
                          <h3 className="font-display font-bold text-xl text-joy-navy">Write a Review</h3>
                          <button type="button" onClick={() => setIsWritingReview(false)} className="font-display font-semibold text-sm text-joy-muted hover:text-joy-navy transition-colors">Cancel</button>
                        </div>
                        <div>
                          <label className="block font-display font-semibold text-sm text-joy-navy mb-2">Rating *</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                type="button"
                                key={star}
                                onClick={() => setReviewForm(p => ({ ...p, rating: star }))}
                                className="transition-transform hover:scale-110"
                              >
                                <Star size={24} className={star <= reviewForm.rating ? "fill-joy-sun text-joy-sun" : "fill-joy-rule text-joy-rule"} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block font-display font-semibold text-sm text-joy-navy mb-1.5">Name</label>
                            <input required type="text" value={reviewForm.name}
                              onChange={e => setReviewForm(p => ({ ...p, name: e.target.value }))}
                              className="w-full border-2 border-joy-rule rounded-xl px-4 py-3 font-body text-sm text-joy-navy bg-white outline-none focus:border-joy-cobalt transition-colors"
                              placeholder="Your name" />
                          </div>
                          <div>
                            <label className="block font-display font-semibold text-sm text-joy-navy mb-1.5">Review Title</label>
                            <input required type="text" value={reviewForm.title}
                              onChange={e => setReviewForm(p => ({ ...p, title: e.target.value }))}
                              className="w-full border-2 border-joy-rule rounded-xl px-4 py-3 font-body text-sm text-joy-navy bg-white outline-none focus:border-joy-cobalt transition-colors"
                              placeholder="Summarize your experience" />
                          </div>
                        </div>
                        {/* Auto-filled text area and submit block to finish truncated code */}
                        <div>
                          <label className="block font-display font-semibold text-sm text-joy-navy mb-1.5">Review</label>
                          <textarea required value={reviewForm.text}
                            onChange={e => setReviewForm(p => ({ ...p, text: e.target.value }))}
                            className="w-full border-2 border-joy-rule rounded-xl px-4 py-3 font-body text-sm text-joy-navy bg-white outline-none focus:border-joy-cobalt transition-colors min-h-[120px]"
                            placeholder="Tell us what you think..." />
                        </div>
                        <button
                          type="submit"
                          disabled={isSubmittingReview}
                          className="w-full py-4 bg-joy-navy text-white font-display font-bold text-sm rounded-xl hover:bg-joy-navy/90 disabled:opacity-70 transition-colors"
                        >
                          {isSubmittingReview ? "Submitting..." : "Submit Review"}
                        </button>
                      </form>
                    )}
                    {/* Existing Reviews */}
                    {product.reviews && product.reviews.length > 0 ? (
                      <div className="space-y-6">
                        {product.reviews
                          .filter((r: any) => r.status !== 'pending')
                          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((review: any, i: number) => (
                          <div key={i} className="bg-white p-6 rounded-2xl border border-joy-rule">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-display font-bold text-lg text-joy-navy">{review.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex">
                                    {[...Array(5)].map((_, idx) => (
                                      <Star
                                        key={idx}
                                        size={14}
                                        className={idx < review.rating ? "fill-joy-sun text-joy-sun" : "fill-joy-rule text-joy-rule"}
                                      />
                                    ))}
                                  </div>
                                  <span className="font-body text-xs text-joy-muted">
                                    by {review.name} • {new Date(review.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="font-body text-sm text-joy-navy leading-relaxed">
                              {review.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !isWritingReview && (
                        <div className="bg-joy-mist p-8 rounded-2xl text-center">
                          <p className="font-body text-joy-muted mb-4">No reviews yet. Be the first to share your experience!</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}