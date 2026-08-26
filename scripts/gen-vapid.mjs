/**
 * Gera o par de chaves que identifica o dindi para o serviço de avisos do
 * navegador. Rode uma vez só na vida do projeto — trocar as chaves depois
 * derruba todos os celulares já inscritos.
 */
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
