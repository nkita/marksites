export interface MarksitesServerOptions {
  outputRoot: string;
  entryPath?: string;
  host?: string;
  port?: number;
  projectId: string;
  projectName: string;
  documents: Map<string, string>;
  editable?: boolean;
  onAnnotationsChange: (document: string) => Promise<void>;
}

export interface RunningServer {
  url: string;
  close(): Promise<void>;
}
