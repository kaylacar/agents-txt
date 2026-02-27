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
    const normalized = baseUrl.replace(/\/+$/, "");

    // Try well-known first
    const primary = await this.fetchText(`${normalized}${WELL_KNOWN_TXT}`);
    if (primary.ok) return parse(primary.text);

    // Fallback
    const fallback = await this.fetchText(`${normalized}${FALLBACK_TXT}`);
    if (fallback.ok) return parse(fallback.text);

    return {
      success: false,
      errors: [{ message: `No agents.txt found at ${normalized} (${fallback.error ?? primary.error ?? "not found"})` }],
      warnings: [],
    };
  }

  /**
   * Discover agents.json from a site. Tries /.well-known/agents.json first,
   * falls back to /agents.json.
   */
  async discoverJSON(baseUrl: string): Promise<ParseResult> {
    const normalized = baseUrl.replace(/\/+$/, "");

    const primary = await this.fetchText(`${normalized}${WELL_KNOWN_JSON}`);
    if (primary.ok) return parseJSON(primary.text);

    const fallback = await this.fetchText(`${normalized}${FALLBACK_JSON}`);
    if (fallback.ok) return parseJSON(fallback.text);

    return {
      success: false,
      errors: [{ message: `No agents.json found at ${normalized} (${fallback.error ?? primary.error ?? "not found"})` }],
      warnings: [],
    };
  }

  private async fetchText(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent },
        signal: controller.signal,
      });

      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      return { ok: true, text: await response.text() };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      return { ok: false, error: message };
    } finally {
      clearTimeout(timer);
    }
  }
}
