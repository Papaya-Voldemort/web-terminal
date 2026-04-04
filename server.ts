/// <reference types="bun" />
import index from "./index.html";

const portNumber = 3000;

Bun.serve({
  routes: {
    "/": index,
  },
  development: true,
  port: portNumber,
});

console.log("Server running at http://localhost:" + portNumber);
