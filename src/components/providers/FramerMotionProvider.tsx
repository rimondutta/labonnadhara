"use client";

import { LazyMotion } from "framer-motion";
import React from "react";

// Load framer-motion features asynchronously — keeps them out of the critical
// JS bundle entirely, eliminating their contribution to TBT.
const loadFeatures = () =>
  import("framer-motion").then((mod) => mod.domAnimation);

export default function FramerMotionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
