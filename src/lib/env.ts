/**
 * Variáveis de ambiente do dindi.
 *
 * Se faltar alguma, o erro aqui explica exatamente o que fazer —
 * em vez de dar um erro estranho lá na frente.
 */

function required(name: string, value: string | undefined, dica: string): string {
  if (!value) {
    throw new Error(
      `Falta a variável de ambiente ${name}.\n` +
        `Como resolver: ${dica}\n` +
        `Local: coloque no arquivo .env.local. Na Vercel: Settings → Environment Variables.`
    );
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "no Supabase, vá em Project Settings → Data API e copie a Project URL."
    );
  },
  get supabaseAnonKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "no Supabase, vá em Project Settings → API Keys e copie a chave anon/publishable."
    );
  },
  get supabaseServiceKey() {
    return required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      "no Supabase, vá em Project Settings → API Keys → service_role. NUNCA coloque essa chave no navegador."
    );
  },
  get cronSecret() {
    return required(
      "CRON_SECRET",
      process.env.CRON_SECRET,
      "invente uma senha longa e aleatória. A Vercel usa isso para chamar a rotina diária com segurança."
    );
  },
};

/** URL pública do app, usada no OAuth. */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
