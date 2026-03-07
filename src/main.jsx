import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import V2VSite from "./veteran2veteran-site.jsx";
import BvaSearch from "./BvaSearch.jsx";
import NexusScout from "./NexusScout.jsx";
import Admin from "./Admin.jsx";
import PricingPage from "./PricingPage.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/bva" element={<BvaSearch />} />
        <Route path="/nexus-scout" element={<NexusScout />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/*" element={<V2VSite />} />
      </Routes>
    </BrowserRouter>
  );
}

const root = document.getElementById("root");
const seoPrerender = document.getElementById("seo-prerender");
if (seoPrerender) seoPrerender.remove();
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);