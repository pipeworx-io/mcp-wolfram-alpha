# @pipeworx/wolfram-alpha

Wolfram Alpha MCP — computational, factual, and quantitative queries.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1679+ live data sources.

## Tools

- `short_answer(query, units?)` — single terse plain-text answer.
- `full_query(query, units?, include_pods?, format?)` — structured pods.
- `wolfram_compute(code, time_constraint_seconds?)` — evaluate Wolfram Language
  code in a real kernel (keyless; proxies Wolfram's hosted MCP evaluator).

## Auth

- **Platform key:** gateway env `PLATFORM_WOLFRAM_KEY` (short_answer / full_query only).
- **BYO:** `?_apiKey=<appid>` after registering at https://developer.wolframalpha.com (free 2,000/mo).
- `wolfram_compute` needs no key.

## Evaluation semantics (triage note)

`wolfram_compute` transmits `code` verbatim — as a JSON field, no URL encoding
anywhere in the path — and the kernel evaluates exactly what was sent. A result
that disagrees with the *intent* of a question is almost certainly a bug in the
submitted code, not in transmission or the kernel. Before filing a tool bug,
echo the parse back through the tool itself:

```
wolfram_compute({ code: "ToString[Hold[<the code>], InputForm]" })
```

Worked incident (fleet #422, 2026-08-17): `Length[Select[Permutations[Range[5]],
And@@Thread[#!=Range[5]]&]]` was reported as "returns 119, should be 44
(derangements of 5)". 119 is the correct value of that code: on two concrete
lists, `perm != Range[5]` evaluates eagerly to a single True/False (whole-list
`Unequal`) before `Thread` can split it elementwise, so the predicate collapses
to "permutation ≠ identity" and counts 120 − 1 = 119. The elementwise form
`And @@ MapThread[Unequal, {#, Range[5]}] &` (or just `Subfactorial[5]`) returns
44 through the same tool.

## Data source

- Short Answers v1: `https://api.wolframalpha.com/v1/result`
- Full Results v2: `https://api.wolframalpha.com/v2/query` (`output=JSON`)
- Wolfram Language kernel: `https://agenttools.wolfram.com/mcp` (hosted by Wolfram Research)

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "wolfram-alpha": {
      "url": "https://gateway.pipeworx.io/wolfram-alpha/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/wolfram-alpha/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1679+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/short_answer \
  -H 'Content-Type: application/json' \
  -d '{"query":"what is the capital of France"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/short_answer`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "wolfram-alpha": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-wolfram-alpha"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-wolfram-alpha
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Wolfram Alpha data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
