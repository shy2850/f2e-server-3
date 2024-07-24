import React from "react";
import { createRoot } from "react-dom/client";
import hljs from "highlight.js"
import App from './app'

const container = document.getElementById("app");
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}

const iframe = document.querySelector<HTMLIFrameElement>("iframe");
if (iframe) {
    iframe.addEventListener("load", () => {
        const doc = iframe.contentDocument
        if (doc) {
            const link = doc.createElement("link");
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("href", "/highlight/monokai-sublime.css?");
            doc.head.appendChild(link);
            doc.querySelectorAll('pre').forEach(code => {
                console.log(code);
                hljs.highlightElement(code);
            });
        }
    });
}