# Cahier des charges — Gestionnaire de promotions JavaChrist

**Version :** 1.0  
**Date :** 2 novembre 2026  
**Destinataires :** Claude, Cursor et équipe de développement JavaChrist  
**Statut :** Spécification fonctionnelle et technique — à intégrer après examen du code existant

---

## 1. Objectif

Créer **un gestionnaire centralisé de promotions JavaChrist**, administrable depuis un navigateur, qui permette de présenter les applications JavaChrist dans ses jeux Android sans avoir à publier une nouvelle version de chaque jeu sur Google Play.

**Premier jeu à intégrer : Motissimo (`fr.javachrist.motissimo`).**  
**Évolution prévue :** autres jeux JavaChrist, notamment la collection Géo (GéoFR, GéoES, GéoIT, GéoDE, etc.).

Exemple : lorsque JavaChrist lance une nouvelle application, l'administrateur ajoute sa fiche et sa vidéo dans le gestionnaire, choisit les jeux dans lesquels elle peut apparaître, puis active la campagne. Les jeux connectés récupèrent le nouveau catalogue sans reconstruction d'AAB.

### Principes non négociables

- **Un seul back-office pour toutes les applications**, et non un gestionnaire par jeu.
- **Le code et les ressources essentielles de Motissimo sont embarqués dans Capacitor** (option A) pour jouer hors ligne.
- **Les promotions sont des données distantes**, distinctes du code de l'application. Aucune mise à jour de JavaScript ou du moteur du jeu par ce système.
- **Une promotion à la fin de chaque niveau complet** pour un utilisateur adulte éligible, jamais entre les 4 à 16 grilles constituant un niveau.
- **Aucune publicité ni promotion maison** pour un enfant ou lorsque l'âge n'est pas suffisamment établi.
- **Vidéo courte, puis croix « X » en haut à droite après la fin** ; pas de bouton « Passer » visible pendant la lecture nominale. Les contraintes de fermeture, d'accessibilité et de conformité Google Play restent prioritaires.
- **Si Internet, la vidéo ou le service sont indisponibles : le jeu continue sans promotion.**
- **Ne pas perturber les fonctionnalités de jeu, la PWA et les parcours existants.**

---

## 2. Périmètre

### Inclus en version 1

1. Administration sécurisée : connexion de l'administrateur, liste, création, modification, activation, désactivation, archivage des campagnes.
2. Téléversement de vidéos MP4, contrôle du format, durée et poids ; éventuelle miniature.
3. Association d'une campagne à une application promue (nom, image, lien Google Play).
4. Choix des **applications sources** dans lesquelles la campagne est diffusée ; possibilité d'exclure l'application elle-même.
5. Paramétrage simple : statut, dates de début/fin, ordre ou poids de rotation, langue, pays si nécessaire.
6. Lecture à distance d'un catalogue **public, minimal, en lecture seule** par les jeux.
7. Lecteur de vidéos promotionnelles intégré à Motissimo après l'écran de résultat de niveau.
8. Rotation entre campagnes actives, absence de répétition immédiate si plusieurs campagnes sont disponibles.
9. Fonctionnement dégradé hors ligne et absence de blocage du jeu.
10. Tests de sécurité, conformité Google Play et documentation de déploiement.

### Hors périmètre de la V1

- Vente d'espaces publicitaires à des annonceurs tiers.
- AdMob, ses bannières et son consentement UMP : **chantier distinct**, même si les contrôles d'âge doivent être cohérents.
- Système complet de tracking individuel, profilage, identifiants publicitaires ou ciblage comportemental.
- Éditeur vidéo ou génération automatique des clips.
- Plateforme de streaming complexe ou transcodage automatique : les vidéos seront préparées avant import.

---

## 3. Parcours administrateur

### 3.1 Écrans requis

**Tableau de bord** : nombre de campagnes actives, désactivées, expirées ; liste des applications sources intégrées ; accès aux actions.

**Campagnes** : tableau avec titre, application promue, sources de diffusion, durée, état, période de diffusion, actions « Modifier / Activer / Désactiver / Archiver ».

**Ajouter une campagne** : formulaire clair avec aperçu vidéo et bouton d'enregistrement. Vérification des champs avant publication.

**Applications** : référentiel des applications JavaChrist (identifiant interne, nom, plateforme, package Android et URL Google Play), sans supposer que toutes sont déjà publiées.

**Aperçu/test** : visualisation du rendu d'une promotion dans un écran mobile simulé avant activation ; idéalement une campagne test accessible à une version de développement seulement.

### 3.2 Champs d'une campagne

| Champ | Exigence |
|---|---|
| ID | Généré de manière stable, non modifiable |
| Titre interne | Ex. « Découvrir SousPli » |
| Application promue | Référence au catalogue d'applications JavaChrist |
| Nom affiché | Ex. « SousPli » |
| Vidéo | MP4, URL de fichier géré par l'infrastructure |
| Miniature | Facultative, image de secours ou aperçu |
| URL de destination | Lien Google Play vérifié ; autre plateforme ultérieurement si explicitement prise en charge |
| Applications sources | Motissimo, GéoFR, etc. (liste explicite) |
| Actif | Oui/non ; désactivé par défaut lors de la création |
| Début / fin | Facultatifs, validés en UTC |
| Poids / ordre | Nombre simple pour la rotation |
| Durée | Mesurée automatiquement ; cible **10–12 s**, maximum configuré **15 s** en V1 |
| Public | **Adultes uniquement** en V1 |
| Langue | `fr` par défaut ; préparé pour les futures applications localisées |
| Version / publication | Horodatage ou version de catalogue pour rafraîchissement et cache |

### 3.3 Workflow d'ajout d'une nouvelle application

1. L'administrateur ajoute l'application dans le référentiel si elle n'existe pas.
2. Il téléverse une vidéo MP4 optimisée et éventuellement une miniature.
3. Il renseigne l'URL de la fiche Google Play et sélectionne les jeux sources autorisés.
4. Il consulte l'aperçu, enregistre en **brouillon**, puis active la campagne.
5. Le catalogue publié est mis à jour **sans republier Motissimo** ; au rafraîchissement suivant, le jeu peut diffuser la nouvelle promotion.
6. Pour arrêter une campagne, l'administrateur la désactive ; le client cesse de la proposer après actualisation du catalogue.

Une campagne ne doit jamais être affichée par un jeu dont elle n'a pas été explicitement autorisée à être source de diffusion.

---

## 4. Expérience dans Motissimo

### 4.1 Placement dans le jeu

- Un niveau comprend **4 à 16 grilles** : aucune vidéo entre les grilles.
- Après la dernière grille, le joueur voit d'abord le **résultat de fin de niveau**.
- **Ensuite seulement**, si le joueur est adulte éligible, connecté et qu'une campagne valide est prête, afficher l'écran « Promotion JavaChrist ».
- La vidéo démarre, muette par défaut si nécessaire pour respecter les réglages audio, sans lecture superposée à la partie.
- **Pendant la vidéo nominale : pas de X visible.**
- **Lorsque la vidéo est terminée : X visible en haut à droite**, suffisamment grand et distinct, permettant la fermeture immédiate.
- La vidéo ne se relance pas en boucle. La progression du niveau est enregistrée **avant** toute promotion.
- Un bouton facultatif **« Voir sur Google Play »** peut ouvrir la fiche de l'application promue, sans être obligatoire pour continuer à jouer.
- Après fermeture, ouvrir le niveau suivant normalement.

**Conformité impérative :** faire valider ce comportement contre la politique « Annonces » de Google Play. La règle générale limite les interstitiels plein écran non fermables à 15 secondes, avec une nuance pour certaines coupures naturelles après le score. Pour réduire le risque, employer une durée **strictement inférieure ou égale à 15 s**, préférer **10–12 s**, et ne jamais piéger le joueur en cas d'erreur, de mise en arrière-plan ou de pression sur Retour Android. Si la revue de conformité impose une fermeture anticipée, **la conformité prime sur le souhait de masquer le X jusqu'à la fin**. Pas de faux bouton de fermeture et pas de clic forcé.

### 4.2 Règles de diffusion

- Événement : **une occasion de promotion par niveau terminé**, et non par grille.
- **Une seule vidéo maximum** lors de cette occasion.
- Si plusieurs campagnes sont disponibles : rotation équitable, éviter la même campagne deux niveaux de suite, lorsque possible.
- Ne jamais promouvoir le jeu source lui-même.
- Respecter le statut actif, les dates, la langue, la source et les critères de public ; revalider avant l'affichage.
- Ne pas relancer une vidéo à la réouverture de l'écran de résultat ou après un redémarrage de l'application.
- Sans campagne admissible : continuer directement vers le niveau suivant.
- Ne jamais retarder le changement de niveau pour attendre un téléchargement.

### 4.3 Hors ligne et erreurs

- Le moteur, les niveaux embarqués et la sauvegarde du jeu restent indépendants du gestionnaire publicitaire.
- Absence de réseau : ignorer la promotion et continuer.
- Timeout de récupération du catalogue, URL invalide, vidéo indisponible ou échec de lecture : fermer automatiquement l'écran promotionnel et continuer.
- Tester les connexions lentes ; limiter les délais et les ressources réseau.
- Télécharger/préparer au maximum **une** vidéo admissible à l'avance, en évitant les téléchargements inutiles.
- Ne jamais rendre le joueur dépendant de Firestore, Storage ou d'un serveur pour déverrouiller le niveau suivant.

---

## 5. Architecture technique conseillée

```text
Navigateur (administrateur JavaChrist)
          │ Authentification Firebase + autorisation ADMIN
          ▼
Back-office JavaChrist Promotions (interface web)
          │ Actions privilégiées côté serveur / règles strictes
          ├── Catalogue Firestore (apps, campagnes, publication)
          └── Firebase Storage (vidéos MP4 + miniatures)
                         │
                         │ Catalogue public limité / médias publiés
                         ▼
             Motissimo Android (Capacitor)
             GéoFR / GéoES / autres jeux
                         │
                         └── Résultat de niveau → promotion adulte
```

**Proposition :** un projet Firebase **central dédié** aux promotions, nommé provisoirement `javachrist-promotions` (nom à confirmer, ne pas créer aveuglément). Cette séparation évite de relier les promotions à un seul produit et réduit le risque de toucher à la base de données de SousPli ou de RideCloud. Si une infrastructure JavaChrist existante répond déjà au besoin, l'examiner avant de choisir ; éviter les migrations et la duplication inutiles.

**Technologies candidates :** interface Next.js/React sur Vercel, Firebase Authentication, Firestore et Cloud Storage ; Cloud Functions ou API serveur pour les mutations sensibles. Adapter à la stack réellement présente dans le dépôt. Le site d'administration est distinct de la PWA publique Motissimo.

### 5.1 Schéma de données indicatif

**`apps/{appId}`**

```json
{
  "name": "Motissimo",
  "androidPackage": "fr.javachrist.motissimo",
  "platform": "android",
  "playStoreUrl": null,
  "enabledAsSource": true
}
```

**`campaigns/{campaignId}`** — privé, accessible en administration :

```json
{
  "title": "Découvrir SousPli",
  "promotedAppId": "souspli",
  "sourceAppIds": ["motissimo", "geofr"],
  "status": "active",
  "audience": "adult",
  "locale": "fr",
  "startsAt": null,
  "endsAt": null,
  "weight": 1,
  "videoStoragePath": "campaigns/souspli/promo-v1.mp4",
  "posterStoragePath": "campaigns/souspli/poster-v1.webp",
  "videoDurationMs": 12000,
  "destinationUrl": "https://play.google.com/store/apps/details?id=fr.javachrist.souspli",
  "updatedAt": "SERVER_TIMESTAMP"
}
```

Les exemples ci-dessus sont **des propositions de structure, pas des données déjà existantes**. La durée, les liens et les droits doivent être vérifiés lors de la création réelle.

**`public_catalogs/{sourceAppId}`** — document ou endpoint généré côté serveur, en lecture seule, contenant **uniquement** les campagnes publiées autorisées pour l'application source. Exemple de structure renvoyée :

```json
{
  "schemaVersion": 1,
  "catalogVersion": 42,
  "sourceAppId": "motissimo",
  "campaigns": [
    {
      "id": "promo-souspli-01",
      "name": "SousPli",
      "audience": "adult",
      "locale": "fr",
      "videoUrl": "https://EXEMPLE-URL-MEDIA-PUBLIEE/promo.mp4",
      "durationMs": 12000,
      "destinationUrl": "https://play.google.com/store/apps/details?id=fr.javachrist.souspli",
      "weight": 1
    }
  ]
}
```

`EXEMPLE-URL-MEDIA-PUBLIEE` est un **placeholder**, pas une adresse opérationnelle. Le catalogue public ne doit contenir ni UID, ni secrets, ni documents de brouillon, ni URLs d'administration. Les dates et versions doivent être générées de façon fiable côté serveur.

### 5.2 Distribution et mise en cache

- Publier une **projection filtrée** du catalogue, plutôt que donner aux jeux un accès de lecture à toutes les campagnes administratives.
- Les URL média doivent être servies en HTTPS, permettre la lecture vidéo mobile et le cache contrôlé, et ne pas exposer d'identifiants privilégiés.
- Prévoir une stratégie de révocation raisonnable des médias déjà mis en cache ; ne pas utiliser des URL de téléchargement permanentes non maîtrisées pour des contenus sensibles.
- Rafraîchir le catalogue au démarrage ou lors du retour au premier plan, puis périodiquement avec un TTL raisonnable (par exemple 15 minutes) ; respecter les délais réseau et éviter la lecture Firestore à chaque grille.
- S'assurer que la désactivation d'une campagne a un effet au plus tard après expiration du cache ; prévoir un mécanisme d'urgence si besoin.
- Pour limiter les coûts : petites vidéos compressées en H.264/AAC, format adapté aux téléphones, surveillance du trafic sortant Storage/CDN.
- Si un contenu doit changer, le modifier via le back-office. **Toute modification du moteur, de l'interface ou du schéma nécessitant du nouveau code reste une mise à jour Play Store.**

---

## 6. Sécurité

1. **Administration réservée** à un compte autorisé JavaChrist : Firebase Authentication + vérification serveur d'un rôle administrateur (custom claims ou mécanisme équivalent éprouvé). Être simplement connecté à Google ne suffit pas.
2. **Écriture Firestore et Storage strictement réservée** à l'administration autorisée ; règles de sécurité testées. Privilégier des opérations serveur pour publier ou retirer une campagne.
3. **Lectures publiques uniquement** sur les catalogues de diffusion filtrés et sur les médias explicitement publiés. Les brouillons restent privés.
4. **Téléversements contrôlés** : type MIME, signature et extension de fichier, taille maximale configurée, durée réelle, nom de fichier normalisé et suppression des fichiers orphelins.
5. **Liens de sortie contrôlés** : allowlist de domaines de boutiques officiels (`play.google.com` en V1), validation des identifiants d'applications et ouverture explicite par l'utilisateur.
6. **Aucune clé de service ni secret Admin SDK dans Capacitor** ou dans le JavaScript public.
7. Prévoir journaux d'administration raisonnables : création, modification, activation, désactivation, sans données privées de joueurs.
8. Tester les règles Firestore et Storage avec l'émulateur Firebase et vérifier les permissions d'une session non administratrice.
9. Limiter l'utilisation des SDK, ne collecter aucune donnée d'enfant à des fins publicitaires, et ne pas générer d'identifiants de suivi pour les promotions maison.

---

## 7. Enfants, public mixte et Google Play

Motissimo peut intéresser enfants et adultes. **Un simple « mode enfant » activable dans les paramètres ne prouve pas qu'un utilisateur est adulte.** Prévoir un mécanisme neutre de distinction d'âge conforme aux règles Google Play et documenter précisément son fonctionnement. En cas d'âge inconnu ou d'échec, appliquer le comportement protecteur : **zéro publicité**.

Règles retenues pour les promotions maison en V1 :

- Enfants et âge indéterminé : **aucune vidéo promotionnelle, aucun lien commercial, aucune bannière AdMob**.
- Adultes éligibles : promotions maison possibles après l'écran de résultat, sous réserve de conformité de l'application et des SDK présents.
- Aucun contenu vidéo inapproprié pour la classification d'âge déclarée de l'application ; appliquer un contrôle éditorial avant activation.
- Ne jamais présenter la vidéo comme une étape nécessaire pour gagner des points ou débloquer des grilles.
- Google Play considère les **interstitiels faisant la promotion de ses propres applications** comme des publicités à déclarer dans la fiche Play Console. Un simple menu « Nos autres applications », non intrusif, est traité différemment.
- Vérifier les déclarations **Public cible**, **Présence de publicités**, **Sécurité des données** et la politique de confidentialité avant publication.
- La fréquence **après chaque niveau complet** est le comportement demandé, mais doit faire l'objet d'un essai d'ergonomie et d'une revue des règles sur les annonces répétitives. Elle ne doit jamais rendre le jeu essentiellement publicitaire.

### Références officielles vérifiées le 2 novembre 2026

- Google Play — Annonces : https://support.google.com/googleplay/android-developer/answer/9857753?hl=fr
- Google Play — Règles pour les contenus familiaux : https://support.google.com/googleplay/android-developer/answer/9893335?hl=fr
- Google Play — Déclarer la présence de publicités et les promotions maison : https://support.google.com/googleplay/android-developer/answer/9859455?hl=en
- Firebase — Règles de sécurité Cloud Storage : https://firebase.google.com/docs/storage/security
- Firebase — Tester les règles de sécurité : https://firebase.google.com/docs/rules/get-started

Les règles peuvent évoluer : les revérifier au moment de soumettre la version à Google Play. Cette spécification constitue une cible technique, pas une garantie d'acceptation par Google.

---

## 8. Organisation du développement

### Étape 0 — Audit ciblé, sans refaire les travaux validés

- Examiner la stack actuelle de Motissimo, le build statique Capacitor, l'état du mode enfant et la logique d'achèvement d'un niveau.
- Identifier la fonction/événement unique « niveau terminé » : une seule ouverture par niveau, pas par grille.
- Recenser les projets Firebase disponibles et les conséquences d'un projet central dédié.
- Vérifier si une administration JavaChrist commune existe déjà avant d'en créer une.
- Produire un relevé court des fichiers à toucher, des dépendances et des risques.

### Étape 1 — Infrastructure et sécurité

- Configurer un environnement de promotions séparé ou réutiliser l'infrastructure validée.
- Créer modèles d'applications et de campagnes, règles et publication du catalogue filtré.
- Ajouter les droits administrateur et les tests de refus des accès non autorisés.

### Étape 2 — Back-office

- Liste, création, édition, téléversement, aperçu et activation/désactivation.
- Afficher clairement les erreurs et empêcher la publication d'un fichier invalide.

### Étape 3 — Client réutilisable

- Créer un petit **module partagé de promotions** réutilisable dans plusieurs jeux (interfaces TypeScript / composant React ou équivalent selon stack existante).
- Fonctionnement offline-first, filtrage adultes, sélection des campagnes, chargement non bloquant et lecteur vidéo.
- Intégrer à Motissimo **après** la validation du résultat du niveau.
- Ne pas coupler l'avancement du jeu aux publicités.

### Étape 4 — Validation avant généralisation

- Valider sur le téléphone Android de test et en test interne Play.
- Vérifier le rendu vertical/horizontal, le son, le bouton X, le bouton Retour et la reprise après interruption.
- Tester l'absence de promo côté enfants et inconnus, ainsi que l'absence de réseau.
- Modifier une campagne côté administration et confirmer son apparition/disparition **sans reconstruire l'AAB**.
- Tester la charge réseau et les règles Google Play.
- Après validation de Motissimo, documenter l'intégration à GéoFR et aux autres jeux.

---

## 9. Tests d'acceptation

- [ ] Seul l'administrateur autorisé accède au back-office et peut modifier une campagne.
- [ ] Une nouvelle application et sa vidéo peuvent être ajoutées sans nouvelle version de Motissimo.
- [ ] Une campagne désactivée cesse d'être proposée après actualisation du catalogue.
- [ ] Une campagne en brouillon ne figure jamais dans le catalogue public.
- [ ] Une campagne apparaît seulement dans les jeux sources autorisés.
- [ ] Une promotion peut s'afficher à la fin d'un **niveau complet**, jamais entre deux grilles.
- [ ] Le score et la progression sont sauvegardés avant l'affichage vidéo.
- [ ] La vidéo cible 10–12 s et ne dépasse pas 15 s en V1 ; X apparaît à la fin de la lecture normale.
- [ ] Un échec réseau ou vidéo n'empêche jamais de poursuivre le jeu.
- [ ] Enfants et âge inconnu : aucune vidéo, aucune requête de promotion inutile, aucun affichage publicitaire.
- [ ] La rotation évite deux diffusions identiques consécutives lorsque plusieurs campagnes sont éligibles.
- [ ] Les liens n'ouvrent que les destinations autorisées, à la demande explicite de l'utilisateur.
- [ ] Le jeu fonctionne hors ligne avec son contenu embarqué.
- [ ] Les contrôles Google Play, la politique de confidentialité et les déclarations publicitaires sont revus avant mise en production.

---

## 10. Livrables attendus de Claude / Cursor

1. **Plan d'intégration ciblé** : fichiers et modules impactés, en conservant les acquis.
2. **Back-office fonctionnel** et sécurisé, avec documentation courte d'utilisation.
3. **Backend / catalogue publié** et règles Firestore/Storage vérifiées.
4. **Module client réutilisable** branché dans Motissimo.
5. **Jeux de tests** et démonstration « ajout d'une promotion sans mise à jour Android ».
6. **Documentation d'exploitation** : comment ajouter une app, remplacer une vidéo, arrêter une campagne, contrôler les coûts et revenir en arrière.
7. **Vérification Play Console** avant toute publication.

### Consigne de réalisation

> Conserver le travail existant, commencer par une inspection ciblée, puis implémenter par lots vérifiables. Ne pas refondre Motissimo, ne pas déployer en production sans validation et ne pas activer des publicités à destination des enfants. La simplicité d'administration et la réutilisation par les autres jeux JavaChrist sont prioritaires.

---

**Résultat recherché :** une seule interface JavaChrist où l'administrateur peut ajouter aujourd'hui RideCloud ou SousPli, puis demain toute nouvelle application, et la faire découvrir aux joueurs adultes de Motissimo et des futurs jeux **sans reconstruire les applications pour chaque nouvelle campagne**.
