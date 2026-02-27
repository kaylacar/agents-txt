import { parse } from "./parser.js";
import { parseJSON } from "./parser-json.js";
import type { ParseResult } from "./types.js";

export interface ClientOptions {
  /** Request timeout in ms. Default: 10000. */
  timeout?: number;
  /** User-Agent header. Default: "agents-txt-client/0.1". */
  userAgent?: string;
  /** Maximum response size in bytes. Default: 1048576 (1 MB). */
  maxResponseSize?: number;
}

const WELL_KNOWN_TXT = "/.well-known/agents.txt";
const FALLBACK_TXT = "/agents.txt";
const WELL_KNOWN_JSON = "/.well-known/agents.json";
const FALLBACK_JSON = "/agents.json";

const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

/**
 * Client for discovering and fetching agents.txt from websites.
 */
export class AgentsTxtClient {
  private timeout: number;
  private userAgent: string;
  private maxResponseSize: number;

  constructor(options: ClientOptions = {}) {
    this.timeout = options.timeout ?? 10_000;
    this.userAgent = options.userAgent ?? "agents-txt-client/0.1";
    this.maxResponseSize = options.maxResponseSize ?? 1024 * 1024;
  }

  /**
   * Discover agents.txt from a site. Tries /.well-known/agents.txt first,
   * falls back to /agents.txt.
   */
  async discover(baseUrl: string): Promise<ParseResult> {
    const normalized = this.normalizeUrl(baseUrl);
    if (!normalized) {
      return { success: false, errors: [{ message: `Invalid URL: ${baseUrl}` }], warnings: [] };
    }

    // Try well-known first
    const primary = await this.fetchText(`${normalized}${WELL_KNOWN_TXT}`);
    if (primary) return parse(primary);

    // Fallback
    const fallback = await this.fetchText(`${normalized}${FALLBACK_TXT}`);
    if (fallback) return parse(fallback);

    return {
      success: false,
      errors: [{ message: `No agents.txt found at ${normalized}` }],
      warnings: [],
    };
  }

  /**
   * Discover agents.json from a site. Tries /.well-known/agents.json first,
   * falls back to /agents.json.
   */
  async discoverJSON(baseUrl: string): Promise<ParseResult> {
    const normalized = this.normalizeUrl(baseUrl);
    if (!normalized) {
      return { success: false, errors: [{ message: `Invalid URL: ${baseUrl}` }], warnings: [] };
    }

    const primary = await this.fetchText(`${normalized}${WELL_KNOWN_JSON}`);
    if (primary) return parseJSON(primary);

    const fallback = await this.fetchText(`${normalized}${FALLBACK_JSON}`);
    if (fallback) return parseJSON(fallback);

    return {
      success: false,
      errors: [{ message: `No agents.json found at ${normalized}` }],
      warnings: [],
    };
  }

  private normalizeUrl(baseUrl: string): string | null {
    const stripped = baseUrl.replace(/\/+$/, "");
    try {
      const parsed = new URL(stripped);
      if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return null;
    }
  }

  private async fetchText(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent },
        signal: controller.signal,
        redirect: "follow",
      });

      if (!response.ok) return null;

      // Check Content-Length if available
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > this.maxResponseSize) {
        return null;
      }

      const text = await response.text();
      if (text.length > this.maxResponseSize) return null;

      return text;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
