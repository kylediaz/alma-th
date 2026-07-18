"use client";

import { PDFViewer } from "@embedpdf/react-pdf-viewer";

type ResumePdfViewerProps = {
  src: string;
};

export function ResumePdfViewer({ src }: ResumePdfViewerProps) {
  return (
    <div className="h-full w-full overflow-hidden">
      <PDFViewer
        style={{ height: "100%", width: "100%", border: "none" }}
        config={{
          src,
          tabBar: "never",
          theme: { preference: "light" },
          disabledCategories: [
            "annotation",
            "redaction",
            "form",
            "insert",
            "document",
            "panel",
            "tools",
            "history",
          ],
        }}
      />
    </div>
  );
}
