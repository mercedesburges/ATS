# Plataforma de Recruiting con AI

Sistema con **vista admin** (vos) y **portal de clientes** (login Google/Email) donde cada empresa ve solo sus puestos y candidatos. Incluye generación de preguntas, entrevistas AI con bot "Lorena", y análisis automático de respuestas.

Por la escala del proyecto, lo dividimos en **4 fases entregables**. Empezamos por la Fase 1 y al confirmar cada fase avanzamos a la siguiente.

---

## Fase 1 — Fundación + UX core (esta entrega)

**Lo que ves funcionando al final de la fase:**

- Login con Google + Email/contraseña (arquitectura preparada para sumar Microsoft/LinkedIn después).
- Panel admin: lista de clientes, lista de puestos, lista de candidatos.
- Portal cliente: ve solo sus puestos, selecciona uno y entra al tablero de candidatos en tarjetas (foto + nombre).
- Vista detalle del candidato con las 3 columnas-tarjeta gigantes: **CV**, **Experiencia/Stack**, **Video entrevista**.
- Cliente puede dejar comentarios y marcar estado Por favor, configura estos estados en este orden específico, asegurando que el administrador pueda **activar, desactivar o modificar estas etapas** según el puesto (ya que no todos los procesos requieren prueba técnica o evaluaciones):
  1. **Pending Review** *(Estado por defecto al ingresar el candidato).*
  2. **Interested in Interviewing** *(Al seleccionar este estado, se debe disparar una **automatización**: enviar un email automático al candidato solicitando su disponibilidad horaria para esa semana con múltiples opciones de días/horarios).*
  3. **Technical Task** *(Etapa opcional/modificable).*
  4. **Evaluations** *(Psicotécnicos u otras evaluaciones, etapa opcional/modificable).*
  5. **Offer**
  6. **Rejected / Descartado** *(Si selecciona esto tiene que si o si poner feedback).*
  Además, el cliente debe tener un campo de texto libre para dejar **Comentarios (Feedback)** en el perfil de cada candidato, sin importar en qué estado se encuentre."   
  También me gustaría que las stages se puedan modificar o agregar, y uqe a veces se suman entrevistas etc.. 
- Diseño elegido entre 3 opciones (te las muestro apenas aprobás el plan).

**Por dentro:**

- Tablas: `profiles`, `user_roles` (admin/client), `clients`, `jobs`, `candidates`, `candidate_status`, `candidate_comments`, `interview_videos`.
- Storage para CVs, fotos y videos.
- Invitación de clientes: vos creás la cuenta y se les envía un email con link para activar: aca para crear la cuenta, yo tengo que poner mail de la persona, empresa (tambieen que este la opcion de si es una empresa ya activa en mi plataforma, o una nueva..) nombre apellido, area y posicion. 

---

## Fase 2 — IA sobre Job Description y CV

- Subís un **Job Description** → IA genera preguntas para la entrevista (máx 10 min de respuestas).
- Panel de revisión: editás/aprobás las preguntas antes de activar el puesto.
- IA detecta requisitos críticos del JD (ej: "Python", "Contabilidad") → define los campos clave de la "Segunda Tarjeta".
- Subís **CV** del candidato → IA extrae nombre, email, experiencia y prellena la tarjeta.
- Configuración por puesto: idioma (ES/EN, ampliable), deadline (default 48h), nombre del bot (default "Lorena").

---

## Fase 3 — Entrevista en video con bot AI

- Email automático al candidato con link único de entrevista.
- Pantalla de entrevista: el bot "Lorena" hace las preguntas (texto + voz), el candidato graba video en navegador, se sube al storage.
- Control de deadline y reintento si falla la subida.

---

## Fase 4 — Análisis y pulido del perfil

- Cuando termina la entrevista, IA transcribe el video, lo contrasta con el CV y **actualiza/pulida** automáticamente la tarjeta del candidato (agrega skills, corrige datos, refina la experiencia).
- Notificación al admin de que el candidato está listo para mostrar.
- Cliente entra y ve el candidato completo en su portal.

---

## Detalles técnicos (resumen)

- **Stack**: TanStack Start + Lovable Cloud (Supabase) + Lovable AI Gateway (Gemini para texto/análisis, transcripción de audio).
- **Roles**: `admin` y `client`, separados en tabla `user_roles` (seguridad).
- **RLS**: cada cliente solo ve sus propios puestos/candidatos; admin ve todo.
- **Email**: Lovable Emails con dominio propio (lo configurás cuando lleguemos a Fase 2).
- **Storage**: buckets `cvs` (privado), `candidate-photos` (público), `interview-videos` (privado con signed URLs).

---

## Próximo paso al aprobar este plan

Genero **3 direcciones de diseño** distintas (con la estética que querés para clientes premium) para que elijas, y arrancamos Fase 1.

¿Avanzamos así?