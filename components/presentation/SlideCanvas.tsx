/**
 * Slide canvas.
 *
 * Renders one canonical Slide at a fixed aspect ratio. The canvas is measured
 * so text can be scaled from points to pixels; everything else is positioned
 * from the slide's normalized geometry, so the same slide renders identically
 * at thumbnail and full size.
 */

"use client";

import { useEffect, useRef, useState } from "react";

import type { Slide } from "@/types/slide";
import type { Theme } from "@/types/theme";
import { SlideElementView } from "./SlideElementView";

const ASPECT: Record<Theme["aspectRatio"], number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "9:16": 9 / 16,
};

export function SlideCanvas({
  slide,
  theme,
  className,
  interactive = false,
}: {
  slide: Slide;
  theme: Theme;
  className?: string;
  interactive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const aspect = ASPECT[theme.aspectRatio] ?? 16 / 9;
  const ordered = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${aspect}`,
        background: theme.slideBackground,
        overflow: "hidden",
        pointerEvents: interactive ? "auto" : "none",
      }}
    >
      {ordered.map((element) => (
        <SlideElementView
          key={element.id}
          element={element}
          theme={theme}
          canvasWidth={width}
        />
      ))}
    </div>
  );
}
