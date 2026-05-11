interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Wolfram Alpha MCP — computational, factual, and quantitative queries
 *
 * Best for: math, unit conversions, science formulas, dates/calendars,
 * exchange rates with computation, demographic / geographic / chemical /
 * astronomical lookups. Returns one canonical answer (not a SERP).
 *
 * Free tier: ~2,000 queries/month.
 * API: https://products.wolframalpha.com/api/documentation
 *
 * Tools:
 * - short_answer: terse plain-text answer (best for agents)
 * - full_query:   structured "pods" with multi-step results
 */


const SHORT_URL = 'https://api.wolframalpha.com/v1/result';
const FULL_URL = 'https://api.wolframalpha.com/v2/query';

const tools: McpToolExport['tools'] = [
  {
    name: 'short_answer',
    description:
      'Get a single terse plain-text answer from Wolfram Alpha. Best for: arithmetic, unit conversion, "what is X", "how many Y in Z", factual lookups (planet diameter, country GDP, element atomic weight, current time in Tokyo). Returns one string.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural-language query' },
        units: {
          type: 'string',
          description: 'metric | imperial (default metric)',
          enum: ['metric', 'imperial'],
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'full_query',
    description:
      'Get the full structured result from Wolfram Alpha. Returns named "pods" (Input, Result, Solution, Plot, Properties, etc.) — useful when short_answer is too terse or you need multiple facets (e.g., element properties, equation solution + plot + alternate forms).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural-language query' },
        units: {
          type: 'string',
          description: 'metric | imperial (default metric)',
          enum: ['metric', 'imperial'],
        },
        include_pods: {
          type: 'string',
          description: 'Comma-separated pod IDs to restrict (e.g., "Result,Solution"). Default: return all.',
        },
        format: {
          type: 'string',
          description: 'plaintext (default) | plaintext,image — plaintext is most agent-friendly.',
        },
      },
      required: ['query'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const appId = (args._apiKey as string | undefined)?.trim();
  if (!appId) {
    throw new Error(
      'Wolfram Alpha requires an "AppID". Contact the operator about platform credentials, or BYO via ?_apiKey=<appid> after registering at https://developer.wolframalpha.com (free 2,000/mo).',
    );
  }
  switch (name) {
    case 'short_answer':
      return shortAnswer(appId, args);
    case 'full_query':
      return fullQuery(appId, args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function shortAnswer(appId: string, args: Record<string, unknown>) {
  const params = new URLSearchParams({ appid: appId, i: String(args.query) });
  if (args.units) params.set('units', String(args.units));

  const res = await fetch(`${SHORT_URL}?${params}`);
  if (res.status === 401) throw new Error('Wolfram Alpha: invalid AppID (HTTP 401)');
  if (res.status === 501) {
    return {
      query: args.query,
      answer: null,
      message: 'Wolfram Alpha did not understand the query (HTTP 501). Try rephrasing or use full_query for more context.',
    };
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Wolfram Alpha error: ${res.status} ${body.slice(0, 200)}`);
  }
  const text = await res.text();
  return { query: args.query, answer: text };
}

async function fullQuery(appId: string, args: Record<string, unknown>) {
  const params = new URLSearchParams({
    appid: appId,
    input: String(args.query),
    output: 'JSON',
    format: (args.format as string) ?? 'plaintext',
  });
  if (args.units) params.set('units', String(args.units));
  if (args.include_pods) params.set('includepodid', String(args.include_pods));

  const res = await fetch(`${FULL_URL}?${params}`);
  if (res.status === 401) throw new Error('Wolfram Alpha: invalid AppID (HTTP 401)');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Wolfram Alpha error: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    queryresult?: {
      success?: boolean;
      error?: boolean | { msg?: string };
      numpods?: number;
      pods?: WolframPod[];
      didyoumeans?: { val?: string } | { val?: string }[];
      tips?: { text?: string };
    };
  };

  const qr = data.queryresult;
  if (!qr || qr.success === false) {
    const err = typeof qr?.error === 'object' ? qr?.error?.msg : null;
    return {
      query: args.query,
      success: false,
      message: err ?? 'No interpretation found.',
      did_you_mean: extractDYM(qr?.didyoumeans),
      tips: qr?.tips?.text ?? null,
    };
  }

  return {
    query: args.query,
    success: true,
    pod_count: qr.numpods ?? 0,
    pods: (qr.pods ?? []).map(normalizePod),
  };
}

function extractDYM(dym?: { val?: string } | { val?: string }[]): string[] {
  if (!dym) return [];
  if (Array.isArray(dym)) return dym.map((d) => d.val ?? '').filter(Boolean);
  return dym.val ? [dym.val] : [];
}

interface WolframPod {
  title?: string;
  id?: string;
  primary?: boolean;
  position?: number;
  subpods?: { plaintext?: string; img?: { src?: string; alt?: string } }[];
}

function normalizePod(p: WolframPod) {
  return {
    title: p.title ?? null,
    id: p.id ?? null,
    primary: p.primary ?? false,
    position: p.position ?? null,
    contents: (p.subpods ?? [])
      .map((s) => s.plaintext)
      .filter((t): t is string => !!t)
      .join('\n'),
    images: (p.subpods ?? []).map((s) => s.img?.src).filter((u): u is string => !!u),
  };
}

export default { tools, callTool, meter: { credits: 2 } } satisfies McpToolExport;
