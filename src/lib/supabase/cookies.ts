/**
 * Quanto tempo o login dura no aparelho.
 *
 * Por padrão o cookie de sessão do Supabase é de sessão de navegador: fechou o
 * app, pode acabar. Num app de dinheiro que se abre correndo na fila do
 * mercado, ter que digitar senha de novo é o motivo de parar de usar.
 *
 * 400 dias é o teto que os navegadores aceitam num cookie (acima disso eles
 * cortam sozinhos). Como o dindi renova a validade a cada visita, na prática
 * quem usa o app nunca é deslogado — só quem sumir por mais de um ano.
 */
const VALIDADE = 400 * 24 * 60 * 60;

/**
 * Estica a validade de um cookie de login.
 *
 * Menos no caso que importa: apagar um cookie é gravá-lo vazio com validade
 * zero, e é exatamente assim que o botão "Sair" funciona. Esticar isso também
 * deixaria a pessoa presa dentro da conta para sempre.
 */
export function cookieLongo<T extends { maxAge?: number; expires?: Date }>(
  value: string,
  options?: T
): T | undefined {
  if (!value) return options;
  if (options?.maxAge !== undefined && options.maxAge <= 0) return options;

  // `expires` sai junto: com os dois presentes, quem manda varia de navegador.
  return { ...(options as T), maxAge: VALIDADE, expires: undefined };
}
