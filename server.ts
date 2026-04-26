/// <reference types="bun" />

const index = Bun.file("./static/index.html");

Bun.serve({
  port: 3000,

  async fetch(req) {
    const url = new URL(req.url);
    const path = "./static" + url.pathname;

    // API
    if (url.pathname === "/api/ai") {
      const { input, system } = await req.json();

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Bun.env.OPENROUTER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            { role: "user", content: input },
          ],
        }),
      });

      const data = await res.json();

      return Response.json({
        output: data?.choices?.[0]?.message?.content ?? "",
      });
    }

    // 🟡 TS -> JS compile step
    if (url.pathname.endsWith(".ts")) {
      const file = Bun.file(path);

      if (await file.exists()) {
        const source = await file.text();

        const result = await Bun.build({
          entrypoints: [path],
          target: "browser",
          minify: false,
        });

        return new Response(result.outputs[0], {
          headers: { "Content-Type": "application/javascript" },
        });
      }
    }

    // static files
    const file = Bun.file(path);

    if (await file.exists()) {
      return new Response(file);
    }

    return new Response(index, {
      headers: { "Content-Type": "text/html" },
    });
  },
});