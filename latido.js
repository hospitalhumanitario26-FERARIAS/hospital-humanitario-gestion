/* =====================================================================
   Latido diario · Gestión Hospitalaria HH

   Supabase pausa los proyectos del plan gratuito cuando pasan varios
   días sin recibir consultas. Esta función se ejecuta automáticamente
   una vez al día desde Netlify, escribe un registro en la tabla
   «latidos» y lee las tres matrices, de modo que el proyecto siempre
   figura con actividad reciente y nunca se suspende.

   La programación está definida en netlify.toml:
       [functions."latido"]  schedule = "0 12 * * *"   (07:00 Ecuador)
   ===================================================================== */

const URL_BASE = process.env.SUPABASE_URL  || "https://hqmqeoggdplvawhaxspw.supabase.co";
const CLAVE     = process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxbXFlb2dnZHBsdmF3aGF4c3B3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3OTg2MjcsImV4cCI6MjEwNDM3NDYyN30.H8YmFQ4ALHQNKCix0bNKQMr8JT1k1PR80hh8F1LlAto";

const cabeceras = {
  "apikey": CLAVE,
  "Authorization": "Bearer " + CLAVE,
  "Content-Type": "application/json"
};

async function consultar(tabla) {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabla}?select=id&limit=1`, { headers: cabeceras });
  return { tabla, estado: r.status, ok: r.ok };
}

exports.handler = async () => {
  const resultado = { momento: new Date().toISOString(), consultas: [], latido: null };

  try {
    /* 1. se escribe el latido del día */
    const ins = await fetch(`${URL_BASE}/rest/v1/latidos`, {
      method: "POST",
      headers: { ...cabeceras, "Prefer": "return=minimal" },
      body: JSON.stringify({ origen: "netlify" })
    });
    resultado.latido = ins.status;

    /* 2. se consultan las tres matrices: actividad de lectura además de escritura */
    for (const t of ["matriz_produccion", "matriz_financiera", "matriz_inversiones"]) {
      try { resultado.consultas.push(await consultar(t)); }
      catch (e) { resultado.consultas.push({ tabla: t, error: String(e.message || e) }); }
    }

    const bien = resultado.latido < 300 && resultado.consultas.every(c => c.ok);
    console.log("Latido diario:", bien ? "correcto" : "con observaciones", JSON.stringify(resultado));
    return { statusCode: bien ? 200 : 207, body: JSON.stringify(resultado) };

  } catch (e) {
    console.error("Latido diario fallido:", e);
    return { statusCode: 500, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};
