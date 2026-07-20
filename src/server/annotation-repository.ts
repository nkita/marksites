import { randomUUID } from "node:crypto";
import { resolve, sep } from "node:path";
import { readAnnotations, writeAnnotations } from "../annotations/storage.js";
import {
  validateAnnotation,
  validateAnnotationDocument,
  type Annotation,
  type AnnotationDocument,
  type AnnotationSelection,
} from "../annotations/model.js";

const MAX_BODY = 10_000,
  MAX_EXACT = 20_000,
  MAX_ANNOTATIONS = 5_000;
export class AnnotationRepository {
  private queues = new Map<string, Promise<void>>();
  constructor(
    private outputRoot: string,
    private documents: Map<string, string>,
    private onChange: (
      document: string,
      data: AnnotationDocument,
    ) => Promise<void>,
  ) {}
  private path(document: string): string {
    const relative = this.documents.get(document);
    if (!relative)
      throw Object.assign(new Error("Unknown document"), { statusCode: 404 });
    const path = resolve(this.outputRoot, ...relative.split("/"));
    if (path !== this.outputRoot && !path.startsWith(this.outputRoot + sep))
      throw Object.assign(new Error("Invalid document path"), {
        statusCode: 400,
      });
    return path;
  }
  get(document: string) {
    return readAnnotations(this.path(document), document);
  }
  async exportProject(): Promise<{
    schemaVersion: 1;
    documents: AnnotationDocument[];
  }> {
    const documents = [];
    for (const document of [...this.documents.keys()].sort())
      documents.push(await this.get(document));
    return { schemaVersion: 1, documents };
  }
  async importProject(
    value: unknown,
    replace = false,
  ): Promise<AnnotationDocument[]> {
    if (
      typeof value !== "object" ||
      value === null ||
      (value as { schemaVersion?: unknown }).schemaVersion !== 1 ||
      !Array.isArray((value as { documents?: unknown }).documents)
    )
      throw Object.assign(new Error("Invalid annotation export"), {
        statusCode: 400,
      });
    const imported: AnnotationDocument[] = [];
    for (const candidate of (value as { documents: unknown[] }).documents) {
      const document = (candidate as { document?: unknown })?.document;
      if (typeof document !== "string")
        throw Object.assign(new Error("Invalid imported document"), {
          statusCode: 400,
        });
      let incoming: AnnotationDocument;
      try {
        incoming = validateAnnotationDocument(candidate, document);
      } catch {
        throw Object.assign(
          new Error(`Invalid imported annotations for ${document}`),
          { statusCode: 400 },
        );
      }
      await this.locked(document, async () => {
        const current = await this.get(document);
        const ids = new Set(current.annotations.map((item) => item.id));
        const additions = incoming.annotations.filter(
          (item) => !ids.has(item.id),
        );
        if (!replace && additions.length !== incoming.annotations.length)
          throw Object.assign(
            new Error(`Duplicate annotation ID in ${document}`),
            { statusCode: 409 },
          );
        const next: AnnotationDocument = {
          schemaVersion: 1,
          document,
          revision: current.revision + 1,
          annotations: replace
            ? incoming.annotations
            : [...current.annotations, ...additions],
        };
        if (next.annotations.length > MAX_ANNOTATIONS)
          throw Object.assign(new Error("Too many annotations"), {
            statusCode: 413,
          });
        await writeAnnotations(this.path(document), next);
        await this.onChange(document, next);
        imported.push(next);
      });
    }
    return imported;
  }
  private async locked<T>(
    document: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const prior = this.queues.get(document) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((r) => (release = r));
    const queued = prior.then(() => next);
    this.queues.set(document, queued);
    await prior;
    try {
      return await operation();
    } finally {
      release();
      if (this.queues.get(document) === queued) this.queues.delete(document);
    }
  }
  private checkRevision(data: AnnotationDocument, baseRevision: unknown) {
    if (baseRevision !== data.revision)
      throw Object.assign(new Error("Annotation revision conflict"), {
        statusCode: 409,
      });
  }
  async create(
    document: string,
    input: {
      baseRevision: unknown;
      selection: AnnotationSelection;
      comment: { body: string; author?: string | null };
    },
  ) {
    return this.locked(document, async () => {
      const data = await this.get(document);
      this.checkRevision(data, input.baseRevision);
      if (data.annotations.length >= MAX_ANNOTATIONS)
        throw Object.assign(new Error("Too many annotations"), {
          statusCode: 413,
        });
      const now = new Date().toISOString();
      const annotation: Annotation = {
        id: randomUUID(),
        selection: input.selection,
        comment: {
          body: input.comment?.body,
          author: input.comment?.author ?? null,
        },
        status: "open",
        createdAt: now,
        updatedAt: now,
      };
      validateAnnotation(annotation);
      this.validateLimits(annotation);
      data.annotations.push(annotation);
      data.revision++;
      await writeAnnotations(this.path(document), data);
      await this.onChange(document, data);
      return data;
    });
  }
  async update(
    document: string,
    id: string,
    input: {
      baseRevision: unknown;
      comment?: { body: string; author?: string | null };
      status?: "open" | "archived";
    },
  ) {
    return this.locked(document, async () => {
      const data = await this.get(document);
      this.checkRevision(data, input.baseRevision);
      const item = data.annotations.find((a) => a.id === id);
      if (!item)
        throw Object.assign(new Error("Annotation not found"), {
          statusCode: 404,
        });
      if (input.comment)
        item.comment = {
          body: input.comment.body,
          author: input.comment.author ?? item.comment.author,
        };
      if (input.status) item.status = input.status;
      item.updatedAt = new Date().toISOString();
      validateAnnotation(item);
      this.validateLimits(item);
      data.revision++;
      await writeAnnotations(this.path(document), data);
      await this.onChange(document, data);
      return data;
    });
  }
  async delete(document: string, id: string, baseRevision: unknown) {
    return this.locked(document, async () => {
      const data = await this.get(document);
      this.checkRevision(data, baseRevision);
      const index = data.annotations.findIndex((a) => a.id === id);
      if (index < 0)
        throw Object.assign(new Error("Annotation not found"), {
          statusCode: 404,
        });
      data.annotations.splice(index, 1);
      data.revision++;
      await writeAnnotations(this.path(document), data);
      await this.onChange(document, data);
      return data;
    });
  }
  private validateLimits(a: Annotation) {
    if (
      a.comment.body.length > MAX_BODY ||
      a.selection.exact.length > MAX_EXACT ||
      a.selection.prefix.length > 500 ||
      a.selection.suffix.length > 500
    )
      throw Object.assign(new Error("Annotation is too large"), {
        statusCode: 413,
      });
  }
}
