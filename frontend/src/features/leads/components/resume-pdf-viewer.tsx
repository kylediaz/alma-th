"use client";

import { useMemo } from "react";
import { createPluginRegistration } from "@embedpdf/core";
import { EmbedPDF } from "@embedpdf/core/react";
import { usePdfiumEngine } from "@embedpdf/engines/react";
import {
  DocumentContent,
  DocumentManagerPluginPackage,
} from "@embedpdf/plugin-document-manager/react";
import { RenderLayer, RenderPluginPackage } from "@embedpdf/plugin-render/react";
import { Scroller, ScrollPluginPackage } from "@embedpdf/plugin-scroll/react";
import {
  Viewport,
  ViewportPluginPackage,
} from "@embedpdf/plugin-viewport/react";

type ResumePdfViewerProps = {
  src: string;
};

export function ResumePdfViewer({ src }: ResumePdfViewerProps) {
  const { engine, isLoading } = usePdfiumEngine();

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: src }],
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
    ],
    [src],
  );

  if (isLoading || !engine) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading PDF engine…
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden pr-6">
      <EmbedPDF engine={engine} plugins={plugins}>
        {({ activeDocumentId }) =>
          activeDocumentId ? (
            <DocumentContent documentId={activeDocumentId}>
              {({ isLoaded }) =>
                isLoaded ? (
                  <Viewport
                    documentId={activeDocumentId}
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: "transparent",
                    }}
                  >
                    <Scroller
                      documentId={activeDocumentId}
                      renderPage={({ width, height, pageIndex }) => (
                        <div style={{ width, height }}>
                          <RenderLayer
                            documentId={activeDocumentId}
                            pageIndex={pageIndex}
                          />
                        </div>
                      )}
                    />
                  </Viewport>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading resume…
                  </div>
                )
              }
            </DocumentContent>
          ) : null
        }
      </EmbedPDF>
    </div>
  );
}
