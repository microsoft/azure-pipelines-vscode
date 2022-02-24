import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

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
  author: string;
  tags: string;
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

const bool = z.boolean().optional();

const nucleiRequestSchema = z.object({
  method: z.nativeEnum(HttpMethod),
  path: z.array(z.string().nonempty()).nonempty(),
  attack: z.nativeEnum(AttackType).optional(),
  id: z.string().optional(),
  body: z.string().optional(),
  headers: z.record(z.string()).optional(),
  race_count: integer.optional(),
  threads: integer.optional(),
  redirects: bool,
  pipeline: bool,
  unsafe: bool,
  race: bool,
  "max-redirects": integer.optional(),
  "pipeline-concurrent-connections": integer.optional(),
  "pipeline-requests-per-connection": integer.optional(),
  "max-size": integer.optional(),
  "req-condition": bool,
  "iterate-all": bool,
  "skip-variables-check": bool,
  "stop-at-first-match": bool,
  "cookie-reuse": bool,
});

enum DnsRequestType {
  A = "A",
  NS = "NS",
  DS = "DS",
  CNAME = "SOA",
  PTR = "PTR",
  MX = "TXT",
  AAAA = "AAAA",
}

enum DnsClass {
  inet = "inet",
  csnet = "csnet",
  chaos = "chaos",
  hesiod = "hesiod",
  any = "any",
  none = "none",
}

const nucleiDnsSchema = z.object({
  id: notEmptyString,
  retries: integer.optional(),
  trace: bool,
  class: z.nativeEnum(DnsClass),
  name: notEmptyString.optional(),
  recursion: bool,
  type: z.nativeEnum(DnsRequestType),
  "trace-max-recursion": integer.optional(),
  resolvers: z.array(notEmptyString).optional(),
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
  "self-container": bool,
  "stop-at-first-match": bool,
  dns: z.array(nucleiDnsSchema).nonempty(),
  requests: z.array(nucleiRequestSchema).nonempty(),
});

const jsonSchema: any = zodToJsonSchema(templateSchema, "template");

jsonSchema.title = "Nuclei template schema";
jsonSchema.description = "A Nuclei template definition";

fs.writeFileSync(
  path.resolve(process.cwd(), "service-schema.json"),
  JSON.stringify(jsonSchema, null, 2)
);
