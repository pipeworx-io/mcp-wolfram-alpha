# @pipeworx/wolfram-alpha

Wolfram Alpha MCP — computational, factual, and quantitative queries.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `short_answer(query, units?)` — single terse plain-text answer.
- `full_query(query, units?, include_pods?, format?)` — structured pods.

## Auth

- **Platform key:** gateway env `PLATFORM_WOLFRAM_KEY`.
- **BYO:** `?_apiKey=<appid>` after registering at https://developer.wolframalpha.com (free 2,000/mo).

## Data source

- Short Answers v1: `https://api.wolframalpha.com/v1/result`
- Full Results v2: `https://api.wolframalpha.com/v2/query` (`output=JSON`)

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Wolfram Alpha data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
