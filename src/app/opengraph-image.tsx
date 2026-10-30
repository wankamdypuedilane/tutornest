import { ImageResponse } from "next/og";

// The picture shown when a link to TutorNest is shared (Open Graph).
// Generated at build time, with ImageResponse's built-in font.
export const alt = "TutorNest: one-to-one mentoring for career changers in tech";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#14213d",
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: 36, color: "#7fd1d8" }}>Northlight Learning</div>
        <div style={{ fontSize: 76, lineHeight: 1.1, maxWidth: 960 }}>
          Learn faster with a mentor who has done it before.
        </div>
        <div style={{ fontSize: 40, fontWeight: 700 }}>TutorNest</div>
      </div>
    ),
    size,
  );
}
