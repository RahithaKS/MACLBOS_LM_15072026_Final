import pptxgen from "pptxgenjs";

const pptx = new pptxgen();
pptx.defineLayout({ name: "BUSINESS_METRICS", width: 13.333, height: 9.2 });
pptx.layout = "BUSINESS_METRICS";
pptx.author = "LedgerLM";
pptx.company = "LedgerLM";
pptx.subject = "Editable governed KPI Metrics PowerPoint template";
pptx.title = "Business Metrics KPI Report Template";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  lang: "en-US",
};

const slide = pptx.addSlide();
slide.background = { color: "FFFFFF" };

const color = {
  magenta: "A83678",
  darkMagenta: "8C2465",
  ink: "303030",
  muted: "626262",
  border: "777777",
  panel: "D9D9D9",
  panelLight: "ECECEC",
  palePink: "F6EFF3",
  green: "009B76",
  navy: "006578",
  red: "D9192B",
  teal: "0097A7",
  orange: "F08A21",
};

function text(value, options) {
  slide.addText(value, {
    fontFace: "Arial",
    color: color.ink,
    margin: 0,
    breakLine: false,
    fit: "shrink",
    valign: "top",
    ...options,
  });
}

// Header strips and light visual treatment, matching the supplied Business Metrics reference.
slide.addShape(pptx.ShapeType.rect, {
  x: 0, y: 0, w: 13.333, h: 0.09,
  fill: { color: color.magenta }, line: { color: color.magenta, transparency: 100 },
});
[
  [color.magenta, 0.0, 2.2],
  [color.orange, 2.2, 2.7],
  [color.green, 4.9, 3.1],
  [color.teal, 8.0, 2.3],
  [color.red, 10.3, 3.033],
].forEach(([fill, x, w]) => slide.addShape(pptx.ShapeType.rect, {
  x, y: 0.09, w, h: 0.055,
  fill: { color: fill }, line: { color: fill, transparency: 100 },
}));
slide.addShape(pptx.ShapeType.arc, {
  x: -1.15, y: 0.16, w: 6.9, h: 2.95,
  adjustPoint: 0.36, fill: { color: color.palePink, transparency: 28 },
  line: { color: color.palePink, transparency: 100 },
});
slide.addShape(pptx.ShapeType.arc, {
  x: 7.4, y: 0.20, w: 6.9, h: 3.25,
  adjustPoint: 0.36, fill: { color: color.palePink, transparency: 28 },
  line: { color: color.palePink, transparency: 100 },
});

text("Business Metrics {{report_month}}", {
  x: 2.66, y: 0.33, w: 6.9, h: 0.45,
  fontSize: 25, bold: true, italic: true, color: color.magenta, align: "center",
});
text("Bosch\nGlobal\nSoftware\nTechnologies", {
  x: 11.87, y: 0.30, w: 1.08, h: 0.56,
  fontSize: 7.5, bold: true, color: color.magenta, align: "left", breakLine: true, fit: "shrink",
});
text("Be future-ready.", {
  x: 11.87, y: 0.86, w: 1.08, h: 0.12,
  fontSize: 4.6, bold: true, color: color.muted,
});

// Region flags are editable labels so this file works even where font icons are unavailable.
const badges = [
  ["WW", color.navy],
  ["IN", "EE9AB8"],
  ["VN", color.red],
  ["MX", "59A587"],
];
badges.forEach(([label, fill], i) => {
  const x = 3.1 + i * 1.14;
  slide.addShape(pptx.ShapeType.rect, {
    x, y: 0.91, w: 0.88, h: 0.48,
    fill: { color: fill }, line: { color: fill, transparency: 100 },
  });
  text(label, {
    x, y: 1.035, w: 0.88, h: 0.17,
    fontSize: 8.5, bold: true, color: "FFFFFF", align: "center",
  });
});

// Main decision panel.
slide.addShape(pptx.ShapeType.rect, {
  x: 0.36, y: 1.52, w: 12.62, h: 7.03,
  fill: { color: color.panel }, line: { color: color.border, pt: 0.65 },
});
text("Decision / info to GLs", {
  x: 0.45, y: 1.60, w: 4.6, h: 0.20,
  fontSize: 10.5, bold: true, color: color.magenta,
});
text("Green: current plan-excel scope  •  Red: Phase 2 / out of scope", {
  x: 7.1, y: 1.61, w: 5.4, h: 0.17,
  fontSize: 7.0, bold: true, color: color.muted, align: "right",
});

const sections = [
  {
    title: "Budget / Revenue:",
    placeholder:
      "{{budget_revenue_summary}}\n{{budget_revenue_scope_lines}}",
    h: 0.83,
    color: color.green,
  },
  {
    title: "Internal Utilization:",
    placeholder:
      "{{internal_utilization_summary}}\n{{internal_utilization_scope_lines}}",
    h: 0.77,
    color: color.green,
  },
  {
    title: "External Utilization:",
    placeholder:
      "{{external_utilization_summary}}\n{{external_utilization_scope_lines}}",
    h: 0.77,
    color: color.green,
  },
  {
    title: "Capacity (Internal + External):",
    placeholder:
      "{{capacity_summary}}\n{{capacity_scope_lines}}",
    h: 0.77,
    color: color.green,
  },
  {
    title: "EBIT:",
    placeholder: "{{ebit_phase_2_scope_note}}",
    h: 0.58,
    color: color.red,
  },
  {
    title: "Capex:",
    placeholder: "{{capex_phase_2_scope_note}}",
    h: 0.48,
    color: color.red,
  },
];

let y = 1.95;
for (const section of sections) {
  text(section.title, {
    x: 0.47, y, w: 3.4, h: 0.18,
    fontSize: 9.1, bold: true, color: section.color,
  });
  text(section.placeholder, {
    x: 0.62, y: y + 0.22, w: 12.0, h: section.h - 0.18,
    fontSize: 7.2, color: section.color, breakLine: true, fit: "shrink",
  });
  y += section.h;
}

slide.addShape(pptx.ShapeType.line, {
  x: 0.48, y: 6.87, w: 12.34, h: 0,
  line: { color: "AFAFAF", pt: 0.5 },
});
text("Source & governance", {
  x: 0.48, y: 6.99, w: 2.0, h: 0.17,
  fontSize: 8.4, bold: true, color: color.darkMagenta,
});
text("{{source_note}}  •  Actuals: {{actual_source_label}}  •  Forecast: {{forecast_source_label}}  •  {{period_label}}  •  {{entity_label}}", {
  x: 0.48, y: 7.22, w: 12.28, h: 0.30,
  fontSize: 7.0, color: color.muted, fit: "shrink",
});
text("Warnings / data-quality notes: {{warnings}}", {
  x: 0.48, y: 7.58, w: 12.28, h: 0.24,
  fontSize: 6.8, italic: true, color: color.muted, fit: "shrink",
});

// Bosch-style footer band.
[
  [color.navy, 0, 5.0],
  [color.red, 5.0, 2.4],
  [color.teal, 7.4, 2.6],
  [color.orange, 10.0, 3.333],
].forEach(([fill, x, w]) => slide.addShape(pptx.ShapeType.rect, {
  x, y: 8.75, w, h: 0.45,
  fill: { color: fill }, line: { color: fill, transparency: 100 },
}));
text("Internal | Governed Enterprise Data | KPI Metrics Board", {
  x: 0.44, y: 8.89, w: 5.7, h: 0.12,
  fontSize: 5.5, bold: true, color: "FFFFFF",
});
text("BOSCH", {
  x: 11.74, y: 8.84, w: 1.05, h: 0.20,
  fontSize: 9.3, bold: true, color: "FFFFFF", align: "center",
});

await pptx.writeFile({ fileName: "../../attached_assets/kpi_business_metrics_template.pptx" });