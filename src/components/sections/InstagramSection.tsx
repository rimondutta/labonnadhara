"use client";

import React from "react";
import Image from "next/image";

const TILES = [
  "/images/instagram/insta1.jpg",
  "/images/instagram/insta2.jpg",
  "/images/instagram/insta3.jpg",
  "/images/instagram/insta4.jpg",
  "/images/instagram/insta5.jpg",
  "/images/instagram/insta6.jpg",
  "/images/instagram/insta7.jpg",
  "/images/instagram/insta8.jpg",
  "/images/instagram/insta9.jpg",
  "/images/instagram/insta10.jpg",
  "/images/instagram/insta11.jpg",
  "/images/instagram/insta12.jpg",
];

export default function InstagramSection() {
  return (
    <section
      className="flex flex-col items-center gap-[30px] my-[100px]"
      style={{ padding: "0 11%" }}
    >
      <h2 className="text-[26px] md:text-[35px] font-semibold text-white">@toyhourse</h2>

      {/* <div
        className="w-full grid gap-[5px] grid-cols-[repeat(auto-fit,minmax(90px,1fr))] auto-rows-[110px] md:grid-cols-4 md:grid-rows-3 xl:grid-cols-6 xl:grid-rows-2 xl:auto-rows-auto"
      >
        {TILES.map((src, i) => (
          <div
            key={i}
            className="overflow-hidden transition-opacity duration-300 ease-in-out hover:opacity-40 cursor-pointer h-full"
          >
            <Image
              src={src}
              alt={`Instagram photo ${i + 1}`}
              width={300}
              height={300}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div> */}
    </section>
  );
}
