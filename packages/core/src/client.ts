import type { ParseResult } from "./types.js";
import { parse } from "./parser.js";
import { parseJSON } from "./parser-json.js";

export interface ClientOptions {
  /** Request timeout in ms. Default: 10000. */
  timeout?: number;
  /** User-Agent header. Default: "agents-txt-client/0.1". */
  userAgent?: string;
}

const WELL_KNOWN_TXT = "/.well-known/agents.txt";
const FALLBACK_TXT = "/agents.txt";
const WELL_KNOWN_JSON = "/.well-known/agents.json";
const FALLBACK_JSON = "/agents.json";
const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const MAX_RESPONSE_BYTES = 1_048_576; // 1 MB

/**
 * Client for discovering and fetching agents.txt from websites.
 */
export class AgentsTxtClient {
  private timeout: number;
  private userAgent: string;

  constructor(options: ClientOptions = {}) {
    this.timeout = options.timeout ?? 10_000;
    this.userAgent = options.userAgent ?? "agents-txt-client/0.1";
  }

  /**
   * Discover agents.txt from a site. Tries /.well-known/agents.txt first,
   * falls back to /agents.txt.
   */
  async discover(baseUrl: string): Promise<ParseResult> {
    this.validateUrl(baseUrl);
    const normalized = baseUrl.replace(/\/+$/, "");

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
    this.validateUrl(baseUrl);
    const normalized = baseUrl.replace(/\/+$/, "");

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

  private validateUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }
    if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
      throw new Error(`Unsupported URL scheme: ${parsed.protocol} (only http and https are allowed)`);
    }
  }

  private async fetchText(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent },
        redirect: "follow",
        signal: controller.signal,
      });

      if (!response.ok) return null;

      // Check Content-Length if available to reject oversized responses early
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
        return null;
      }

      const text = await response.text();
      if (text.length > MAX_RESPONSE_BYTES) return null;

      return text;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
