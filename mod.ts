import type { Tool, ToolContext, PluginContext, ToolCallResult } from "cortex/plugins";

let config: Record<string, string> = {};

export async function onLoad(ctx: PluginContext): Promise<void> {
  config = {
    sentryAuthToken: (await ctx.config.get("sentryAuthToken")) ?? "",
    sentryOrg: (await ctx.config.get("sentryOrg")) ?? "",
    sentryDefaultProject: (await ctx.config.get("sentryDefaultProject")) ?? "",
  };
}

export async function onUnload(_ctx: PluginContext): Promise<void> {}

const SENTRY_API = "https://sentry.io/api/0";

async function sentryRequest(path: string): Promise<unknown> {
  const res = await fetch(`${SENTRY_API}${path}`, {
    headers: { Authorization: `Bearer ${config.sentryAuthToken}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : JSON.stringify(data));
  return data;
}

const sentry_list_issues: Tool = {
  definition: {
    name: "sentry_list_issues",
    description: "List error issues",
    params: [
      { name: "project", type: "string", description: "Sentry project slug", required: true },
      { name: "status", type: "string", description: "Issue status filter", required: false },
      { name: "limit", type: "number", description: "Max issues to return", required: false },
      { name: "environment", type: "string", description: "Environment filter", required: false },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const project = args.project as string;
      if (!project) {
        return { toolName: "sentry_list_issues", success: false, output: "", error: "project is required", durationMs: Date.now() - start };
      }
      const status = (args.status as string) ?? "unresolved";
      const limit = (args.limit as number) ?? 20;
      const query = `is:${status}` + (args.environment ? ` environment:${args.environment}` : "");

      const data = await sentryRequest(`/projects/${config.sentryOrg}/${project}/issues/?query=${encodeURIComponent(query)}&limit=${limit}`);
      const issues = (data as Record<string, unknown>[]).map((i: Record<string, unknown>) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        level: i.level,
        count: i.count,
        firstSeen: i.firstSeen,
        lastSeen: i.lastSeen,
      }));
      return { toolName: "sentry_list_issues", success: true, output: JSON.stringify(issues, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "sentry_list_issues", success: false, output: "", error: `Failed to list issues: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const sentry_get_issue: Tool = {
  definition: {
    name: "sentry_get_issue",
    description: "Get issue details",
    params: [
      { name: "issue_id", type: "string", description: "Sentry issue ID", required: true },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const issueId = args.issue_id as string;
      if (!issueId) {
        return { toolName: "sentry_get_issue", success: false, output: "", error: "issue_id is required", durationMs: Date.now() - start };
      }
      const data = await sentryRequest(`/issues/${issueId}/`);
      return { toolName: "sentry_get_issue", success: true, output: JSON.stringify(data, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "sentry_get_issue", success: false, output: "", error: `Failed to get issue: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const sentry_analyze_stacktrace: Tool = {
  definition: {
    name: "sentry_analyze_stacktrace",
    description: "Analyze stack trace",
    params: [
      { name: "issue_id", type: "string", description: "Sentry issue ID", required: true },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const issueId = args.issue_id as string;
      if (!issueId) {
        return { toolName: "sentry_analyze_stacktrace", success: false, output: "", error: "issue_id is required", durationMs: Date.now() - start };
      }

      const events = await sentryRequest(`/issues/${issueId}/events/?limit=1`) as Record<string, unknown>[];
      if (!events || events.length === 0) {
        return { toolName: "sentry_analyze_stacktrace", success: true, output: "No events found for this issue", durationMs: Date.now() - start };
      }

      const event = events[0];
      const entries = (event.entries as Record<string, unknown>[]) || [];
      const stacktraceEntry = entries.find((e: Record<string, unknown>) => e.type === "stacktrace");

      if (!stacktraceEntry) {
        return { toolName: "sentry_analyze_stacktrace", success: true, output: "No stacktrace available for this event", durationMs: Date.now() - start };
      }

      const frames = ((stacktraceEntry.data as Record<string, unknown>).frames as Record<string, unknown>[]) || [];
      const inAppFrames = frames.filter((f: Record<string, unknown>) => f.inApp);
      const analysis = {
        errorType: event.type || event.title,
        totalFrames: frames.length,
        inAppFrames: inAppFrames.length,
        topFrames: (inAppFrames.length > 0 ? inAppFrames : frames).slice(0, 5).map((f: Record<string, unknown>) => ({
          file: f.filename,
          function: f.function,
          line: f.lineNo,
          col: f.colNo,
          inApp: f.inApp,
        })),
      };

      return { toolName: "sentry_analyze_stacktrace", success: true, output: JSON.stringify(analysis, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "sentry_analyze_stacktrace", success: false, output: "", error: `Failed to analyze stacktrace: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const sentry_suggest_fix: Tool = {
  definition: {
    name: "sentry_suggest_fix",
    description: "Suggest fix for error",
    params: [
      { name: "issue_id", type: "string", description: "Sentry issue ID", required: true },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const issueId = args.issue_id as string;
      if (!issueId) {
        return { toolName: "sentry_suggest_fix", success: false, output: "", error: "issue_id is required", durationMs: Date.now() - start };
      }

      const data = await sentryRequest(`/issues/${issueId}/`) as Record<string, unknown>;
      const title = (data.title as string) || "";
      let suggestion = "Based on the error pattern, here are suggestions:\n\n";

      if (title.includes("TypeError")) {
        suggestion += "- Check for null/undefined references before accessing properties.\n- Add optional chaining (?.) or null checks.\n";
      } else if (title.includes("ReferenceError")) {
        suggestion += "- Verify that the variable or function is defined in scope.\n- Check for missing imports or hoisting issues.\n";
      } else if (title.includes("SyntaxError")) {
        suggestion += "- Review the code for syntax issues (missing brackets, quotes, etc.).\n- Ensure JSON payloads are properly formatted.\n";
      } else if (title.includes("Timeout")) {
        suggestion += "- Increase timeout thresholds for long-running operations.\n- Consider adding retry logic for transient failures.\n";
      } else if (title.includes("CORS")) {
        suggestion += "- Verify CORS headers are properly configured on the server.\n- Check that allowed origins include the request origin.\n";
      } else {
        suggestion += "- Review the full stacktrace to identify the root cause.\n- Add additional logging around the failing area.\n- Consider adding input validation to prevent invalid states.\n";
      }

      return { toolName: "sentry_suggest_fix", success: true, output: suggestion, durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "sentry_suggest_fix", success: false, output: "", error: `Failed to suggest fix: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const sentry_create_github_issue: Tool = {
  definition: {
    name: "sentry_create_github_issue",
    description: "Create GitHub issue from Sentry error",
    params: [
      { name: "issue_id", type: "string", description: "Sentry issue ID", required: true },
      { name: "repo", type: "string", description: "GitHub repository (owner/repo)", required: true },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const issueId = args.issue_id as string;
      const repo = args.repo as string;
      if (!issueId || !repo) {
        return { toolName: "sentry_create_github_issue", success: false, output: "", error: "issue_id and repo are required", durationMs: Date.now() - start };
      }

      const data = await sentryRequest(`/issues/${issueId}/`) as Record<string, unknown>;
      const title = `[Sentry] ${data.title || "Error reported"}`;
      const body = [
        `## Sentry Issue: ${data.shortId || issueId}`,
        "",
        `- **Error Type:** ${data.type || "Unknown"}`,
        `- **Level:** ${data.level || "error"}`,
        `- **Status:** ${data.status || "unresolved"}`,
        `- **Events:** ${data.count || "N/A"}`,
        `- **First Seen:** ${data.firstSeen || "N/A"}`,
        `- **Last Seen:** ${data.lastSeen || "N/A"}`,
        "",
        `[View in Sentry](${data.permalink || ""})`,
      ].join("\n");

      const ghRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.sentryAuthToken}`, Accept: "application/vnd.github+json" },
        body: JSON.stringify({ title, body }),
      });
      const ghData = await ghRes.json() as Record<string, unknown>;
      if (!ghRes.ok) {
        return { toolName: "sentry_create_github_issue", success: false, output: "", error: `GitHub API: ${ghData.message}`, durationMs: Date.now() - start };
      }

      return { toolName: "sentry_create_github_issue", success: true, output: `GitHub issue created: ${ghData.html_url}`, durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "sentry_create_github_issue", success: false, output: "", error: `Failed to create issue: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

export const tools: Tool[] = [sentry_list_issues, sentry_get_issue, sentry_analyze_stacktrace, sentry_suggest_fix, sentry_create_github_issue];
