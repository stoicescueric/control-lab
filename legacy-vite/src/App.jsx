import { HashRouter, Routes, Route } from "react-router-dom";
import { MDXProvider } from "@mdx-js/react";
import mdxComponents from "./components/mdx-components.jsx";
import Layout from "./components/layout/Layout.jsx";
import Home from "./pages/Home.jsx";
import LessonPage from "./pages/LessonPage.jsx";

/* HashRouter keeps deep links working on GitHub Pages (and any static host)
   with zero server config — every route lives after the `#`. */
export default function App() {
  return (
    <MDXProvider components={mdxComponents}>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="lessons/:id" element={<LessonPage />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </HashRouter>
    </MDXProvider>
  );
}
