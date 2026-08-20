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
      const s = Math.min(w / 1279.68, h / 720);
      setLayout({
        s,
        x: (w - 1279.68 * s) / 2,
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
      width: "1279.68px",
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
        left: "46.08px",
        top: "26.88px",
        width: "643.2px",
        height: "40.32px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4.8px 9.6px 4.8px 9.6px",
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
            color: "#000000"
          }}>{"Entity P&L Analysis \xB7 BGSW"}</span></p></div><table key={1} style={{
        position: "absolute",
        left: "46.08px",
        top: "122.88px",
        width: "577.92px",
        height: "513.6px",
        borderCollapse: "collapse",
        tableLayout: "fixed"
      }}><colgroup><col style={{
            width: "20%"
          }} /><col style={{
            width: "20%"
          }} /><col style={{
            width: "20%"
          }} /><col style={{
            width: "20%"
          }} /><col style={{
            width: "20%"
          }} /></colgroup><tbody><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#439798",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontWeight: "700",
                  color: "#FFFFFF"
                }}>{"Line item"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#439798",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontWeight: "700",
                  color: "#FFFFFF"
                }}>{"Aug 2026 MTD"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#439798",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontWeight: "700",
                  color: "#FFFFFF"
                }}>{"May 2026 MTD"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#439798",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontWeight: "700",
                  color: "#FFFFFF"
                }}>{"CF05 MTD"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              backgroundColor: "#439798",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  fontWeight: "700",
                  color: "#FFFFFF"
                }}>{"Dec 2025 YE"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"Revenue"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B9668,120,584"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"Employee Benefits"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B9296,267,796"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"Outsourcing Cost"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B916,513,489"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"Consultancy Charges"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B916,223,525"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"CI Charges & Other Revenue"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B98,708,940"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"Facilities Cost"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B96,601,261"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"Other Expenses"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B910,172,562"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"Total Expenses"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B9638,901,860"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"EBIT"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B90"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u20B929,218,724"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"EBIT%"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u2014"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u2014"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u2014"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"4.4%"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"End Capacity"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"0"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"0"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u2014"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"2,530"}</span></p></td></tr><tr style={{
            height: "39.51px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"Average Capacity"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"0"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"0"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"\u2014"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "6.1pt",
              borderTop: "1px solid #D8E0E0",
              borderBottom: "1px solid #D8E0E0",
              borderLeft: "1px solid #D8E0E0",
              borderRight: "1px solid #D8E0E0"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(6.1pt * var(--pptx-font-scale, 1))",
                  color: "#000000"
                }}>{"2,539"}</span></p></td></tr></tbody></table><div key={2} style={{
        position: "absolute",
        left: "48px",
        top: "74.88px",
        width: "643.2px",
        height: "21.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "4.8px 9.6px 4.8px 9.6px",
        ["--pptx-font-scale"]: "0.514",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          textIndent: "-36px",
          paddingLeft: "36px",
          fontSize: "calc(7pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px"
          }}>{"&#x2022;"}</span><span style={{
            fontSize: "calc(7pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#000000"
          }}>{"Revenue changed by \u20B90 between the two selected quarter-end MTD periods."}</span></p><p style={{
          lineHeight: "1.2",
          fontSize: "calc(7pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontStyle: "italic",
            fontSize: "calc(7pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#7A8A8B"
          }}>{"\u2026 1 more paragraph \u2014 see the PDF summary."}</span></p></div><div key={3} style={{
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
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"Values in INR"}</span></p></div><div key={4} style={{
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
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"Aug 2026 MTD vs May 2026 MTD \xB7 QoQ MTD"}</span></p></div><div key={5} style={{
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
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(8pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"Aug 2026 MTD vs May 2026 MTD \xB7 QoQ MTD"}</span></p></div><div key={6} style={{
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
        padding: "4.8px 9.6px 4.8px 9.6px",
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
            color: "#000000"
          }}>{"Aug 2026 MTD vs May 2026 MTD \xB7 QoQ MTD"}</span></p></div><div key={7} style={{
        position: "absolute",
        left: "793.92px",
        top: "147.84px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontStyle: "italic",
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#000000"
          }}>{"Read-only run from the selected Enterprise cube for BGSW."}</span></p></div><div key={8} style={{
        position: "absolute",
        left: "793.92px",
        top: "277.44px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontStyle: "italic",
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#000000"
          }}>{"Read-only run from the selected Enterprise cube for BGSW."}</span></p></div><div key={9} style={{
        position: "absolute",
        left: "793.92px",
        top: "332.16px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontStyle: "italic",
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#000000"
          }}>{"Read-only run from the selected Enterprise cube for BGSW."}</span></p></div><div key={10} style={{
        position: "absolute",
        left: "793.92px",
        top: "386.88px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontStyle: "italic",
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#000000"
          }}>{"Read-only run from the selected Enterprise cube for BGSW."}</span></p></div><div key={11} style={{
        position: "absolute",
        left: "793.92px",
        top: "441.6px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontStyle: "italic",
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#000000"
          }}>{"Read-only run from the selected Enterprise cube for BGSW."}</span></p></div><div key={12} style={{
        position: "absolute",
        left: "793.92px",
        top: "496.32px",
        width: "429.12px",
        height: "45.12px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontStyle: "italic",
            fontSize: "calc(6.3pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#000000"
          }}>{"Read-only run from the selected Enterprise cube for BGSW."}</span></p></div><div key={13} style={{
        position: "absolute",
        left: "654.72px",
        top: "554.88px",
        width: "561.6px",
        height: "40.32px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4.8px 9.6px 4.8px 9.6px",
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
            color: "#000000"
          }}>{"Read-only run from the selected Enterprise cube for BGSW."}</span></p></div><div key={14} style={{
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
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(5.7pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontStyle: "italic",
            fontSize: "calc(5.7pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#000000"
          }}>{"Read-only run from the selected Enterprise cube for BGSW."}</span></p></div><div key={15} style={{
        position: "absolute",
        left: "34.56px",
        top: "666.24px",
        width: "83.52px",
        height: "31.68px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(7pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontStyle: "italic",
            fontSize: "calc(7pt * var(--pptx-font-scale, 1))",
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            color: "#000000"
          }}>{"Read-only run from the selected Enterprise cube for BGSW."}</span></p></div></div></div>;
};
export default Slide1;
