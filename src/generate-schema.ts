import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import * as fs from "fs";
import * as path from "path";

export enum Severity {
  info = "info",
  low = "low",
  medium = "medium",
  high = "high",
  critical = "critical",
}

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  CONNECT = "CONNECT",
  OPTIONS = "OPTIONS",
  TRACE = "TRACE",
  PATCH = "PATCH",
  PURGE = "PURGE",
  Debug = "Debug",
}

export enum AttackType {
  batteringram = "batteringram",
  pitchfork = "pitchfork",
  clusterbomb = "clusterbomb",
}

export type NucleiRequest = {
  method: HttpMethod;
  path: string[];
  id?: string;
  name?: string;
  attack?: AttackType;
  body?: string;
  headers?: Record<string, string>;
  race_count?: number;
  "max-redirects"?: number;
  "pipeline-concurrent-connections"?: number;
  "pipeline-requests-per-connection"?: number;
  threads?: number;
  "max-size"?: number;
  redirects?: boolean;
  pipeline?: boolean;
  unsafe?: boolean;
  race?: boolean;
  "req-condition"?: boolean;
  "iterate-all"?: boolean;
  "skip-variables-check"?: boolean;
  "stop-at-first-match"?: boolean;
  "cookie-reuse"?: boolean;
};

type Classification = Partial<{
  "cve-id": string;
  "cwd-id": string;
  "cvss-metrics": string;
  "cvss-score": number;
}>;

type Info = {
  name: string;
  author: string; // Nuclei transform this in array, split by comma
  tags: string; // Nuclei transform this in array, split by comma
  description: string;
  reference: string[];
  severity: Severity;
  remediation?: string;
  classification?: Classification;
};

type NotAccepted = void;

export type NucleiYaml = {
  id: string;
  info: Info;
  requests?: NucleiRequest[];
  dns?: NotAccepted;
  file?: NotAccepted;
  network?: NotAccepted;
  headless?: NotAccepted;
  ssl?: NotAccepted;
  websocket?: NotAccepted;
  whois?: NotAccepted;
  signature?: any;
  "self-contained"?: boolean;
  "stop-at-first-match"?: boolean;
};

const notEmptyString = z.string().nonempty();

const integer = z.number().int().positive();

const nucleiArrayLike = z.string().regex(/^([a-zA-Z0-9_-]+,?)+$/);

const nucleiRequestSchema = z.object({
  method: z.nativeEnum(HttpMethod),
  path: z.array(z.string().nonempty()).nonempty(),
  attack: z.nativeEnum(AttackType).optional(),
  id: z.string().optional(),
  body: z.string().optional(),
  headers: z.record(z.string()).optional(),
  race_count: integer.optional(),
  threads: integer.optional(),
  redirects: z.boolean().optional(),
  pipeline: z.boolean().optional(),
  unsafe: z.boolean().optional(),
  race: z.boolean().optional(),
  "max-redirects": integer.optional(),
  "pipeline-concurrent-connections": integer.optional(),
  "pipeline-requests-per-connection": integer.optional(),
  "max-size": integer.optional(),
  "req-condition": z.boolean().optional(),
  "iterate-all": z.boolean().optional(),
  "skip-variables-check": z.boolean().optional(),
  "stop-at-first-match": z.boolean().optional(),
  "cookie-reuse": z.boolean().optional(),
});

const templateInfoSchema = z.object({
  name: notEmptyString,
  tags: nucleiArrayLike,
  author: nucleiArrayLike,
  description: notEmptyString.max(2048).optional(),
  reference: z.array(notEmptyString.url()).optional(),
  severity: z.nativeEnum(Severity).optional(),
  remediation: z.string().optional(),
  classification: z
    .object({
      "cve-id": z.string().regex(/^CVE-\d{4}-\d{4,7}$/),
      "cwd-id": z.string().regex(/^CWE-[0-9]+$/),
      "cvss-metrics": z.string(),
      "cvss-score": integer.min(0).max(10),
    })
    .optional(),
});

const templateSchema = z.object({
  id: z
    .string()
    .regex(/^([a-zA-Z0-9]+[-_])*[a-zA-Z0-9]+$/)
    .nonempty(),
  info: templateInfoSchema,
  requests: z.array(nucleiRequestSchema).nonempty(),
});

const jsonSchema: any = zodToJsonSchema(templateSchema, "template");

jsonSchema.title = "Pipeline schema";
jsonSchema.description = "A pipeline definition";

fs.writeFileSync(
  path.resolve(process.cwd(), "service-schema.json"),
  JSON.stringify(jsonSchema)
);
