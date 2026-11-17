# JavaChrist Promotions

Back-office privé pour gérer les vidéos de promotion affichées dans les jeux JavaChrist (Motissimo, puis GéoFR, etc.). Aucune mise à jour de l'AAB n'est nécessaire pour changer une promo.

## Fonctionnement

1. L'admin se connecte avec Google (compte portant le claim `admin: true`).
2. Il gère `apps`, `clips` et `campaigns` dans Firestore, et envoie les MP4 dans Storage (`library/`). Une campagne = une application hôte (où les clips s'affichent) + les clips à y afficher ; un clip présente une autre application (une app ne se promeut jamais elle-même).
3. Après chaque modification, `POST /api/publish` (Admin SDK) régénère `public_catalogs/{applicationHôte}` (une entrée par clip), seul document lu par les jeux.
4. Les jeux lisent leur catalogue (cache 15 min), uniquement pour un public adulte.

Le serveur ne publie que les campagnes valides : active, dates correctes, lien `play.google.com` sur l'application présentée par le clip, vidéo MP4 existante ≤ 10 Mo et ≤ 15 s. Les campagnes ignorées sont listées avec leur raison.

## Variables d'environnement

Voir `.env.example`.

- Serveur (Vercel, jamais `NEXT_PUBLIC_`) : `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`
- Client : `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_APP_ID`

## Premier lancement

1. Déployer sur Vercel avec les variables ci-dessus.
2. Firebase Console > Authentication > Settings > Authorized domains : ajouter le domaine Vercel de l'admin.
3. Se connecter une fois avec `contact@javachrist.fr` (l'accès sera refusé, c'est normal).
4. Poser le rôle admin :
   ```
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\chemin\service-account.json"
   node scripts/set-admin.mjs contact@javachrist.fr
   ```
5. Se déconnecter puis se reconnecter.
6. Onglet Applications : ajouter `motissimo` (nom Motissimo, package `fr.javachrist.motissimo`).

## Usage

- **Ajouter une app** : onglet Applications. L'identifiant est définitif (pour une app qui affiche des clips, il doit être celui codé dans le jeu). La fiche Google Play est nécessaire pour que les clips qui présentent l'app soient publiés.
- **Déposer un clip** : onglet Clips, avec l'application qu'il présente (obligatoire).
- **Créer une campagne** : onglet Campagnes > Nouvelle campagne : choisir l'application où les clips s'affichent, cocher les clips, langue, dates, poids. Elle naît en brouillon : Aperçu, puis Activer.
- **Arrêter une campagne** : Désactiver (réversible) ou Archiver. Supprimer ne supprime pas les clips.
- **Migration depuis l'ancien modèle** : `node scripts/migrate-campaigns.mjs` (simulation) puis `--apply`.
- **Vidéo** : MP4 H.264/AAC, 15 s max (10–12 s conseillé), 10 Mo max.

## Coûts

Firestore, Storage et Vercel restent dans les paliers gratuits pour quelques vidéos légères. Le trafic Storage vient des lectures des vidéos : 10 Mo × nombre d'affichages non mis en cache. Surveiller la console Firebase.

## Limites connues

- Les vidéos de `library/` sont lisibles par quiconque connaît l'URL (nécessaire au jeu).
- Les règles Firestore/Storage sont versionnées dans le dépôt Motissimo (`firestore.rules`, `storage.rules`).
