import type { AnnotationDocument } from "../annotations/model.js";

export interface MarkdownFile {
  sourcePath: string;
  relativePath: string;
  outputPath: string;
  metadataPath: string;
  source?: string;
  sourceHash?: string;
  modifiedAt?: string;
  annotations?: AnnotationDocument;
  annotationHash?: string;
  assetHash?: string;
  assetOutputs?: string[];
  rewriteImages?: (token: import("marked").Token) => void;
  previousSource?: string;
  latestSource?: string;
  historyPath?: string;
  previousHistoryPath?: string;
  preservedDiffContent?: string;
  historyVersions?: HistoryVersion[];
}

export interface HistoryVersion {
  sourceHash: string;
  path: string;
  modifiedAt?: string;
  source?: string;
}

export interface ManifestFile {
  sourceHash: string;
  modifiedAt: string;
  annotationHash: string;
  output: string;
  annotations: string;
  assetHash?: string;
  assets?: string[];
  history?: string;
  previousHistory?: string;
  historyVersions?: HistoryVersion[];
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
  historyLimit?: number;
  documentDiff?: boolean;
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

export interface ConversionOptions {
  onLog?: (message: string) => void;
  historyLimit?: number;
  documentDiff?: boolean;
}
