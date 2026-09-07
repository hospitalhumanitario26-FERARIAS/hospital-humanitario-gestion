# Sistema de Gestión Hospitalaria

Hospital Humanitario · Fundación Pablo Jaramillo Crespo · Cuenca, Ecuador

Aplicación web de una sola página con dos módulos independientes:

- **Producción** — indicadores asistenciales (hospitalización, consulta externa, emergencia, quirófano, auxiliares de diagnóstico, categoría de paciente) calculados según OPS/OMS.
- **Financiero** — balance de resultados gerencial, resultado por área, estructura de costos y cartera con la red pública.

Cada módulo tiene su propia carga mensual de Excel, su propio período de análisis, su tablero de indicadores, su informe ejecutivo en PDF y su asistente de análisis.

---

## Contenido del repositorio

| Archivo | Función |
|---|---|
| `index.html` | La aplicación completa (interfaz, cálculos, gráficos e informes) |
| `netlify.toml` | Configuración de despliegue y cabeceras de seguridad |
| `netlify/functions/analisis.js` | Proxy del asistente de IA; protege la clave de Anthropic |
| `supabase/esquema.sql` | Tablas, políticas de seguridad y alta de usuarios |

---

## 1. Supabase

Proyecto: `hqmqeoggdplvawhaxspw` · URL `https://hqmqeoggdplvawhaxspw.supabase.co`
Las claves ya están configuradas dentro de `index.html`; no hay que editar nada.

### 1.1 Crear las tablas

SQL Editor → New query → pegue el contenido de `supabase/esquema.sql` → **Run**.

Se crean tres objetos:

- `perfiles` — nombre, rol y permiso de carga de cada usuario.
- `matriz_produccion` y `matriz_financiera` — una fila por cada carga mensual.
- `historial_cargas` — vista de auditoría con quién publicó qué y cuándo.

Las tablas tienen políticas de **lectura** e **inserción** únicamente. No existen políticas de actualización ni de borrado: una matriz publicada no se modifica ni se elimina. Para corregir un mes se publica una versión nueva y el sistema muestra la más reciente.

### 1.2 Crear los usuarios

Authentication → Users → **Add user** → Create new user. Marque *Auto Confirm User*.

Luego registre el perfil. En SQL Editor, reemplazando el correo y el nombre:

```sql
insert into public.perfiles (id, nombre, rol, puede_cargar)
select u.id, 'Dra. María Fernanda Arias Carrillo', 'Dirección General', true
  from auth.users u
 where u.email = 'fernanda@hospitalhumanitario.org'
on conflict (id) do update
  set nombre = excluded.nombre, rol = excluded.rol, puede_cargar = excluded.puede_cargar;
```

`puede_cargar = true` habilita la sección de carga de matrices. Con `false` el usuario entra en modo consulta: ve todos los paneles e informes, pero no puede publicar ni ve el menú de carga.

---

## 2. GitHub

Repositorio: **hospital-humanitario-gestion** (privado).

```bash
git init
git add .
git commit -m "Sistema de gestión hospitalaria — versión inicial"
git branch -M main
git remote add origin https://github.com/<su-usuario>/hospital-humanitario-gestion.git
git push -u origin main
```

---

## 3. Netlify

1. Add new site → Import an existing project → GitHub → `hospital-humanitario-gestion`.
2. Deje los campos de build vacíos; `netlify.toml` ya define todo.
3. Deploy.

### Variable de entorno del asistente

Site configuration → Environment variables → **Add a variable**:

| Clave | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | su clave de la consola de Anthropic |

Luego vuelva a desplegar (Deploys → Trigger deploy → Deploy site).

Si no configura esta variable, el asistente sigue funcionando con el análisis calculado localmente sobre los indicadores, sin conexión externa.

---

## Uso mensual

1. Complete su matriz de Excel como siempre.
2. Ingrese al sistema y vaya a **Carga de la matriz** en el módulo correspondiente.
3. Suba el archivo. Los indicadores se recalculan y la matriz queda publicada para todos los usuarios.
4. Elija los meses a analizar en la barra superior (mes suelto, trimestre, semestre o el año).
5. Abra **Informe ejecutivo** o **Informe económico** y use *Descargar PDF / imprimir*.

### Hojas que lee cada matriz

**Producción** — `DATOS FUENTE`, `HOSPITALIZACIÓN MENSUAL`, `CE X ESPECIALIDAD`, `CIRUGÍAS ESPECIALIDAD`, `HOSP. POR DEPARTAMENTO`.

**Financiero** — `ResultadoxArea` (acumulados del año en curso y del anterior) y `Deuda RPIS`. Los acumulados se convierten en valores mensuales, lo que permite analizar cualquier combinación de meses.

---

## Notas técnicas

- La clave `anon` incluida en `index.html` es pública por diseño; la seguridad la dan las políticas de la base, no la clave.
- Los datos se guardan además en el navegador como caché, para que la aplicación abra rápido y siga siendo consultable si la conexión falla.
- Si algún día se vacían `SUPABASE_URL` y `SUPABASE_ANON_KEY` en el bloque `CFG`, la aplicación vuelve al modo local con los usuarios de la constante `USUARIOS`, útil para pruebas sin conexión.
- Los gráficos son SVG generados por la propia aplicación: no dependen de librerías externas y se imprimen con la misma calidad que se ven en pantalla.
