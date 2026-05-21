import { C } from "../tokens/design";
import { Icon } from "../components/ui";

const ComingSoonPage = ({ title }) => (
  <div
    style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "60vh", animation: "fadeUp 0.4s ease",
    }}
  >
    <div
      style={{
        width: 80, height: 80, background: C.surfaceLow, borderRadius: 24,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
      }}
    >
      <Icon name="construction" size={36} style={{ color: C.onSurfaceVariant, opacity: 0.4 }} />
    </div>
    <h3 style={{ fontFamily: "Geist", fontSize: 24, fontWeight: 500, color: C.primary, marginBottom: 10 }}>
      {title}
    </h3>
    <p style={{ color: C.onSurfaceVariant, fontSize: 15 }}>
      This page will be wired up with Firebase soon.
    </p>
  </div>
);

export default ComingSoonPage;
