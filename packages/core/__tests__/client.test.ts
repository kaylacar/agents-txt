import { describe, it, expect } from "vitest";
import { AgentsTxtClient } from "../src/client.js";

describe("AgentsTxtClient", () => {
  describe("URL scheme validation", () => {
    const client = new AgentsTxtClient();

    it("rejects file:// URLs", async () => {
      await expect(client.discover("file:///etc/passwd")).rejects.toThrow("Unsupported URL scheme");
    });

    it("rejects ftp:// URLs", async () => {
      await expect(client.discover("ftp://evil.com")).rejects.toThrow("Unsupported URL scheme");
    });

    it("rejects javascript: URLs", async () => {
      await expect(client.discover("javascript:alert(1)")).rejects.toThrow("Unsupported URL scheme");
    });

    it("rejects invalid URLs", async () => {
      await expect(client.discover("not-a-url")).rejects.toThrow("Invalid URL");
    });

    it("accepts http:// URLs", async () => {
      // Will fail to connect, but should not throw a scheme error
      const result = await client.discover("http://127.0.0.1:1");
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain("No agents.txt found");
    });

    it("accepts https:// URLs", async () => {
      const result = await client.discover("https://127.0.0.1:1");
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain("No agents.txt found");
    });

    it("rejects file:// URLs on discoverJSON", async () => {
      await expect(client.discoverJSON("file:///etc/passwd")).rejects.toThrow("Unsupported URL scheme");
    });
  });
});
