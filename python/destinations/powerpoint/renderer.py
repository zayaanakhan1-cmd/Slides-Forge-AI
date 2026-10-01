"""PowerPoint renderer abstraction.

Renders a presentation that conforms to the canonical model into a real .pptx
using python-pptx. The renderer is deliberately minimal in Phase 1: it lays out
the slide title and text elements, and applies the theme's colours and type
scale. It does not fabricate content and it does not claim to support features it
does not render.

This is the concrete implementation of:

    Canonical Presentation Model -> PowerPointRenderer -> python-pptx -> .pptx
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from pptx import Presentation as PptxPresentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Pt


class PowerPointRenderError(RuntimeError):
    """Raised when a presentation cannot be rendered to PowerPoint."""


# EMU per inch and the canonical 96-DPI pixel space used by the model.
_EMU_PER_INCH = 914400
_PX_PER_INCH = 96


def _px_to_emu(px: float) -> int:
    """Convert model pixels to EMU."""
    return int(round(px / _PX_PER_INCH * _EMU_PER_INCH))


def _parse_hex(value: str | None) -> RGBColor | None:
    """Parse a ``#rrggbb`` string into an RGBColor, or None when unparseable."""
    if not value:
        return None
    text = value.strip().lstrip("#")
    if len(text) == 3:
        text = "".join(ch * 2 for ch in text)
    if len(text) not in (6, 8):
        return None
    try:
        red = int(text[0:2], 16)
        green = int(text[2:4], 16)
        blue = int(text[4:6], 16)
    except ValueError:
        return None
    return RGBColor(red, green, blue)


@dataclass(frozen=True)
class _Theme:
    """Resolved theme values the renderer needs."""

    width_px: float
    height_px: float
    background: RGBColor | None
    text: RGBColor | None
    accent: RGBColor | None
    body_size: float
    title_size: float


def _resolve_theme(model: Mapping[str, Any]) -> _Theme:
    """Extract renderable theme values from a canonical presentation mapping."""
    theme = model.get("theme") or {}
    colors = theme.get("colors") or {}
    scale = (theme.get("typography") or {}).get("scale") or {}

    # Slide dimensions come from the first slide's metadata, falling back to
    # 16:9 at the canonical 960x540 point space.
    slides: Sequence[Mapping[str, Any]] = model.get("slides") or []
    dimensions: Mapping[str, Any] = {}
    if slides:
        dimensions = (slides[0].get("metadata") or {}).get("dimensions") or {}

    width = float(dimensions.get("width") or 960)
    height = float(dimensions.get("height") or 540)

    return _Theme(
        width_px=width,
        height_px=height,
        background=_parse_hex(colors.get("background")),
        text=_parse_hex(colors.get("text")),
        accent=_parse_hex(colors.get("accent")),
        body_size=float(scale.get("body") or 18),
        title_size=float(scale.get("title") or 40),
    )


def _iter_text_runs(element: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    """Return the text runs of a text element, tolerating malformed entries."""
    runs = element.get("runs")
    if isinstance(runs, list):
        return [run for run in runs if isinstance(run, Mapping)]
    return []


class PowerPointRenderer:
    """Render a canonical presentation mapping to a real .pptx byte stream."""

    def render(self, model: Mapping[str, Any]) -> bytes:
        """Render ``model`` and return the .pptx file contents.

        Raises:
            PowerPointRenderError: when the model is missing a required field or
                contains a value the renderer cannot lay out.
        """
        if not isinstance(model, Mapping):
            raise PowerPointRenderError("Presentation model must be a mapping.")

        slides = model.get("slides")
        if not isinstance(slides, list):
            raise PowerPointRenderError("Presentation model is missing a 'slides' list.")

        theme = _resolve_theme(model)
        presentation = PptxPresentation()
        presentation.slide_width = Emu(_px_to_emu(theme.width_px))
        presentation.slide_height = Emu(_px_to_emu(theme.height_px))

        blank_layout = presentation.slide_layouts[6]

        for index, slide_model in enumerate(slides):
            if not isinstance(slide_model, Mapping):
                raise PowerPointRenderError(f"Slide at index {index} is not a mapping.")
            slide = presentation.slides.add_slide(blank_layout)
            self._paint_background(slide, theme)
            self._render_slide(slide, slide_model, theme)

        buffer = io.BytesIO()
        presentation.save(buffer)
        return buffer.getvalue()

    # -- internals ---------------------------------------------------------

    def _paint_background(self, slide: Any, theme: _Theme) -> None:
        if theme.background is None:
            return
        fill = slide.background.fill
        fill.solid()
        fill.fore_color.rgb = theme.background

    def _render_slide(
        self,
        slide: Any,
        slide_model: Mapping[str, Any],
        theme: _Theme,
    ) -> None:
        title = slide_model.get("title")
        if isinstance(title, str) and title:
            self._render_title(slide, title, theme)

        elements = slide_model.get("elements")
        if not isinstance(elements, list):
            return

        for element in elements:
            if not isinstance(element, Mapping):
                continue
            if element.get("visible") is False:
                continue
            if element.get("type") == "text":
                self._render_text_element(slide, element, theme)

    def _render_title(self, slide: Any, title: str, theme: _Theme) -> None:
        # Place the title in the top tenth of the slide, inset from the edges.
        left = Emu(_px_to_emu(theme.width_px * 0.06))
        top = Emu(_px_to_emu(theme.height_px * 0.06))
        width = Emu(_px_to_emu(theme.width_px * 0.88))
        height = Emu(_px_to_emu(theme.height_px * 0.16))

        box = slide.shapes.add_textbox(left, top, width, height)
        frame = box.text_frame
        frame.word_wrap = True
        paragraph = frame.paragraphs[0]
        run = paragraph.add_run()
        run.text = title
        run.font.size = Pt(theme.title_size)
        run.font.bold = True
        if theme.text is not None:
            run.font.color.rgb = theme.text

    def _render_text_element(
        self,
        slide: Any,
        element: Mapping[str, Any],
        theme: _Theme,
    ) -> None:
        position = element.get("position") or {}
        size = element.get("size") or {}

        x = float(position.get("x") or 0.0)
        y = float(position.get("y") or 0.0)
        w = float(size.get("width") or 0.0)
        h = float(size.get("height") or 0.0)

        left = Emu(_px_to_emu(theme.width_px * x))
        top = Emu(_px_to_emu(theme.height_px * y))
        width = Emu(_px_to_emu(theme.width_px * w))
        height = Emu(_px_to_emu(theme.height_px * h))

        box = slide.shapes.add_textbox(left, top, width, height)
        frame = box.text_frame
        frame.word_wrap = True

        runs = _iter_text_runs(element)
        if not runs:
            return

        paragraph = frame.paragraphs[0]
        align = element.get("align")
        if align == "center":
            paragraph.alignment = PP_ALIGN.CENTER
        elif align == "right":
            paragraph.alignment = PP_ALIGN.RIGHT

        for run_model in runs:
            run = paragraph.add_run()
            run.text = str(run_model.get("text") or "")
            run.font.size = Pt(float(run_model.get("fontSize") or theme.body_size))
            run.font.bold = bool(run_model.get("bold"))
            run.font.italic = bool(run_model.get("italic"))
            color = _parse_hex(run_model.get("color")) or theme.text
            if color is not None:
                run.font.color.rgb = color
