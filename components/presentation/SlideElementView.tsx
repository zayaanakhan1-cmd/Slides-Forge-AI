/**
 * Slide element renderer.
 *
 * Renders a canonical `SlideElement` to the web. This is the web destination's
 * renderer, and it is exhaustive over the element union: adding a new element
 * kind to the model will fail to compile here until it is handled, which is the
 * point of the discriminated union.
 *
 * Every element is positioned from its normalized geometry, so the same slide
 * renders at any canvas size without the model knowing the pixel dimensions.
 */

import type { CSSProperties } from "react";

import type { SlideElement, TextElement } from "@/types/slide";
import type { Theme } from "@/types/theme";

interface ElementRendererProps {
  element: SlideElement;
  theme: Theme;
  /** Canvas width in pixels, used to convert point sizes to CSS. */
  canvasWidth: number;
}

/** Font size in points scaled to the rendered canvas. */
function scaledFontSize(points: number, canvasWidth: number, baseWidth = 960): number {
  return (points * canvasWidth) / baseWidth;
}

function resolveFontSize(
  element: TextElement,
  theme: Theme,
  canvasWidth: number,
): number {
  const explicit = element.runs.find((run) => typeof run.fontSize === "number")?.fontSize;
  if (explicit) return scaledFontSize(explicit, canvasWidth);

  const style = element.runs[0]?.style ?? "body";
  const scale = theme.typography.scale;
  const points =
    style === "title"
      ? scale.title
      : style === "heading"
        ? scale.heading
        : style === "caption"
          ? scale.caption
          : scale.body;
  return scaledFontSize(points, canvasWidth);
}

function wrapperStyle(element: SlideElement): CSSProperties {
  return {
    position: "absolute",
    left: `${element.position.x * 100}%`,
    top: `${element.position.y * 100}%`,
    width: `${element.size.width * 100}%`,
    height: `${element.size.height * 100}%`,
    zIndex: element.zIndex,
    opacity: element.opacity ?? 1,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    display: element.visible === false ? "none" : undefined,
  };
}

function TextElementView({
  element,
  theme,
  canvasWidth,
}: {
  element: TextElement;
  theme: Theme;
  canvasWidth: number;
}) {
  const fontSize = resolveFontSize(element, theme, canvasWidth);
  const justifyContent =
    element.verticalAlign === "middle"
      ? "center"
      : element.verticalAlign === "bottom"
        ? "flex-end"
        : "flex-start";
  const isBulleted = element.bullets && element.runs.length > 1;

  return (
    <div
      style={{
        ...wrapperStyle(element),
        display: "flex",
        flexDirection: "column",
        justifyContent,
        textAlign: element.align ?? "left",
        lineHeight: element.lineHeight ?? 1.25,
        letterSpacing: element.letterSpacing,
        fontSize,
        color: theme.colors.text,
      }}
    >
      {isBulleted ? (
        <ul style={{ display: "flex", flexDirection: "column", gap: fontSize * 0.5 }}>
          {element.runs.map((run, index) => (
            <li key={index} style={{ display: "flex", gap: fontSize * 0.5 }}>
              <span aria-hidden style={{ color: theme.colors.accent, flexShrink: 0 }}>
                •
              </span>
              <span
                style={{
                  color: run.color ?? theme.colors.text,
                  fontWeight: run.bold ? 600 : undefined,
                  fontStyle: run.italic ? "italic" : undefined,
                  textDecoration: run.underline ? "underline" : undefined,
                }}
              >
                {run.text}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        element.runs.map((run, index) => (
          <span
            key={index}
            style={{
              color: run.color ?? theme.colors.text,
              fontWeight: run.bold ? 600 : undefined,
              fontStyle: run.italic ? "italic" : undefined,
              textDecoration: run.underline ? "underline" : undefined,
            }}
          >
            {run.text}
          </span>
        ))
      )}
    </div>
  );
}

function ShapeElementView({
  element,
  theme,
  canvasWidth,
}: {
  element: Extract<SlideElement, { type: "shape" }>;
  theme: Theme;
  canvasWidth: number;
}) {
  const radius = element.shape === "rounded-rectangle" ? (element.cornerRadius ?? 8) : 0;
  const isDivider = element.shape === "divider" || element.shape === "line";
  const fontSize = scaledFontSize(theme.typography.scale.body, canvasWidth);

  return (
    <div
      style={{
        ...wrapperStyle(element),
        background: isDivider ? undefined : (element.fill ?? "transparent"),
        borderColor: element.stroke ?? theme.colors.border,
        borderWidth: isDivider ? undefined : (element.strokeWidth ?? 0),
        borderStyle: isDivider ? undefined : element.strokeWidth ? "solid" : undefined,
        borderRadius: element.shape === "ellipse" ? "50%" : radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: fontSize,
        fontSize,
        color: theme.colors.text,
        textAlign: "center",
      }}
    >
      {isDivider ? (
        <div
          style={{
            width: "100%",
            height: element.strokeWidth ?? 1,
            background: element.stroke ?? theme.colors.border,
          }}
        />
      ) : (
        element.text?.map((run, index) => <span key={index}>{run.text}</span>)
      )}
    </div>
  );
}

function UnsupportedElementView({ element }: { element: SlideElement }) {
  // Honest placeholder: the element exists in the model and is preserved, but
  // the web renderer does not draw it yet. It is never silently dropped.
  return (
    <div
      style={{
        ...wrapperStyle(element),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px dashed var(--sf-border-strong)",
        borderRadius: 6,
        fontSize: 11,
        color: "var(--sf-text-subtle)",
      }}
    >
      {element.type}
    </div>
  );
}

export function SlideElementView({ element, theme, canvasWidth }: ElementRendererProps) {
  switch (element.type) {
    case "text":
      return <TextElementView element={element} theme={theme} canvasWidth={canvasWidth} />;
    case "shape":
      return <ShapeElementView element={element} theme={theme} canvasWidth={canvasWidth} />;
    case "group":
      return (
        <div style={wrapperStyle(element)}>
          {element.children.map((child) => (
            <SlideElementView
              key={child.id}
              element={child}
              theme={theme}
              canvasWidth={canvasWidth}
            />
          ))}
        </div>
      );
    case "image":
    case "chart":
    case "diagram":
    case "video":
    case "button":
      return <UnsupportedElementView element={element} />;
    default: {
      const exhaustive: never = element;
      return exhaustive;
    }
  }
}
