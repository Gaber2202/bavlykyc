import logoSrc from "@/assets/branding/bavly-travel-logo.png";
import { forwardRef } from "react";

type Section = { title: string; rows: [string, string][] };

interface Props {
  sections: Section[];
  recordId: string;
  clientFullName: string;
  generatedLabel: string;
}

/** Off-screen printable root for html2canvas (Arabic RTL + logo + English title). */
export const KycDetailPdfLayout = forwardRef<HTMLDivElement, Props>(
  function KycDetailPdfLayout(
    { sections, recordId, clientFullName, generatedLabel },
    ref,
  ) {
    return (
      <div
        ref={ref}
        dir="rtl"
        className="pdf-export-root"
        style={{
          position: "fixed",
          left: -20000,
          top: 0,
          width: 720,
          boxSizing: "border-box",
          padding: 28,
          backgroundColor: "#ffffff",
          color: "#1a1a1a",
          fontFamily:
            'system-ui, "Segoe UI", "Noto Sans Arabic", "Tahoma", sans-serif',
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        <header
          style={{
            display: "flex",
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 20,
            paddingBottom: 18,
            marginBottom: 22,
            borderBottom: "2px solid #2c2c2c",
          }}
        >
          <div style={{ flex: 1, textAlign: "right" }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#111827",
              }}
            >
              Client details
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#4b5563" }}>
              {clientFullName}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 10,
                color: "#6b7280",
                fontFamily: "ui-monospace, monospace",
                direction: "ltr",
                textAlign: "right",
              }}
            >
              ID: {recordId}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 9, color: "#9ca3af" }}>
              {generatedLabel}
            </p>
          </div>
          <div
            style={{
              flexShrink: 0,
              padding: 10,
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <img src={logoSrc} alt="" style={{ height: 52, width: "auto", display: "block" }} />
          </div>
        </header>

        {sections.map((sec) => (
          <section key={sec.title} style={{ marginBottom: 18 }}>
            <h2
              style={{
                margin: "0 0 10px",
                fontSize: 13,
                fontWeight: 700,
                color: "#374151",
                paddingBottom: 6,
                borderBottom: "1px solid #d1d5db",
              }}
            >
              {sec.title}
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 11,
              }}
            >
              <tbody>
                {sec.rows.map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td
                      style={{
                        width: "38%",
                        verticalAlign: "top",
                        padding: "8px 10px 8px 6px",
                        backgroundColor: "#f9fafb",
                        color: "#4b5563",
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        verticalAlign: "top",
                        padding: "8px 6px 8px 10px",
                        color: "#111827",
                        wordBreak: "break-word",
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    );
  },
);
