"use client";

import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
  AnimatePresence,
  MotionValue,
  m,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: { title: string; icon: React.ReactNode; href?: string; onClick?: () => void }[];
  desktopClassName?: string;
  mobileClassName?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href?: string; onClick?: () => void }[];
  className?: string;
}) => {
  let mouseX = useMotionValue(Infinity);
  return (
    <m.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden md:flex h-16 gap-4 items-end rounded-2xl bg-neutral-900/90 border border-neutral-800 px-4 pb-3 shadow-lg backdrop-blur-md",
        className
      )}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </m.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  let ref = useRef<HTMLDivElement>(null);

  let distance = useTransform(mouseX, (val) => {
    let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

    return val - bounds.x - bounds.width / 2;
  });

  let widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  let heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

  let widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
  let heightTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);

  let width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  let widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  const content = (
    <m.div
      ref={ref}
      style={{ width, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="aspect-square rounded-full bg-neutral-800 flex items-center justify-center relative hover:bg-neutral-700 transition-colors cursor-pointer"
    >
      <AnimatePresence>
        {hovered && (
          <m.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            className="px-2 py-0.5 whitespace-pre rounded-md bg-neutral-900 border border-neutral-800 text-white absolute left-1/2 -top-10 -translate-x-1/2 w-fit text-xs"
          >
            {title}
          </m.div>
        )}
      </AnimatePresence>
      <m.div
        style={{ width: widthIcon, height: heightIcon }}
        className="flex items-center justify-center"
      >
        {icon}
      </m.div>
    </m.div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="focus:outline-none bg-transparent border-none p-0 cursor-pointer">
        {content}
      </button>
    );
  }

  return (
    <Link href={href || "#"}>
      {content}
    </Link>
  );
}

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href?: string; onClick?: () => void }[];
  className?: string;
}) => {
  return (
    <div className={cn("flex md:hidden items-center justify-around h-16 w-full max-w-sm mx-auto rounded-full bg-white border border-gray-200 px-4 shadow-lg", className)}>
      {items.map((item) => (
        item.onClick ? (
          <button
            key={item.title}
            onClick={item.onClick}
            className="flex items-center justify-center p-2 focus:outline-none bg-transparent border-none cursor-pointer"
          >
            {item.icon}
          </button>
        ) : (
          <Link
            href={item.href || "#"}
            key={item.title}
            className="flex items-center justify-center p-2"
          >
            {item.icon}
          </Link>
        )
      ))}
    </div>
  );
};
