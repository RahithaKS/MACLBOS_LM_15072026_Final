import pptxgen from "pptxgenjs";

const pptx = new pptxgen();
pptx.defineLayout({ name: "BUSINESS_METRICS", width: 13.333, height: 9.2 });
pptx.layout = "BUSINESS_METRICS";
pptx.author = "LedgerLM";
pptx.company = "LedgerLM";
pptx.subject = "Four-entity editable governed KPI Metrics PowerPoint template";
pptx.title = "Business Metrics KPI Report — Four Entity Template";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  lang: "en-US",
};

const C = {
  magenta: "A83678",
  darkMagenta: "8C2465",
  ink: "303030",
  muted: "626262",
  border: "777777",
  panel: "D9D9D9",
  palePink: "F6EFF3",
  green: "009B76",
  navy: "006578",
  red: "D9192B",
  teal: "0097A7",
  orange: "F08A21",
  white: "FFFFFF",
  flagWhite: "F8F8F8",
  yellow: "F7D117",
};

const scopes = [
  { prefix: "ww", code: "WW", label: "Worldwide", entityLabel: "World Wide", color: C.navy },
  { prefix: "in", code: "IN", label: "India", entityLabel: "BGSW India", color: "EE9AB8" },
  { prefix: "vn", code: "VN", label: "Vietnam", entityLabel: "BGSV Vietnam", color: C.red },
  { prefix: "mx", code: "MX", label: "Mexico", entityLabel: "NE-MX", color: "59A587" },
];

function addText(slide, value, options = {}) {
  slide.addText(value, {
    fontFace: "Arial",
    color: C.ink,
    margin: 0,
    breakLine: false,
    fit: "shrink",
    valign: "top",
    ...options,
  });
}

function addFlagIcon(slide, scope, x, y) {
  const w = 0.46;
  const h = 0.30;
  if (scope.code === "WW") {
    slide.addShape(pptx.ShapeType.ellipse, {
      x, y, w, h,
      fill: { color: C.navy },
      line: { color: C.white, pt: 0.6 },
    });
    slide.addShape(pptx.ShapeType.line, {
      x: x + w * 0.50, y: y + 0.02, w: 0, h: h - 0.04,
      line: { color: C.white, pt: 0.5 },
    });
    slide.addShape(pptx.ShapeType.line, {
      x: x + 0.06, y: y + h * 0.50, w: w - 0.12, h: 0,
      line: { color: C.white, pt: 0.5 },
    });
  } else if (scope.code === "IN") {
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w, h: h / 3,
      fill: { color: "FF9933" }, line: { color: "FF9933", transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x, y: y + h / 3, w, h: h / 3,
      fill: { color: C.flagWhite }, line: { color: C.flagWhite, transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x, y: y + (h * 2) / 3, w, h: h / 3,
      fill: { color: "138808" }, line: { color: "138808", transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + w * 0.43, y: y + h * 0.39, w: w * 0.14, h: h * 0.22,
      fill: { color: C.flagWhite, transparency: 100 },
      line: { color: "000080", pt: 0.6 },
    });
  } else if (scope.code === "VN") {
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w, h,
      fill: { color: C.red }, line: { color: C.red, transparency: 100 },
    });
    addText(slide, "★", {
      x: x + 0.12, y: y + 0.045, w: 0.22, h: 0.20,
      fontSize: 10, bold: true, color: C.yellow, align: "center",
    });
  } else {
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w: w / 3, h,
      fill: { color: "006847" }, line: { color: "006847", transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: x + w / 3, y, w: w / 3, h,
      fill: { color: C.flagWhite }, line: { color: C.flagWhite, transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: x + (w * 2) / 3, y, w: w / 3, h,
      fill: { color: "CE1126" }, line: { color: "CE1126", transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + w * 0.43, y: y + h * 0.38, w: w * 0.14, h: h * 0.24,
      fill: { color: "8B5A2B" }, line: { color: "8B5A2B", transparency: 100 },
    });
  }
}

function addScopeBadge(slide, scope, index, active) {
  const x = 2.05 + index * 2.33;
  const y = 0.99;
  const w = 2.10;
  const h = 0.54;
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.05,
    fill: { color: active ? "F2D9E5" : C.white },
    line: { color: active ? C.magenta : "B8B8B8", pt: active ? 1.25 : 0.6 },
  });
  addFlagIcon(slide, scope, x + 0.13, y + 0.12);
  addText(slide, `${scope.label} (${scope.code})`, {
    x: x + 0.68, y: y + 0.13, w: 1.28, h: 0.16,
    fontSize: 7.3, bold: active, color: active ? C.darkMagenta : C.ink,
    align: "left",
  });
  if (active) {
    addText(slide, "ACTIVE", {
      x: x + 0.68, y: y + 0.32, w: 0.9, h: 0.10,
      fontSize: 4.9, bold: true, color: C.magenta,
    });
  }
}

function addSection(slide, scope, title, placeholder, y, height, inScope) {
  const accent = inScope ? C.green : C.red;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.47, y: y - 0.02, w: 0.075, h: height - 0.035,
    fill: { color: accent }, line: { color: accent, transparency: 100 },
  });
  addText(slide, title, {
    x: 0.67, y, w: 4.0, h: 0.17,
    fontSize: 8.6, bold: true, color: accent,
  });
  addText(slide, placeholder, {
    x: 0.82, y: y + 0.20, w: 11.72, h: height - 0.23,
    fontSize: 6.75, color: accent, breakLine: true, fit: "shrink",
  });
}

function addSlide(scope, slideNumber) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.333, h: 0.09,
    fill: { color: C.magenta }, line: { color: C.magenta, transparency: 100 },
  });
  [
    [C.magenta, 0.0, 2.2],
    [C.orange, 2.2, 2.7],
    [C.green, 4.9, 3.1],
    [C.teal, 8.0, 2.3],
    [C.red, 10.3, 3.033],
  ].forEach(([fill, x, w]) => slide.addShape(pptx.ShapeType.rect, {
    x, y: 0.09, w, h: 0.055,
    fill: { color: fill }, line: { color: fill, transparency: 100 },
  }));

  slide.addShape(pptx.ShapeType.arc, {
    x: -1.15, y: 0.16, w: 6.9, h: 2.95,
    adjustPoint: 0.36,
    fill: { color: C.palePink, transparency: 28 },
    line: { color: C.palePink, transparency: 100 },
  });
  slide.addShape(pptx.ShapeType.arc, {
    x: 7.4, y: 0.20, w: 6.9, h: 3.25,
    adjustPoint: 0.36,
    fill: { color: C.palePink, transparency: 28 },
    line: { color: C.palePink, transparency: 100 },
  });

  addText(slide, "Business Metrics {{report_month}}", {
    x: 2.66, y: 0.33, w: 6.9, h: 0.45,
    fontSize: 25, bold: true, italic: true,
    color: C.magenta, align: "center",
  });
  addText(slide, "Bosch\nGlobal\nSoftware\nTechnologies", {
    x: 11.87, y: 0.30, w: 1.08, h: 0.56,
    fontSize: 7.5, bold: true, color: C.magenta,
    align: "left", breakLine: true, fit: "shrink",
  });
  addText(slide, "Be future-ready.", {
    x: 11.87, y: 0.86, w: 1.08, h: 0.12,
    fontSize: 4.6, bold: true, color: C.muted,
  });

  scopes.forEach((item, index) => addScopeBadge(slide, item, index, item.code === scope.code));

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.36, y: 1.68, w: 12.62, h: 6.83,
    fill: { color: C.panel }, line: { color: C.border, pt: 0.65 },
  });
  addText(slide, `Decision / info to GLs — ${scope.entityLabel}`, {
    x: 0.48, y: 1.77, w: 5.8, h: 0.20,
    fontSize: 10.5, bold: true, color: C.magenta,
  });
  addText(slide, "Green: governed scope  •  Red: Phase 2 / out of scope", {
    x: 7.05, y: 1.78, w: 5.42, h: 0.17,
    fontSize: 7.0, bold: true, color: C.muted, align: "right",
  });

  const p = scope.prefix;
  addSection(
    slide, scope, "Budget / Revenue:",
    `{{${p}_budget_revenue_summary}}\n{{${p}_budget_revenue_detail}}`,
    2.14, 0.88, true,
  );
  addSection(
    slide, scope, "Internal Utilization:",
    `{{${p}_internal_utilization_summary}}\n{{${p}_internal_utilization_detail}}`,
    3.02, 0.76, true,
  );
  addSection(
    slide, scope, "External Utilization:",
    `{{${p}_external_utilization_summary}}\n{{${p}_external_utilization_detail}}`,
    3.78, 0.76, true,
  );
  addSection(
    slide, scope, "Capacity (Internal + External):",
    `{{${p}_capacity_summary}}\n{{${p}_capacity_detail}}`,
    4.54, 0.76, true,
  );
  addSection(
    slide, scope, "Attrition:",
    `{{${p}_attrition_summary}}\n{{${p}_attrition_detail_or_phase_2_note}}`,
    5.30, 0.64, false,
  );
  addSection(
    slide, scope, "EBIT:",
    `{{${p}_ebit_summary}}\n{{${p}_ebit_detail_or_phase_2_note}}`,
    5.94, 0.64, false,
  );

  slide.addShape(pptx.ShapeType.line, {
    x: 0.48, y: 6.78, w: 12.34, h: 0,
    line: { color: "AFAFAF", pt: 0.5 },
  });
  addText(slide, "Source & governance", {
    x: 0.48, y: 6.90, w: 2.0, h: 0.17,
    fontSize: 8.4, bold: true, color: C.darkMagenta,
  });
  addText(slide, `{{${p}_source_note}}  •  Actuals: {{${p}_actual_source_label}}  •  Forecast: {{${p}_forecast_source_label}}  •  {{${p}_period_label}}`, {
    x: 0.48, y: 7.13, w: 12.28, h: 0.30,
    fontSize: 6.7, color: C.muted, fit: "shrink",
  });
  addText(slide, `Warnings / data-quality notes: {{${p}_warnings}}`, {
    x: 0.48, y: 7.49, w: 12.28, h: 0.24,
    fontSize: 6.6, italic: true, color: C.muted, fit: "shrink",
  });
  addText(slide, `{{${p}_entity_label}}  •  Slide ${slideNumber} of 4`, {
    x: 10.25, y: 7.88, w: 2.5, h: 0.13,
    fontSize: 5.8, color: C.muted, align: "right",
  });

  [
    [C.navy, 0, 5.0],
    [C.red, 5.0, 2.4],
    [C.teal, 7.4, 2.6],
    [C.orange, 10.0, 3.333],
  ].forEach(([fill, x, w]) => slide.addShape(pptx.ShapeType.rect, {
    x, y: 8.75, w, h: 0.45,
    fill: { color: fill }, line: { color: fill, transparency: 100 },
  }));
  addText(slide, "Internal | Governed Enterprise Data | KPI Metrics Board", {
    x: 0.44, y: 8.89, w: 5.7, h: 0.12,
    fontSize: 5.5, bold: true, color: C.white,
  });
  addText(slide, "BOSCH", {
    x: 11.74, y: 8.84, w: 1.05, h: 0.20,
    fontSize: 9.3, bold: true, color: C.white, align: "center",
  });
}

scopes.forEach((scope, index) => addSlide(scope, index + 1));

await pptx.writeFile({
  fileName: "../../attached_assets/kpi_business_metrics_four_entity_template.pptx",
});