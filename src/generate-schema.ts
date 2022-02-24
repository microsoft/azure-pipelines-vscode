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

const notEmptyString = z.string().nonempty();

const integer = z.number().int().positive();

const nucleiArrayLike = z.string().regex(/^([a-zA-Z0-9_-]+,?)+$/);

const bool = z.boolean().optional();

const nucleiRequestSchema = z.object({
  method: z
    .nativeEnum(HttpMethod)
    .describe("Http method used for this request"),
  path: z
    .array(z.string().nonempty())
    .nonempty()
    .describe("All paths for the HTTP requests. It supports variables."),
  attack: z
    .nativeEnum(AttackType)
    .optional()
    .describe(
      "Type of payload combinations to perform. 'batteringram' is inserts the same payload into all defined payload positions at once, 'pitchfork' combines multiple payload sets and 'clusterbomb' generates permutations and combinations for all payloads."
    ),
  raw: z.array(notEmptyString).describe("Raw formats for HTTP requests."),
  id: z.string().optional().describe("ID for this request."),
  payloads: z
    .record(z.string())
    .describe(
      "Any payloads for the current request. But you can also provide a file as payload witch will be read on run-time."
    ),
  body: z
    .string()
    .optional()
    .describe("Parameter which contains HTTP request body."),
  headers: z
    .record(z.string())
    .optional()
    .describe("Http headers to send with this request."),
  race_count: integer
    .optional()
    .describe("Number of times to send a request in Race Condition Attack"),
  threads: integer
    .optional()
    .describe(
      "Specify number of threads to use sending requests. This enables Connection Pooling."
    ),
  redirects: bool.describe(
    "Redirects specifies whether redirects should be followed by the HTTP Client. This can be used in conjunction with `max-redirects` to control the HTTP request redirects."
  ),
  pipeline: bool.describe(
    "Pipeline defines if the attack should be performed with HTTP 1.1 Pipelining. All requests must be idempotent (GET/POST). This can be used for race conditions/billions requests"
  ),
  unsafe: bool.describe(
    "Specifies whether to use raw http engine for sending Non RFC-Compliant requests."
  ),
  race: bool.describe(
    "Determines if all the request have to be attemped at the same time (Race Condition). The actual number of requests that will be sent is determined by 'race_count' field."
  ),
  "max-redirects": integer
    .optional()
    .describe("Maximum number of redirects that should be followed"),
  "pipeline-concurrent-connections": integer
    .optional()
    .describe("Number of connections to create during pipelining."),
  "pipeline-requests-per-connection": integer
    .optional()
    .describe("Number of requests to send per connection when pipelining."),
  "max-size": integer
    .optional()
    .describe("Maximum size of http response body to read in bytes."),
  "req-condition": bool.describe(
    "Automatically assigns numbers to requests and preservers their history. This allow matching on them later for multi-request conditions."
  ),
  "iterate-all": bool.describe(
    "Iterates all the values extracted from internal extractors."
  ),
  "skip-variables-check": bool.describe(
    "Skips the check for unresolved variables in request."
  ),
  "stop-at-first-match": bool.describe(
    "Stops the execution of the requests and template as soon as match is found."
  ),
  "cookie-reuse": bool.describe(
    "Setting that enable cookie reuse for all requests defined in raw section."
  ),
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
  id: notEmptyString.describe("Id of this request."),
  retries: integer
    .optional()
    .describe("Number of retries for the DNS request."),
  trace: bool.describe("Performs a trace operation for the target."),
  class: z
    .nativeEnum(DnsClass)
    .describe(
      "The class of DNS request. Usually it's enough to just leave it as INET."
    ),
  name: notEmptyString
    .optional()
    .describe(
      "Hostname to make DNS request for. Generally, it is set to {{FQDN}} which is the domain we get from input."
    ),
  recursion: bool.describe(
    "Determines if resolver should recurse all records to get fresh results."
  ),
  type: z.nativeEnum(DnsRequestType).describe("Type of DNS request to make."),
  "trace-max-recursion": integer
    .optional()
    .describe("Number of max recursion allowed for trace operations."),
  resolvers: z
    .array(notEmptyString)
    .optional()
    .describe("Resolvers to use for the dns requests."),
});

const templateInfoSchema = z.object({
  name: notEmptyString.describe(
    "Name of this template. Should be good short summary that identifies what the template does."
  ),
  tags: nucleiArrayLike.describe(
    "Any tags for the template. Multiple values also can be specified separated by comas. 'foo,bar'"
  ),
  author: nucleiArrayLike.describe(
    "Authors of this template. Multiple values also can be specified separated by comas. 'foo,bar'"
  ),
  description: notEmptyString
    .max(2048)
    .optional()
    .describe(
      "Description of this template, you can go in-depth here on what this template actually does."
    ),
  reference: z
    .array(notEmptyString.url())
    .optional()
    .describe("Reference should contain links relevant to this template."),
  severity: z
    .nativeEnum(Severity)
    .optional()
    .describe("Severity level of this template."),
  remediation: z
    .string()
    .optional()
    .describe(
      "Remediation steps, how to mitigate the problem found by this template."
    ),
  classification: z
    .object({
      "cve-id": z
        .string()
        .regex(/^CVE-\d{4}-\d{4,7}$/)
        .describe("CVE id for this template."),
      "cwe-id": z
        .string()
        .regex(/^CWE-[0-9]+$/)
        .describe("CWE id for this template."),
      "cvss-metrics": z.string().describe("CVSS metrics."),
      "cvss-score": integer
        .min(0)
        .max(10)
        .describe("CVSS score for this template."),
    })
    .describe("Information about CVE/CWE classification of this template.")
    .optional(),
});

const templateSchema = z.object({
  id: z
    .string()
    .regex(/^([a-zA-Z0-9]+[-_])*[a-zA-Z0-9]+$/)
    .nonempty()
    .describe("ID is the unique id for this template."),
  info: templateInfoSchema.describe(
    "Metadata information about this template."
  ),
  "self-container": bool.describe(
    "Mark requests for this template as self-contained."
  ),
  "stop-at-first-match": bool.describe(
    "Stop execution once first match is found."
  ),
  dns: z
    .array(nucleiDnsSchema)
    .nonempty()
    .describe("DNS contains the dns requests to make in this template."),
  requests: z
    .array(nucleiRequestSchema)
    .nonempty()
    .describe("Requests contains the http requests to make in this template."),
});

const jsonSchema: any = zodToJsonSchema(templateSchema, "template");

jsonSchema.title = "Nuclei template schema";
jsonSchema.description = "A Nuclei template definition";

fs.writeFileSync(
  path.resolve(process.cwd(), "service-schema.json"),
  JSON.stringify(jsonSchema, null, 2)
);
