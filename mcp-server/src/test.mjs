import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "test", version: "1.0.0" });

await client.connect(
  new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: {
      ...process.env,
      FLOWBOARD_API_URL: "https://flowboard-api-ew5s.onrender.com",
    },
  })
);

const tools = await client.listTools();
console.log("Tools:", tools.tools.map((tool) => tool.name));

const result = await client.callTool({ name: "list_workflows", arguments: {} });
console.log(result.content[0].text);

await client.close();