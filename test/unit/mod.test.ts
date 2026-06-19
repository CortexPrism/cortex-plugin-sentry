import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import type { PluginContext, ToolContext } from '../../types.ts';

// Mock PluginContext
const mockContext: PluginContext & ToolContext = {
  pluginId: 'cortex-plugin-sentry',
  pluginDir: '/tmp/plugins/cortex-plugin-sentry',
  state: {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    list: async () => ({}),
  },
  config: {
    get: async () => null,
    set: async () => {},
    getAll: async () => ({}),
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  host: {
    registerTool: () => {},
    unregisterTool: () => {},
  },
  sessionId: 'test-session',
  workingDir: '/tmp',
  agentId: 'test-agent',
  workspaceDir: '/tmp',
};

function findTool(name: string) {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

Deno.test('tools array — exports all tools', () => {
  assertEquals(tools.length, 4);
  assertEquals(tools[0].definition.name, 'sentry_list_issues');
  assertEquals(tools[1].definition.name, 'sentry_get_issue');
  assertEquals(tools[2].definition.name, 'sentry_analyze_stacktrace');
  assertEquals(tools[3].definition.name, 'sentry_suggest_fix');
});

Deno.test('sentry_list_issues — rejects empty project', async () => {
  const tool = findTool('sentry_list_issues');
  const result = await tool.execute({ 'project': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('sentry_get_issue — rejects empty issue_id', async () => {
  const tool = findTool('sentry_get_issue');
  const result = await tool.execute({ 'issue_id': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('sentry_analyze_stacktrace — rejects empty issue_id', async () => {
  const tool = findTool('sentry_analyze_stacktrace');
  const result = await tool.execute({ 'issue_id': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('sentry_suggest_fix — rejects empty issue_id', async () => {
  const tool = findTool('sentry_suggest_fix');
  const result = await tool.execute({ 'issue_id': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('all tools return durationMs', async () => {
  for (const tool of tools) {
    const args: Record<string, unknown> = {};
    const result = await tool.execute(args, mockContext);
    assertEquals(typeof result.durationMs, 'number');
    assertEquals(result.durationMs >= 0, true);
  }
});
