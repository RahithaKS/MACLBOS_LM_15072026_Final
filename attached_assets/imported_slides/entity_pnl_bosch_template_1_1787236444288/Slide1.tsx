import React, { useState, useEffect, useRef } from "react";
const Slide1: React.FC = () => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({
    s: 1,
    x: 0,
    y: 0
  });
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.min(w / 1280, h / 720);
      setLayout({
        s,
        x: (w - 1280 * s) / 2,
        y: (h - 720 * s) / 2
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div id="slide-1" ref={outerRef} className="w-screen h-screen overflow-hidden relative" style={{
    backgroundColor: "#000"
  }}><div id="slide-inner-1" style={{
      position: "absolute",
      width: "1280px",
      height: "720px",
      overflow: "hidden",
      transformOrigin: "top left",
      color: "#000000",
      backgroundColor: "#FFFFFF",
      transform: `scale(${layout.s})`,
      left: layout.x + "px",
      top: layout.y + "px"
    }}><div key={0} style={{
        position: "absolute",
        left: "0px",
        top: "689.28px",
        width: "1279.68px",
        height: "30.72px",
        boxSizing: "border-box",
        backgroundColor: "#00A7B5",
        border: "1.33px solid #00A7B5"
      }} /><div key={1} style={{
        position: "absolute",
        left: "0px",
        top: "689.28px",
        width: "830.4px",
        height: "30.72px",
        boxSizing: "border-box",
        backgroundColor: "#008A99",
        border: "1.33px solid #008A99"
      }} /><div key={2} style={{
        position: "absolute",
        left: "830.4px",
        top: "689.28px",
        width: "254.4px",
        height: "30.72px",
        boxSizing: "border-box",
        backgroundColor: "#E20015",
        border: "1.33px solid #E20015"
      }} /><div key={3} style={{
        position: "absolute",
        left: "1084.8px",
        top: "689.28px",
        width: "194.88px",
        height: "30.72px",
        boxSizing: "border-box",
        backgroundColor: "#00A7B5",
        border: "1.33px solid #00A7B5"
      }} /><div key={4} style={{
        position: "absolute",
        left: "40.32px",
        top: "693.12px",
        width: "422.4px",
        height: "11.52px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(5.5pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(5.5pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#FFFFFF"
          }}>{"Internal | Governed Enterprise Data"}</span></p></div><div key={5} style={{
        position: "absolute",
        left: "1135.68px",
        top: "690.24px",
        width: "86.4px",
        height: "17.28px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "center",
          lineHeight: "1.2",
          fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#FFFFFF"
          }}>{"BOSCH"}</span></p></div><div key={6} style={{
        position: "absolute",
        left: "46.08px",
        top: "26.88px",
        width: "643.2px",
        height: "40.32px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(22pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(22pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#C90073"
          }}>{"P&L H1'26 \u2013 YoY : June'26 v June'25"}</span></p></div><table key={7} style={{
        position: "absolute",
        left: "46.08px",
        top: "122.88px",
        width: "539.52px",
        height: "416.16px",
        borderCollapse: "collapse",
        tableLayout: "fixed"
      }}><colgroup><col style={{
            width: "30.6%"
          }} /><col style={{
            width: "11.39%"
          }} /><col style={{
            width: "11.39%"
          }} /><col style={{
            width: "12.81%"
          }} /><col style={{
            width: "12.81%"
          }} /><col style={{
            width: "12.81%"
          }} /><col style={{
            width: "8.19%"
          }} /></colgroup><tbody><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#006B76",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#FFFFFF"
                }}>{"BGSW India"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EAF3F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#006B76"
                }}>{"YE 2025"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EAF3F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#006B76"
                }}>{"CF05 2026"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EAF3F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#006B76"
                }}>{"YTD06 2026"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EAF3F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#006B76"
                }}>{"YTD06 2025"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EAF3F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#006B76"
                }}>{"Variance"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EAF3F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#006B76"
                }}>{"%"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#263238"
                }}>{"Revenue"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#263238"
                }}>{"Employee Benefits"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#263238"
                }}>{"Outsourcing Cost"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#263238"
                }}>{"Consultancy Charges"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#263238"
                }}>{"CI Charges & Other revenue"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#263238"
                }}>{"Facilities Cost"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#263238"
                }}>{"Other Expenses"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#263238"
                }}>{"Total Expenses"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#263238"
                }}>{"EBIT"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#263238"
                }}>{"EBIT% of TNS"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#263238"
                }}>{"End capacity outsourcing"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#263238"
                }}>{"End capacity"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#263238"
                }}>{"Total End"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#263238"
                }}>{"Avg Capacity overall"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#263238"
                }}>{"Avg Capacity outsourcing"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr><tr style={{
            height: "24.48px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "left",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#263238"
                }}>{"Total Average"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{value}}"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#EEF5F5",
              borderTop: "1px solid #BCC7CA",
              borderBottom: "1px solid #BCC7CA",
              borderLeft: "1px solid #BCC7CA",
              borderRight: "1px solid #BCC7CA"
            }}><p style={{
                textAlign: "right",
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                  fontWeight: "700",
                  color: "#3B474B"
                }}>{"{{pct}}"}</span></p></td></tr></tbody></table><div key={8} style={{
        position: "absolute",
        left: "48px",
        top: "74.88px",
        width: "643.2px",
        height: "21.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(10pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(10pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#008A99"
          }}>{"Entity P&L Analysis \xB7 {{entity}}"}</span></p></div><div key={9} style={{
        position: "absolute",
        left: "705.6px",
        top: "76.8px",
        width: "225.6px",
        height: "19.2px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "right",
          lineHeight: "1.2",
          fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#263238"
          }}>{"Values in mINR \xB7 {{comparison_label}}"}</span></p></div><div key={10} style={{
        position: "absolute",
        left: "961.92px",
        top: "76.8px",
        width: "120px",
        height: "19.2px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "right",
          lineHeight: "1.2",
          fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#263238"
          }}>{"{{as_of_month}}"}</span></p></div><div key={11} style={{
        position: "absolute",
        left: "1094.4px",
        top: "76.8px",
        width: "69.12px",
        height: "19.2px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "right",
          lineHeight: "1.2",
          fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#008A99"
          }}>{"{{currency}}"}</span></p></div><div key={12} style={{
        position: "absolute",
        left: "654.72px",
        top: "120px",
        width: "568.32px",
        height: "19.2px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(9.2pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(9.2pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#263238"
          }}>{"Revenue: Driven by the below key factors"}</span></p></div><div key={13} style={{
        position: "absolute",
        left: "654.72px",
        top: "148.8px",
        width: "140.16px",
        height: "17.28px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#006B76"
          }}>{"Revenue"}</span></p></div><div key={14} style={{
        position: "absolute",
        left: "793.92px",
        top: "147.84px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0px 0px 0px 0px",
        ["--pptx-font-scale"]: "0.895",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"\u2022 Rate increase +1%"}</span></p><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"\u2022 Favorable forex impact +8%"}</span></p><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"\u2022 Volume & Utilization impact -9%"}</span></p><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"\u2022 Non-Effort based billing +2%"}</span></p><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"(rate increase INR 86/USD to INR 91.3/USD) \u2013 gain of 8%."}</span></p></div><div key={15} style={{
        position: "absolute",
        left: "654.72px",
        top: "203.52px",
        width: "140.16px",
        height: "17.28px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#006B76"
          }}>{"Employee benefits"}</span></p></div><div key={16} style={{
        position: "absolute",
        left: "793.92px",
        top: "202.56px",
        width: "429.12px",
        height: "67.2px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"Employee benefit increase is primarily on account of:"}</span></p><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"\u2022 Volume & Pyramid mix -9.7%"}</span></p><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"\u2022 CSR impact -21.3%"}</span></p><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"\u2022 IRR impact including factor change +9.9%"}</span></p><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"\u2022 Restructuring / debt factor like -4.2%"}</span></p></div><div key={17} style={{
        position: "absolute",
        left: "654.72px",
        top: "278.4px",
        width: "140.16px",
        height: "17.28px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#006B76"
          }}>{"Outsourcing cost"}</span></p></div><div key={18} style={{
        position: "absolute",
        left: "793.92px",
        top: "277.44px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"Higher by +15% due YOY Per PMO rate increase (Majorly in BD & SDS) also outsourcing price impact."}</span></p></div><div key={19} style={{
        position: "absolute",
        left: "654.72px",
        top: "333.12px",
        width: "140.16px",
        height: "17.28px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#006B76"
          }}>{"Consultancy cost"}</span></p></div><div key={20} style={{
        position: "absolute",
        left: "793.92px",
        top: "332.16px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"Higher by +658mINR, largely due one-time costs and project-related charges."}</span></p></div><div key={21} style={{
        position: "absolute",
        left: "654.72px",
        top: "387.84px",
        width: "140.16px",
        height: "17.28px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#006B76"
          }}>{"CI Charges & Other Revenue"}</span></p></div><div key={22} style={{
        position: "absolute",
        left: "793.92px",
        top: "386.88px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"Largely on account of price increase, forex exchange rate impact and additional software purchases."}</span></p></div><div key={23} style={{
        position: "absolute",
        left: "654.72px",
        top: "442.56px",
        width: "140.16px",
        height: "17.28px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#006B76"
          }}>{"Facilities Cost"}</span></p></div><div key={24} style={{
        position: "absolute",
        left: "793.92px",
        top: "441.6px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"Reduction in cost is on account of recovery from additional costs charged in FY22 & H1'26."}</span></p></div><div key={25} style={{
        position: "absolute",
        left: "654.72px",
        top: "497.28px",
        width: "140.16px",
        height: "17.28px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(7.4pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#006B76"
          }}>{"Other expenses"}</span></p></div><div key={26} style={{
        position: "absolute",
        left: "793.92px",
        top: "496.32px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#263238"
          }}>{"Reduction is due to customer claim reversal, release of provision and other prior-period adjustments."}</span></p></div><div key={27} style={{
        position: "absolute",
        left: "654.72px",
        top: "554.88px",
        width: "561.6px",
        height: "40.32px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.4pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontStyle: "italic",
            fontSize: "calc(6.4pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#65747A"
          }}>{"{{evidence_note}}"}</span></p></div><div key={28} style={{
        position: "absolute",
        left: "654.72px",
        top: "609.6px",
        width: "561.6px",
        height: "19.2px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(5.7pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(5.7pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#65747A"
          }}>{"Source: authorized Enterprise Data cube read at run time. Actual and CF scenarios remain separate."}</span></p></div><div key={29} style={{
        position: "absolute",
        left: "34.56px",
        top: "666.24px",
        width: "83.99px",
        height: "31.5px",
        boxSizing: "border-box",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.2",
          fontSize: "calc(7pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(7pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#65747A"
          }}>{"1"}</span></p></div></div></div>;
};
export default Slide1;
