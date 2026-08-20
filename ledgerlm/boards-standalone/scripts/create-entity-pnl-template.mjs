import pptxgen from "pptxgenjs";

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "LedgerLM";
pptx.company = "LedgerLM";
pptx.subject = "Editable Entity P&L PowerPoint template";
pptx.title = "Entity P&L Analysis Template";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  lang: "en-US",
};
pptx.defineSlideMaster({
  title: "P&L_MASTER",
  background: { color: "FFFFFF" },
  objects: [
    { rect: { x: 0, y: 7.18, w: 13.33, h: 0.32, fill: { color: "00A7B5" }, line: { color: "00A7B5" } } },
    { rect: { x: 0, y: 7.18, w: 8.65, h: 0.32, fill: { color: "008A99" }, line: { color: "008A99" } } },
    { rect: { x: 8.65, y: 7.18, w: 2.65, h: 0.32, fill: { color: "E20015" }, line: { color: "E20015" } } },
    { rect: { x: 11.30, y: 7.18, w: 2.03, h: 0.32, fill: { color: "00A7B5" }, line: { color: "00A7B5" } } },
    { text: { text: "Internal | Governed Enterprise Data", options: { x: 0.42, y: 7.22, w: 4.4, h: 0.12, fontFace: "Arial", fontSize: 5.5, color: "FFFFFF", margin: 0 } } },
    { text: { text: "BOSCH", options: { x: 11.83, y: 7.19, w: 0.9, h: 0.18, fontFace: "Arial", fontSize: 8, bold: true, color: "FFFFFF", align: "center", margin: 0 } } },
  ],
  slideNumber: { x: 0.36, y: 6.94, color: "65747A", fontFace: "Arial", fontSize: 7 },
});

const slide = pptx.addSlide("P&L_MASTER");
slide.background = { color: "FFFFFF" };

const teal = "008A99";
const darkTeal = "006B76";
const magenta = "C90073";
const ink = "263238";
const muted = "65747A";
const grid = "BCC7CA";
const pale = "EEF5F5";
const paleBlue = "EAF3F5";

slide.addText("P&L H1'26 – YoY : June'26 v June'25", {
  x: 0.48, y: 0.28, w: 6.7, h: 0.42,
  fontFace: "Arial", fontSize: 22, bold: true, color: magenta, margin: 0,
});
slide.addText("Entity P&L Analysis · {{entity}}", {
  x: 0.50, y: 0.78, w: 6.7, h: 0.22,
  fontFace: "Arial", fontSize: 10, color: teal, bold: true, margin: 0,
});
slide.addText("Values in mINR · {{comparison_label}}", {
  x: 7.35, y: 0.80, w: 2.35, h: 0.20,
  fontFace: "Arial", fontSize: 8, bold: true, color: ink, align: "right", margin: 0,
});
slide.addText("{{as_of_month}}", {
  x: 10.02, y: 0.80, w: 1.25, h: 0.20,
  fontFace: "Arial", fontSize: 8, bold: true, color: ink, align: "right", margin: 0,
});
slide.addText("{{currency}}", {
  x: 11.40, y: 0.80, w: 0.72, h: 0.20,
  fontFace: "Arial", fontSize: 8, bold: true, color: teal, align: "right", margin: 0,
});

const columns = ["BGSW India", "YE 2025", "CF05 2026", "YTD06 2026", "YTD06 2025", "Variance", "%"];
const labels = [
  "Revenue",
  "Employee Benefits",
  "Outsourcing Cost",
  "Consultancy Charges",
  "CI Charges & Other revenue",
  "Facilities Cost",
  "Other Expenses",
  "Total Expenses",
  "EBIT",
  "EBIT% of TNS",
  "End capacity outsourcing",
  "End capacity",
  "Total End",
  "Avg Capacity overall",
  "Avg Capacity outsourcing",
  "Total Average",
];
const placeholder = (row, col) => (col === 0 ? labels[row] : col === 6 ? "{{pct}}" : "{{value}}");
const tableRows = [
  columns.map((text, index) => ({
    text,
    options: {
      bold: true,
      color: index === 0 ? "FFFFFF" : darkTeal,
      fill: { color: index === 0 ? darkTeal : paleBlue },
      align: index === 0 ? "left" : "right",
      margin: 0.035,
    },
  })),
  ...labels.map((_, row) =>
    columns.map((__, col) => ({
      text: placeholder(row, col),
      options: {
        bold: [0, 7, 8, 9, 12, 15].includes(row),
        color: col === 0 ? ink : "3B474B",
        align: col === 0 ? "left" : "right",
        fill: { color: row % 2 === 0 ? "FFFFFF" : pale },
        margin: 0.035,
      },
    })),
  ),
];

slide.addTable(tableRows, {
  x: 0.48, y: 1.28, w: 6.02, h: 5.35,
  border: { type: "solid", color: grid, pt: 0.45 },
  fontFace: "Arial", fontSize: 6.1, color: ink,
  rowH: 0.255, margin: 0.035,
  colW: [1.72, 0.64, 0.64, 0.72, 0.72, 0.72, 0.46],
});

slide.addText("Revenue: Driven by the below key factors", {
  x: 6.82, y: 1.25, w: 5.92, h: 0.20,
  fontFace: "Arial", fontSize: 9.2, bold: true, color: ink, margin: 0,
});

const commentary = [
  ["Revenue", "• Rate increase +1%\n• Favorable forex impact +8%\n• Volume & Utilization impact -9%\n• Non-Effort based billing +2%\n(rate increase INR 86/USD to INR 91.3/USD) – gain of 8%."],
  ["Employee benefits", "Employee benefit increase is primarily on account of:\n• Volume & Pyramid mix -9.7%\n• CSR impact -21.3%\n• IRR impact including factor change +9.9%\n• Restructuring / debt factor like -4.2%"],
  ["Outsourcing cost", "Higher by +15% due YOY Per PMO rate increase (Majorly in BD & SDS) also outsourcing price impact."],
  ["Consultancy cost", "Higher by +658mINR, largely due one-time costs and project-related charges."],
  ["CI Charges & Other Revenue", "Largely on account of price increase, forex exchange rate impact and additional software purchases."],
  ["Facilities Cost", "Reduction in cost is on account of recovery from additional costs charged in FY22 & H1'26."],
  ["Other expenses", "Reduction is due to customer claim reversal, release of provision and other prior-period adjustments."],
];

let y = 1.55;
for (const [heading, body] of commentary) {
  slide.addText(heading, {
    x: 6.82, y, w: 1.46, h: 0.18,
    fontFace: "Arial", fontSize: 7.4, bold: true, color: darkTeal, margin: 0,
  });
  slide.addText(body, {
    x: 8.27, y: y - 0.01, w: 4.47, h: heading === "Employee benefits" ? 0.70 : 0.47,
    fontFace: "Arial", fontSize: 6.3, color: ink, breakLine: false, fit: "shrink",
    valign: "top", margin: 0,
  });
  y += heading === "Employee benefits" ? 0.78 : 0.57;
}

slide.addText("{{evidence_note}}", {
  x: 6.82, y: 5.78, w: 5.85, h: 0.42,
  fontFace: "Arial", fontSize: 6.4, italic: true, color: muted,
  fit: "shrink", valign: "top", margin: 0,
});
slide.addText("Source: authorized Enterprise Data cube read at run time. Actual and CF scenarios remain separate.", {
  x: 6.82, y: 6.35, w: 5.85, h: 0.20,
  fontFace: "Arial", fontSize: 5.7, color: muted, margin: 0,
});

await pptx.writeFile({ fileName: "../../attached_assets/entity_pnl_bosch_template.pptx" });