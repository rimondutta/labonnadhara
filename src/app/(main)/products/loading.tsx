export default function ProductsLoading() {
  return (
    <div className="w-full min-h-screen bg-white pt-28 px-4 sm:px-8 lg:px-[5vw] animate-pulse">
      {/* Filter bar skeleton */}
      <div className="max-w-7xl mx-auto mb-8 flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-24 bg-pink-100 rounded-xl shrink-0" />
        ))}
      </div>
      {/* Product grid skeleton */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-[#FFF8FB] rounded-[20px] overflow-hidden border border-[#F3D6E2]">
            <div className="aspect-[4/5] bg-pink-100/60" />
            <div className="p-4 flex flex-col gap-3">
              <div className="h-4 bg-pink-100 rounded w-3/4" />
              <div className="h-6 bg-pink-200/50 rounded w-1/2" />
              <div className="h-10 bg-[#D62B72]/20 rounded-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
