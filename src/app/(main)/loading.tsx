export default function Loading() {
  return (
    <div className="w-full bg-white min-h-[92vh] animate-pulse">
      {/* Hero skeleton */}
      <div className="w-full min-h-[90vh] bg-[#FFF0F5] flex items-center justify-center">
        <div className="max-w-xl mx-auto px-4 flex flex-col items-center gap-4">
          <div className="h-6 w-48 bg-pink-200/60 rounded-full" />
          <div className="h-12 w-80 bg-pink-200/80 rounded-lg" />
          <div className="h-4 w-64 bg-pink-100 rounded" />
          <div className="h-12 w-36 bg-[#D62B72]/40 rounded-full mt-4" />
        </div>
      </div>

      {/* Features strip skeleton */}
      <div className="h-20 bg-[#FFF5F8] border-y border-pink-100" />

      {/* Categories skeleton */}
      <div className="py-16 max-w-5xl mx-auto px-4 flex justify-center gap-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 rounded-full bg-pink-100/70" />
            <div className="h-4 w-20 bg-pink-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

