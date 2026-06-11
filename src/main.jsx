import { createRoot } from "react-dom/client";
import App from "../App.jsx";

// StrictMode is intentionally omitted: in development it double-invokes
// effects, which creates two concurrent Firestore onSnapshot listeners before
// the first cleanup fires. This trips a Firestore 11.x internal assertion
// ("Unexpected state") that crashes all real-time listeners.
// The singleton registry in useFirestore.js handles deduplication, but
// removing StrictMode is the cleanest guarantee in dev.
createRoot(document.getElementById("root")).render(<App />);