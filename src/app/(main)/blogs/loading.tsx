export default function BlogsLoading() {
  return (
    <div className="w-full flex-1 bg-[#FAFAFA] min-h-screen pt-20 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col items-center text-center justify-center pt-16 pb-20 px-4">
        <div className="h-16 md:h-24 w-72 md:w-96 bg-zinc-200 rounded-lg mb-6" />
        <div className="h-4 w-64 bg-zinc-100 rounded mb-10" />
        <div className="flex gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-16 bg-zinc-200 rounded" />
          ))}
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="px-4 sm:px-8 lg:px-[5vw] max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 gap-y-16 pb-32">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-6">
            <div className="w-full aspect-[3/4] bg-zinc-200 rounded" />
            <div className="flex flex-col gap-3">
              <div className="h-3 w-24 bg-zinc-200 rounded" />
              <div className="h-6 w-full bg-zinc-200 rounded" />
              <div className="h-4 w-5/6 bg-zinc-100 rounded" />
              <div className="h-3 w-20 bg-zinc-200 rounded mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
