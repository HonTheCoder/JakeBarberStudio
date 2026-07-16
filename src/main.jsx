import { createRoot } from "react-dom/client";
import App from "../App.jsx";

// StrictMode is intentionally omitted: in development it double-invokes
// effects, which creates two concurrent Firestore onSnapshot listeners
// before the first cleanup fires, tripping a Firestore 11.x internal
// assertion. The singleton registry in useFirestore.js handles
// deduplication, but removing StrictMode is the cleanest guarantee.
createRoot(document.getElementById("root")).render(<App />);