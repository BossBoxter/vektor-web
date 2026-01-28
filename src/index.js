export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin === "*" ? "*" : allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Healthcheck
    if (request.method === "GET" && url.pathname === "/") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Only endpoint
    if (request.method !== "POST" || url.pathname !== "/lead") {
      return new Response(JSON.stringify({ ok: false, error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Optional strict origin check (if ALLOWED_ORIGIN is not "*")
    if (allowedOrigin !== "*" && origin && origin !== allowedOrigin) {
      return new Response(JSON.stringify({ ok: false, error: "Origin not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
      });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const name = (payload.name || "").toString().trim();
    const contact = (payload.contact || "").toString().trim();
    const pkg = (payload.package || "").toString().trim();
    const description = (payload.description || "").toString().trim();
    const page = (payload.page || "").toString().trim();
    const createdAt = (payload.createdAt || "").toString().trim();

    // Minimal validation
    if (!name || !contact || !pkg || !description) {
      return new Response(JSON.stringify({ ok: false, error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Telegram sendMessage
    const token = env.BOT_TOKEN;
    const chatId = env.MANAGER_CHAT_ID;

    if (!token || !chatId) {
      return new Response(JSON.stringify({ ok: false, error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const text =
      "Новая заявка с сайта VEKTOR Web\n\n" +
      `Имя: ${name}\n` +
      `Контакт: ${contact}\n` +
      `Пакет: ${pkg}\n\n` +
      `Описание:\n${description}\n\n` +
      (page ? `Страница: ${page}\n` : "") +
      (createdAt ? `Дата: ${createdAt}\n` : "");

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    });

    if (!tgRes.ok) {
      const errText = await tgRes.text().catch(() => "");
      return new Response(JSON.stringify({ ok: false, error: "Telegram error", details: errText.slice(0, 400) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
    });
  }
};
