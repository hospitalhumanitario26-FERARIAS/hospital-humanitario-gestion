/* =====================================================================
   Proxy del asistente de análisis.
   Mantiene la clave de Anthropic en el servidor: el navegador nunca
   la ve. Configure la variable de entorno ANTHROPIC_API_KEY en
   Netlify → Site configuration → Environment variables.
   ===================================================================== */

exports.handler = async (event) => {
  const cors = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Método no permitido" }) };

  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave)
    return { statusCode: 503, headers: cors, body: JSON.stringify({ error: "El asistente no está configurado en el servidor" }) };

  let cuerpo;
  try { cuerpo = JSON.parse(event.body || "{}"); }
  catch (e) { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Solicitud inválida" }) }; }

  const { sistema, contexto, pregunta } = cuerpo;
  if (!pregunta || typeof pregunta !== "string")
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Falta la pregunta" }) };

  const mensaje =
    (sistema || "Eres analista de gestión hospitalaria. Responde en español, con cifras exactas y orientado a la decisión directiva.") +
    "\n\nDATOS (JSON):\n" + JSON.stringify(contexto || {}).slice(0, 120000) +
    "\n\nPREGUNTA: " + pregunta.slice(0, 2000);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": clave,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{ role: "user", content: mensaje }]
      })
    });

    if (!r.ok) {
      const detalle = await r.text();
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Error del servicio de análisis", detalle: detalle.slice(0, 300) }) };
    }

    const d = await r.json();
    const texto = (d.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
    return { statusCode: 200, headers: cors, body: JSON.stringify({ texto }) };

  } catch (e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "No se pudo contactar el servicio de análisis" }) };
  }
};
