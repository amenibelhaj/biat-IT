# Installation sur une VM interne BIAT

Application de gestion du cycle de vie et de l'obsolescence des actifs IT.
Ce document décrit l'installation sur une machine interne à la banque, sans
dépendance à un hébergement externe.

## Ce qui est installé

| Composant | Rôle | Exposition |
|---|---|---|
| PostgreSQL 16 | Stockage de l'inventaire | Interne uniquement |
| API Node.js | Traitement et calcul des indicateurs | Interne uniquement |
| Nginx | Interface web et relais vers l'API | Port 80 de la VM |

Seul le port 80 (ou 443 en HTTPS) est accessible. Ni la base ni l'API ne sont
joignables depuis le réseau. Aucune donnée ne sort de l'infrastructure BIAT.

## Prérequis

- VM Linux (Ubuntu 22.04 LTS ou Rocky Linux 9), 2 vCPU, 4 Go de RAM, 20 Go de disque
- Docker Engine et le plugin Compose — **ou** Node.js 20 et PostgreSQL 16 si Docker n'est pas autorisé
- Un nom DNS interne, par exemple `biat-actifs.intranet.biat.com.tn`

> **Accès réseau pour l'installation.** La compilation télécharge les
> dépendances depuis le registre npm. Si la VM n'a pas d'accès Internet,
> prévoir un proxy d'entreprise, un miroir npm interne (Nexus, Artifactory),
> ou une compilation sur un poste connecté puis un transfert des images.

---

## Méthode A — Docker (recommandée)

Tout est fourni : trois conteneurs, une commande.

```bash
# 1. Récupérer le code sur la VM
git clone <dépôt> /opt/biat-asset-management
cd /opt/biat-asset-management/deploy

# 2. Renseigner le mot de passe de la base
cp .env.example .env
nano .env                    # POSTGRES_PASSWORD obligatoire

# 3. Démarrer
docker compose up -d --build

# 4. Contrôler
docker compose ps
docker compose logs -f backend
```

L'application est disponible sur `http://<adresse-de-la-vm>/`.

Le schéma de la base et les migrations sont exécutés automatiquement au
premier démarrage. Les données sont conservées dans le volume `biat_pgdata`
et survivent à un `docker compose down`.

### Exploitation courante

```bash
docker compose logs -f              # journaux
docker compose restart backend      # redémarrer l'API
docker compose down                 # arrêter (les données sont conservées)
docker compose up -d --build        # mettre à jour après un git pull
```

### Sauvegarde

```bash
# Sauvegarde quotidienne à placer dans cron
docker exec biat-db pg_dump -U biat biat_assets \
  | gzip > /sauvegardes/biat_$(date +%F).sql.gz

# Restauration
gunzip -c /sauvegardes/biat_2026-09-16.sql.gz \
  | docker exec -i biat-db psql -U biat -d biat_assets
```

---

## Méthode B — Sans Docker

Si la politique interne n'autorise pas Docker.

```bash
# 1. Base de données
sudo -u postgres createuser biat -P
sudo -u postgres createdb biat_assets -O biat
sudo -u postgres psql -d biat_assets -f backend/database_schema.sql
sudo -u postgres psql -d biat_assets -f backend/migrations/002_live_calculations.sql
sudo -u postgres psql -d biat_assets -f backend/migrations/003_extra_attributes.sql

# 2. API
cd /opt/biat-asset-management/backend
npm install --omit=dev
cp .env.example .env
nano .env        # DATABASE_URL + DATABASE_SSL=disable

sudo cp ../deploy/systemd/biat-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now biat-backend
sudo systemctl status biat-backend

# 3. Interface
cd ../biat-frontend
echo "REACT_APP_API_URL=/api" > .env
npm install
npm run build

sudo cp ../deploy/systemd/nginx-biat.conf /etc/nginx/sites-available/biat
sudo ln -s /etc/nginx/sites-available/biat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Points de sécurité

| Point | Traitement |
|---|---|
| Base non exposée | Aucun port publié ; accessible uniquement par l'API |
| API non exposée | Joignable uniquement par Nginx |
| Mot de passe | Dans `.env`, hors du code source, non versionné |
| Compte non privilégié | Les conteneurs et le service systemd ne tournent pas en root |
| Fichiers importés | Supprimés du serveur dès la fin du traitement |
| Import transactionnel | En cas d'erreur, aucune écriture n'est appliquée |
| HTTPS | À activer avec un certificat de l'autorité interne (voir `nginx-biat.conf`) |

L'application ne gère pas encore de comptes utilisateurs : toute personne
accédant à l'URL voit l'ensemble de l'inventaire. Restreindre l'accès au
niveau du réseau, ou prévoir l'authentification, avant une mise en service
au-delà de l'équipe DSI.

---

## En cas d'erreur

Les difficultés les plus fréquentes, et leur résolution.

### « npm ERR! network » ou « ETIMEDOUT » pendant la construction

La VM n'atteint pas le registre npm. Configurer le proxy de la banque :

```bash
# Dans deploy/.env, puis reconstruire
# (les variables sont transmises aux étapes de build)
HTTP_PROXY=http://proxy.biat.local:8080
HTTPS_PROXY=http://proxy.biat.local:8080
NO_PROXY=localhost,127.0.0.1,db,backend
```

Ou, pour une installation sans Docker :

```bash
npm config set proxy http://proxy.biat.local:8080
npm config set https-proxy http://proxy.biat.local:8080
```

Si un dépôt interne (Nexus, Artifactory) est disponible :

```bash
npm config set registry https://nexus.biat.local/repository/npm-group/
```

### « port is already allocated »

Le port 80 est déjà utilisé sur la VM. Modifier `HTTP_PORT` dans `deploy/.env` :

```
HTTP_PORT=8080
```

L'application est alors sur `http://<vm>:8080/`.

### « database system is starting up » puis arrêt du backend

Le serveur applicatif a démarré avant la base. Le fichier compose prévoit une
attente, mais si le cas se présente :

```bash
docker compose restart backend
```

### « relation "assets" does not exist »

Le schéma n'a pas été chargé. Les fichiers d'initialisation ne sont exécutés
qu'au **tout premier** démarrage, sur un volume vide. Si le volume existait
déjà :

```bash
# ATTENTION : supprime les données existantes
docker compose down -v
docker compose up -d --build
```

Ou charger manuellement sans perdre les données :

```bash
docker exec -i biat-db psql -U biat -d biat_assets < ../backend/database_schema.sql
docker exec -i biat-db psql -U biat -d biat_assets < ../backend/migrations/002_live_calculations.sql
docker exec -i biat-db psql -U biat -d biat_assets < ../backend/migrations/003_extra_attributes.sql
```

### « column extra_attributes does not exist » à l'import

La migration 003 n'a pas été appliquée. Voir la commande ci-dessus.

### La page s'affiche mais les écrans restent vides

L'interface n'atteint pas l'API. Vérifier depuis la VM :

```bash
curl http://localhost/api/health
```

Si cette commande répond mais pas le navigateur, c'est un pare-feu entre le
poste et la VM. Si elle ne répond pas :

```bash
docker compose logs backend
```

### Caractères accentués incorrects

L'encodage de la base n'est pas UTF8. À vérifier :

```bash
docker exec biat-db psql -U biat -d biat_assets -c "SHOW server_encoding;"
```

La réponse doit être `UTF8`. Sinon, la base a été créée sans les bons
paramètres : sauvegarder les données, supprimer le volume, recréer.

---

## Vérification complète après installation

À dérouler dans l'ordre. Chaque étape doit réussir avant de passer à la suivante.

```bash
# 1. Les trois conteneurs tournent
docker compose ps
#    biat-db, biat-backend, biat-web  →  Up

# 2. La base répond et contient les tables
docker exec biat-db psql -U biat -d biat_assets -c "\dt"
#    assets, organizations, cost_centers, import_history, replacement_plans

# 3. La vue de calcul existe
docker exec biat-db psql -U biat -d biat_assets -c "SELECT COUNT(*) FROM v_assets_live;"
#    0 au départ : c'est normal

# 4. L'API répond
curl http://localhost/api/health
#    {"status":"OK","database":"connected","assets":0,...}

# 5. L'interface est servie
curl -I http://localhost/
#    HTTP/1.1 200 OK
```

Puis, dans un navigateur : ouvrir l'application, aller dans **Import**,
charger un fichier d'inventaire, et vérifier que les écrans se remplissent.

---

## Note à l'attention de l'équipe infrastructure

Cette procédure a été rédigée à partir de la configuration de l'application,
mais n'a pas encore été déroulée sur une VM BIAT. Un premier passage sur une
machine de test est recommandé avant toute installation définitive. Les
points spécifiques à votre environnement — proxy, dépôt npm interne,
politique de pare-feu — sont ceux qui demanderont le plus vraisemblablement
un ajustement.
