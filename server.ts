import index from "./index.html";

const portNumber = 3000;

Bun.serve({
  routes: {
    "/": index,
  },
  development: true,
});

console.log("Server running at http://localhost:" + portNumber);
