"""PowerPoint destination.

The flow this package is built toward:

    Canonical Presentation Model
        -> PowerPointRenderer
        -> python-pptx
        -> real .pptx

Phase 1 ships a minimal but verified renderer that produces a genuine .pptx from
the canonical model. It renders text elements and slide titles; charts,
diagrams, video and advanced layout are planned.
"""

from python.destinations.powerpoint.renderer import (
    PowerPointRenderer,
    PowerPointRenderError,
)

__all__ = ["PowerPointRenderer", "PowerPointRenderError"]
