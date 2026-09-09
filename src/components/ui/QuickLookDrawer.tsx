"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import Image from "next/image";
import { useQuickLook } from "@/store/quickLookStore";
import { useCart } from "@/components/providers/CartProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";
import Link from "next/link";
import { X, ShoppingBag, Heart, ArrowRight, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import QuantityStepper from "@/components/playshelf/QuantityStepper";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export default function QuickLookDrawer() {
  const { isOpen, product, closeQuickLook } = useQuickLook();
  const { addItem, openCart } = useCart();
  const { toggleItem, isWishlisted } = useWishlist();

  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setActiveImageIndex(0);
      setSelectedColor(product?.colors?.[0] || null);
      setSelectedSize(product?.sizes?.[0] || null);
      setQuantity(1);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const images = product.images?.map((img: any) => {
    const src = img.url || img.src || "";
    return src.length > 5 ? src : "/placeholder.jpg";
  }) || ["/placeholder.jpg"];

  const colors = product.colors || [];
  const sizes = product.sizes || [];
  const currentPrice = product.priceNum || product.price;
  const wishlisted = isWishlisted(product._id || product.id);

  const handleAddToCart = () => {
    addItem({
      id: product._id || product.id?.toString(),
      slug: product.slug,
      title: product.title,
      price: currentPrice,
      quantity,
      variantOptions: {
        ...(selectedColor ? { Color: selectedColor.name } : {}),
        ...(selectedSize ? { Size: selectedSize } : {}),
      },
      image: images[0],
    });
    closeQuickLook();
    openCart();
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog open={isOpen} onClose={closeQuickLook} className="relative z-[1000]">
        <TransitionChild as={Fragment}
          enter="transition-opacity duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="transition-opacity duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-ink/70 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4 md:p-8">
          <TransitionChild as={Fragment}
            enter="transform transition duration-300 ease-out" enterFrom="scale-95 opacity-0 translate-y-10" enterTo="scale-100 opacity-100 translate-y-0"
            leave="transform transition duration-200 ease-in" leaveFrom="scale-100 opacity-100 translate-y-0" leaveTo="scale-95 opacity-0 translate-y-10">
            <DialogPanel className="relative w-full max-w-5xl max-h-[90vh] bg-paper border-4 border-ink cartoon-shadow-lg overflow-hidden flex flex-col lg:flex-row">

              {/* Close Button */}
              <button
                onClick={closeQuickLook}
                className="absolute top-4 right-4 z-50 p-3 bg-white border-3 border-ink hover:bg-surface cartoon-shadow-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
              >
                <X size={24} />
              </button>

              {/* Left: Visuals */}
              <div className="w-full lg:w-[55%] relative bg-white flex flex-col h-[45vh] lg:h-auto border-b-4 lg:border-b-0 lg:border-r-4 border-ink">
                <div className="relative flex-1 overflow-hidden group">
                  <Image
                    src={images[activeImageIndex]}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    priority
                  />
                  
                  {/* Comic Panel Overlay */}
                  <div className="absolute inset-0 bg-halftone opacity-5 pointer-events-none" />
                  
                  {/* Badge */}
                  {product.badge && (
                    <div className="absolute top-6 left-6 z-10 rotate-[-5deg]">
                       <Badge variant="default" className="px-4 py-1.5 text-lg">{product.badge}</Badge>
                    </div>
                  )}

                  {/* Image Counter */}
                  <div className="absolute bottom-6 right-6 font-bebas text-2xl bg-white border-3 border-ink px-3 py-1 cartoon-shadow-sm">
                    {activeImageIndex + 1} / {images.length}
                  </div>
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-4 p-4 bg-surface border-t-4 border-ink overflow-x-auto no-scrollbar">
                    {images.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={cn(
                          "relative w-20 h-24 shrink-0 border-3 overflow-hidden transition-all cartoon-shadow-xs",
                          activeImageIndex === idx ? "border-ink scale-105" : "border-ink/20 opacity-60 hover:opacity-100"
                        )}
                      >
                        <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Intel */}
              <div className="w-full lg:w-[45%] flex flex-col overflow-y-auto bg-white">
                <div className="flex-1 p-8 lg:p-10 space-y-8">
                  {/* Category & Wishlist */}
                  <div className="flex items-center justify-between">
                    <span className="font-bebas text-2xl tracking-widest text-secondary">
                      // {product.category?.name || "COLLECTION"}
                    </span>
                    <button
                      onClick={() => toggleItem(product._id || product.id)}
                      className={cn(
                        "p-3 border-3 border-ink rounded-full cartoon-shadow-sm transition-all active:shadow-none",
                        wishlisted ? "bg-ink text-paper" : "bg-white text-ink hover:bg-surface"
                      )}
                    >
                      <Heart size={24} fill={wishlisted ? "currentColor" : "none"} />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="space-y-4">
                    <h2 className="font-bangers text-5xl text-ink uppercase leading-none tracking-tight">
                      {product.title}
                    </h2>
                    <div className="flex items-center gap-4">
                       <span className="font-bebas text-5xl text-ink">৳{Math.round(currentPrice).toLocaleString()}</span>
                       {product.oldPrice && (
                         <span className="font-bebas text-3xl text-ink/30 line-through">৳{Math.round(product.oldPrice).toLocaleString()}</span>
                       )}
                    </div>
                  </div>

                  <div className="h-1 bg-ink w-24" />

                  {/* Options */}
                  <div className="space-y-8">
                    {/* Color */}
                    {colors.length > 0 && (
                      <div className="space-y-3">
                        <span className="font-bebas text-xl tracking-widest text-secondary uppercase block">SELECT SCHEME:</span>
                        <div className="flex flex-wrap gap-4">
                          {colors.map((c: any) => (
                            <button
                              key={c.name}
                              onClick={() => setSelectedColor(c)}
                              className={cn(
                                "w-12 h-12 border-4 transition-all cartoon-shadow-sm",
                                selectedColor?.name === c.name ? "border-ink scale-110 rotate-3" : "border-ink/10 grayscale hover:grayscale-0"
                              )}
                              style={{ backgroundColor: c.hex || c.name.toLowerCase() }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Size */}
                    {sizes.length > 0 && (
                      <div className="space-y-3">
                        <span className="font-bebas text-xl tracking-widest text-secondary uppercase block">SELECT DIMENSION:</span>
                        <div className="flex flex-wrap gap-3">
                          {sizes.map((s: string) => (
                            <button
                              key={s}
                              onClick={() => setSelectedSize(s)}
                              className={cn(
                                "min-w-[60px] h-12 flex items-center justify-center font-bebas text-2xl border-3 transition-all cartoon-shadow-sm",
                                selectedSize === s ? "bg-ink text-paper border-ink" : "bg-white text-ink border-ink hover:bg-surface"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity */}
                    <div className="space-y-3">
                      <span className="font-bebas text-xl tracking-widest text-secondary uppercase block">REPLICAS:</span>
                      <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={10} />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-8 lg:p-10 border-t-4 border-ink bg-surface space-y-4">
                  <Button size="lg" className="w-full" onClick={handleAddToCart}>
                    ADD TO GEAR — ৳{Math.round(currentPrice * quantity).toLocaleString()}
                  </Button>
                  <Link href={`/products/${product.slug}`} onClick={closeQuickLook} className="block group">
                    <div className="flex items-center justify-center gap-3 font-bebas text-2xl text-secondary group-hover:text-ink transition-colors">
                      OPEN FULL DOSSIER <ArrowRight size={24} />
                    </div>
                  </Link>
                </div>
              </div>

            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
