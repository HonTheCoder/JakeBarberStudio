import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { C } from "../tokens/design";
import { Icon } from "../components/ui";
import { updateClient } from "../hooks/useFirestore";

/* ─────────────────────────────────────────────────────────────────────────────
   QR SCANNER MODAL
   Reads the Jake Barber Studio QR format: "jake-barber-studio:client:<id>"
   Props:
     clients   — full clients array (already loaded by ClientsPage)
     onFound   — (client) called when a match is found
     onClose   — dismiss without result
─────────────────────────────────────────────────────────────────────────────── */

const SCAN_INTERVAL_MS = 200;

const QRScannerModal = ({ clients = [], onFound, onClose }) => {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);
  const lastScanRef = useRef(0);

  const [status,      setStatus]      = useState("starting");
  const [errorMsg,    setErrorMsg]    = useState("");
  const [foundClient, setFoundClient] = useState(null);
  const [torchOn,     setTorchOn]     = useState(false);
  const [hasTorch,    setHasTorch]    = useState(false);
  const [scanLine,    setScanLine]    = useState(0);

  /* ── Animated scan line ───────────────────────────────────────────────── */
  useEffect(() => {
    if (status !== "scanning") return;
    let dir = 1, pos = 0;
    const id = setInterval(() => {
      pos += dir * 1.2;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0)   { pos = 0;   dir = 1; }
      setScanLine(pos);
    }, 16);
    return () => clearInterval(id);
  }, [status]);

  /* ── Stop camera ─────────────────────────────────────────────────────── */
  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  /* ── Handle decoded QR data ──────────────────────────────────────────── */
  // Declared BEFORE decode so useCallback can reference it without hoisting issues
  const handleQRData = useCallback((raw) => {
    const PREFIX = "jake-barber-studio:client:";
    if (!raw.startsWith(PREFIX)) {
      // Scanned a valid QR but not a Jake Barber Studio client card
      stopCamera();
      setErrorMsg(`Unrecognised QR code. Please scan a Jake Barber Studio client card.`);
      setStatus("error");
      return;
    }
    const clientId = raw.slice(PREFIX.length).trim();
    const match = clients.find(c => c.id === clientId);
    if (match) {
      stopCamera();

      // Bump visit count +1 and record today's visit date in Firestore.
      // Update local state immediately (optimistic) so the modal reflects
      // the new count without waiting on the round trip.
      const newVisits   = (parseInt(match.visits) || 0) + 1;
      const todayLabel   = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const updatedClient = { ...match, visits: newVisits, lastVisit: todayLabel };

      setFoundClient(updatedClient);
      setStatus("found");

      updateClient(match.id, { visits: newVisits, lastVisit: todayLabel }).catch(err => {
        console.error("[QRScannerModal] Failed to record visit:", err);
      });
    } else {
      stopCamera();
      setErrorMsg(`Client ID "${clientId.slice(0, 14)}…" not found in the system.`);
      setStatus("error");
    }
  }, [clients]);

  /* ── Decode loop ─────────────────────────────────────────────────────── */
  const decodeRef = useRef(null);

  useEffect(() => {
    decodeRef.current = () => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(decodeRef.current);
        return;
      }
      const now = performance.now();
      if (now - lastScanRef.current >= SCAN_INTERVAL_MS) {
        lastScanRef.current = now;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result  = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (result?.data) {
          handleQRData(result.data);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(decodeRef.current);
    };
  }, [handleQRData]);

  const startDecode = useCallback(() => {
    rafRef.current = requestAnimationFrame(decodeRef.current);
  }, []);

  /* ── Camera start ────────────────────────────────────────────────────── */
  const startCamera = useCallback(async () => {
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const track = stream.getVideoTracks()[0];
      const caps  = track.getCapabilities?.() ?? {};
      setHasTorch(!!caps.torch);
      setStatus("scanning");
      startDecode();
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("noperm");
      } else {
        setErrorMsg(err.message);
        setStatus("error");
      }
    }
  }, [startDecode]);

  /* ── Torch toggle ────────────────────────────────────────────────────── */
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch { /* ignore */ }
  };

  /* ── Lifecycle ───────────────────────────────────────────────────────── */
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { startCamera(); return () => stopCamera(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 2000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: 460, borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px",
          borderBottom: `1px solid ${C.outlineVariant}20`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: C.primaryContainer,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="qr_code_scanner" size={20} style={{ color: C.onPrimaryContainer }} />
            </div>
            <div>
              <p style={{ fontFamily: "Geist", fontSize: 15, fontWeight: 600, color: C.primary }}>
                Scan Client QR
              </p>
              <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 1 }}>
                Point the camera at the client&apos;s QR card
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 6, borderRadius: 8 }}
            onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
            onMouseOut={e => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px 24px" }}>

          {/* ── Viewfinder ── */}
          {(status === "starting" || status === "scanning") && (
            <div>
              <div style={{
                position: "relative", borderRadius: 16, overflow: "hidden",
                background: "#000", aspectRatio: "4/3", marginBottom: 16,
              }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {/* Corner brackets */}
                {[
                  { top: 20, left: 20,  bTop: true,  bLeft: true  },
                  { top: 20, right: 20, bTop: true,  bRight: true },
                  { bottom: 20, left: 20,  bBottom: true, bLeft: true  },
                  { bottom: 20, right: 20, bBottom: true, bRight: true },
                ].map((pos, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    top:    pos.top,
                    bottom: pos.bottom,
                    left:   pos.left,
                    right:  pos.right,
                    width: 28, height: 28,
                    borderTop:    pos.bTop    ? `3px solid ${C.primary}` : "none",
                    borderBottom: pos.bBottom ? `3px solid ${C.primary}` : "none",
                    borderLeft:   pos.bLeft   ? `3px solid ${C.primary}` : "none",
                    borderRight:  pos.bRight  ? `3px solid ${C.primary}` : "none",
                    borderTopLeftRadius:     (pos.bTop    && pos.bLeft)  ? 6 : 0,
                    borderTopRightRadius:    (pos.bTop    && pos.bRight) ? 6 : 0,
                    borderBottomLeftRadius:  (pos.bBottom && pos.bLeft)  ? 6 : 0,
                    borderBottomRightRadius: (pos.bBottom && pos.bRight) ? 6 : 0,
                  }} />
                ))}

                {/* Animated scan line */}
                {status === "scanning" && (
                  <div style={{
                    position: "absolute",
                    top: `${scanLine}%`,
                    left: 24, right: 24,
                    height: 2,
                    background: `linear-gradient(90deg, transparent, ${C.primary}, transparent)`,
                    borderRadius: 999,
                    transition: "top 0.05s linear",
                    boxShadow: `0 0 8px ${C.primary}80`,
                  }} />
                )}

                {/* Starting overlay */}
                {status === "starting" && (
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.5)",
                  }}>
                    <div style={{ textAlign: "center" }}>
                      <div className="spin" style={{
                        width: 32, height: 32, borderRadius: "50%",
                        border: `3px solid ${C.primary}40`,
                        borderTopColor: C.primary,
                        margin: "0 auto 12px",
                      }} />
                      <p style={{ fontFamily: "Geist", fontSize: 13, color: "#fff" }}>Starting camera…</p>
                    </div>
                  </div>
                )}

                {/* Torch button */}
                {hasTorch && status === "scanning" && (
                  <button
                    onClick={toggleTorch}
                    title="Toggle flashlight"
                    style={{
                      position: "absolute", bottom: 12, right: 12,
                      width: 36, height: 36, borderRadius: 10,
                      background: torchOn ? C.primary : "rgba(0,0,0,0.5)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Icon name={torchOn ? "flashlight_on" : "flashlight_off"} size={18} style={{ color: "#fff" }} />
                  </button>
                )}
              </div>

              {status === "scanning" && (
                <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant, textAlign: "center", lineHeight: 1.6 }}>
                  Hold steady — scanning automatically
                </p>
              )}
            </div>
          )}

          {/* ── No permission ── */}
          {status === "noperm" && (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16, margin: "0 auto 16px",
                background: C.errorContainer,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="no_photography" size={28} style={{ color: C.error }} />
              </div>
              <p style={{ fontFamily: "Geist", fontSize: 15, fontWeight: 600, color: C.primary, marginBottom: 8 }}>
                Camera access denied
              </p>
              <p style={{ fontFamily: "Geist", fontSize: 13, color: C.onSurfaceVariant, marginBottom: 24, lineHeight: 1.6, maxWidth: 300, margin: "0 auto 24px" }}>
                Allow camera access in your browser settings, then try again.
              </p>
              <button
                onClick={startCamera}
                style={{
                  padding: "10px 24px", borderRadius: 12, background: C.primary, color: "#fff",
                  fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {status === "error" && (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16, margin: "0 auto 16px",
                background: C.surfaceLow,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="qr_code_2_add" size={28} style={{ color: C.onSurfaceVariant }} />
              </div>
              <p style={{ fontFamily: "Geist", fontSize: 15, fontWeight: 600, color: C.primary, marginBottom: 8 }}>
                QR Not Recognised
              </p>
              <p style={{ fontFamily: "Geist", fontSize: 13, color: C.onSurfaceVariant, lineHeight: 1.6, maxWidth: 300, margin: "0 auto 24px" }}>
                {errorMsg || "This QR code doesn't match a client in the system."}
              </p>
              <button
                onClick={() => { setErrorMsg(""); startCamera(); }}
                style={{
                  padding: "10px 24px", borderRadius: 12, background: C.primary, color: "#fff",
                  fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                }}
              >
                Scan Again
              </button>
            </div>
          )}

          {/* ── Found ── */}
          {status === "found" && foundClient && (
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px", borderRadius: 12, marginBottom: 20,
                background: "#dcfce7", border: "1px solid #86efac",
              }}>
                <Icon name="check_circle" size={20} style={{ color: "#16a34a", flexShrink: 0 }} />
                <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: "#15803d" }}>
                  Client identified — visit recorded
                </p>
              </div>

              {/* Client card */}
              <div style={{
                background: C.surfaceLow, borderRadius: 16, padding: "20px",
                marginBottom: 20, display: "flex", alignItems: "center", gap: 16,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                  background: foundClient.status === "VIP" ? C.secondaryContainer : C.surfaceContainer,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Geist", fontSize: 18, fontWeight: 700,
                  color: foundClient.status === "VIP" ? C.secondary : C.onSurfaceVariant,
                }}>
                  {(foundClient.name ?? "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "Geist", fontSize: 17, fontWeight: 600, color: C.primary }}>{foundClient.name}</p>
                  <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant }}>
                      <b style={{ color: C.primary }}>{foundClient.visits ?? 0}</b> visits
                    </span>
                    {foundClient.phone && (
                      <span style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant }}>{foundClient.phone}</span>
                    )}
                    {foundClient.haircutStyle && (
                      <span style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant }}>{foundClient.haircutStyle}</span>
                    )}
                  </div>
                  {foundClient.lastVisit && (
                    <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 3 }}>
                      Last visit: {foundClient.lastVisit}
                    </p>
                  )}
                </div>
                {foundClient.status && (
                  <span style={{
                    padding: "4px 12px", borderRadius: 999, flexShrink: 0,
                    background: foundClient.status === "VIP" ? C.secondaryContainer : C.surfaceContainer,
                    color: foundClient.status === "VIP" ? C.secondary : C.onSurfaceVariant,
                    fontFamily: "Geist", fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>
                    {foundClient.status}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setFoundClient(null); startCamera(); }}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12,
                    background: C.surfaceLow,
                    fontFamily: "Geist", fontSize: 12, fontWeight: 600,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    color: C.onSurfaceVariant,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = C.surfaceHigh)}
                  onMouseOut={e => (e.currentTarget.style.background = C.surfaceLow)}
                >
                  <Icon name="qr_code_scanner" size={15} />
                  Scan Another
                </button>
                <button
                  onClick={() => onFound(foundClient)}
                  style={{
                    flex: 2, padding: "11px 0", borderRadius: 12,
                    background: C.primary, color: "#fff",
                    fontFamily: "Geist", fontSize: 12, fontWeight: 600,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                  onMouseOver={e => (e.currentTarget.style.opacity = "0.88")}
                  onMouseOut={e => (e.currentTarget.style.opacity = "1")}
                >
                  <Icon name="person" size={15} />
                  Open Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;