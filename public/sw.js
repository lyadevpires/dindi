/**
 * O pedacinho do dindi que continua acordado com o app fechado.
 *
 * Só faz uma coisa: mostrar o recado que chega do servidor e abrir a tela
 * certa quando alguém toca nele. Nada de cache — as telas do dindi mudam a
 * cada gasto registrado, e cache velho aqui viraria número errado ali.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener("push", (evento) => {
  let recado = { titulo: "dindi", texto: "Tem novidade nas suas contas.", url: "/" };
  try {
    recado = { ...recado, ...evento.data.json() };
  } catch {
    // Recado sem corpo ou malformado: mostra o texto padrão em vez de sumir.
  }

  evento.waitUntil(
    self.registration.showNotification(recado.titulo, {
      body: recado.texto,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      lang: "pt-BR",
      // Um recado por dia substitui o anterior, em vez de empilhar.
      tag: "dindi-recado",
      data: { url: recado.url },
    })
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.url || "/", self.location.origin).href;

  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      // Se o dindi já estiver aberto, aproveita a janela em vez de abrir outra.
      for (const janela of janelas) {
        if (janela.url.startsWith(self.location.origin) && "focus" in janela) {
          janela.navigate?.(destino);
          return janela.focus();
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
