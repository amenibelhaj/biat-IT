// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

/**
 * Configuration TLS de la connexion à PostgreSQL.
 *
 * Pilotée par la variable DATABASE_SSL :
 *   disable  aucun chiffrement — serveur PostgreSQL interne sur réseau privé
 *   require  chiffrement sans vérification du certificat — hébergement managé
 *   verify   chiffrement avec vérification, via le certificat DATABASE_CA_FILE
 *
 * Si la variable n'est pas renseignée, le mode est déduit de l'adresse :
 * une adresse privée (localhost, 10.x, 172.16-31.x, 192.168.x, .local, .lan,
 * .internal) est considérée comme un réseau interne et n'active pas TLS ;
 * toute autre adresse l'active. Un déploiement interne fonctionne donc sans
 * configuration supplémentaire, tout en restant chiffré par défaut sur un
 * hébergement public.
 */
function sslConfig() {
  const mode = String(process.env.DATABASE_SSL || '').trim().toLowerCase();

  if (['disable', 'disabled', 'false', 'off', 'no', '0'].includes(mode)) return false;
  if (['require', 'required', 'true', 'on', 'yes', '1'].includes(mode)) {
    return { rejectUnauthorized: false };
  }
  if (['verify', 'verify-full', 'strict'].includes(mode)) {
    const fs = require('fs');
    const caPath = process.env.DATABASE_CA_FILE;
    return {
      rejectUnauthorized: true,
      ca: caPath && fs.existsSync(caPath) ? fs.readFileSync(caPath, 'utf8') : undefined
    };
  }

  const url = process.env.DATABASE_URL || '';
  const host = (url.match(/@([^/:?]+)/) || [])[1] || '';
  const isPrivate =
    /^(localhost|127\.0\.0\.1|::1)$/i.test(host) ||
    /\.(local|lan|internal|intranet)$/i.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    (host !== '' && !host.includes('.'));    // nom de service Docker, ex. « db »

  return isPrivate ? false : { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig(),
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('Erreur inattendue sur une connexion inactive :', err.message);
});

module.exports = pool;
