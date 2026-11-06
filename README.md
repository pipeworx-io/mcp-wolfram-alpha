# @pipeworx/wolfram-alpha

Wolfram Alpha MCP — computational, factual, and quantitative queries.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1867+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

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

- Short Answers v1.
- Full Results v2: Wolfram Alpha (`output=JSON`)
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

Both URLs reach the same gateway and the same 1867+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/short_answer \
  -H 'Content-Type: application/json' \
  -d '{"query":"what is the capital of France"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/short_answer`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-wolfram-alpha` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/wolfram-alpha/mcp` endpoint shown above. It needs network access;
there is no offline mode.

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

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

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
