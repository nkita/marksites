import type { AnnotationDocument } from "../annotations/model.js";

export interface MarkdownFile {
  sourcePath: string;
  relativePath: string;
  outputPath: string;
  metadataPath: string;
  source?: string;
  sourceHash?: string;
  annotations?: AnnotationDocument;
  annotationHash?: string;
}

export interface ManifestFile {
  sourceHash: string;
  annotationHash: string;
  output: string;
  annotations: string;
}

export interface BuildManifest {
  schemaVersion: 1;
  generator: {
    name: "marksites";
    version: string;
    outputCompatibilityVersion: number;
    renderFingerprint: string;
  };
  treeHash: string;
  files: Record<string, ManifestFile>;
}

export interface ConversionResult {
  converted: number;
  skipped: number;
  deleted: number;
  annotationsCreated: number;
  annotationsMoved: number;
  orphanedAnnotations: string[];
  outputRoot: string;
}
