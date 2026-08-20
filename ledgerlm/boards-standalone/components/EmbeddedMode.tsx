"use client";

import { useEffect } from "react";

export default function EmbeddedMode() {
  useEffect(() => {
    const frameTestId = window.frameElement?.getAttribute("data-testid");
    const embeddedByFrame = frameTestId?.startsWith("iframe-standalone-") ?? false;
    const embeddedByRoute =
      new URLSearchParams(window.location.search).get("embedded") === "1";

    if (embeddedByFrame || embeddedByRoute) {
      document.body.dataset.embedded = "true";
    }

    return () => {
      delete document.body.dataset.embedded;
    };
  }, []);

  return null;
}