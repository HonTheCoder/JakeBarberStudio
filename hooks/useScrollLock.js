import { useEffect } from "react";

// Locks page scroll while a modal is open. Modals are rendered as
// position:fixed overlays — without this, the page behind them can still
// scroll, which visually disconnects the fixed modal from its backdrop.
//
// Multiple modals can be mounted at once (e.g. a confirm-delete dialog
// opened on top of an edit modal), so a counter on document.body tracks
// how many active locks are requesting the hold, and only restores
// scrolling once the last one unmounts.
const useScrollLock = () => {
  useEffect(() => {
    const body = document.body;
    const current = parseInt(body.dataset.modalLockCount || "0", 10);
    body.dataset.modalLockCount = String(current + 1);
    if (current === 0) {
      body.dataset.modalPrevOverflow = body.style.overflow || "";
      body.style.overflow = "hidden";
    }
    return () => {
      const next = parseInt(body.dataset.modalLockCount || "1", 10) - 1;
      body.dataset.modalLockCount = String(Math.max(next, 0));
      if (next <= 0) {
        body.style.overflow = body.dataset.modalPrevOverflow || "";
        delete body.dataset.modalLockCount;
        delete body.dataset.modalPrevOverflow;
      }
    };
  }, []);
};

export default useScrollLock;