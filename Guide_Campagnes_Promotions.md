# Guide : créer des applications, des clips et des campagnes

Ce guide décrit, dans l'ordre, comment diffuser un clip de promotion dans un jeu JavaChrist depuis l'admin (`javachrist-promotion.vercel.app`).

## Vue d'ensemble

Trois éléments, à créer dans cet ordre :

| Ordre | Onglet | Rôle |
|---|---|---|
| 1 | **Applications** | La liste des apps : celles que l'on promeut et les jeux qui affichent les promos. |
| 2 | **Clips** | La bibliothèque de vidéos MP4. Un clip se dépose une fois et peut servir dans plusieurs campagnes. |
| 3 | **Campagnes** | Relie un clip à une application promue, à un ou plusieurs jeux diffuseurs, à une langue et à une période. |

Après chaque modification d'une application ou d'une campagne, l'admin **republie automatiquement** les catalogues. Les jeux lisent uniquement ce catalogue publié : un brouillon n'est jamais visible d'eux.

```
Clip (MP4)  ─┐
Application ─┼─► Campagne ─► Publication ─► public_catalogs/{jeu} ─► le jeu affiche le clip
Jeu diffuseur┘
```

---

## 1. Applications

Onglet **Applications** → formulaire *Ajouter une application*.

| Champ | Règle |
|---|---|
| **Identifiant** | Minuscules, chiffres et tirets uniquement (`motissimo`, `geo-fr`). **Définitif**, il ne se modifie pas. Pour un jeu diffuseur, il doit être **identique à celui codé dans le jeu**, car c'est la clé du catalogue lu par le jeu. |
| **Nom affiché** | Obligatoire. |
| **Package Android** | Par exemple `fr.javachrist.motissimo`. |
| **Fiche Google Play** | Facultatif tant que l'app n'est pas publiée. Si renseigné, doit être une URL `https://play.google.com/…`. Il sert de lien par défaut dans les campagnes. |
| **Ce jeu diffuse les promos** | À cocher pour un jeu qui **affiche** les clips des autres applications. Ce nom de champ est historique (`enabledAsSource` en base). |

Une même application peut être **promue** (elle apparaît dans les clips des autres jeux) et **diffuseuse** (elle affiche les clips des autres).

Dans le tableau, le bouton **Activer la diffusion** ou **Arrêter la diffusion** bascule cette case. Quand un jeu n'est plus diffuseur, son catalogue est vidé à la prochaine publication, pas laissé périmé.

**Supprimer** retire seulement l'application de la liste. Vérifie qu'aucune campagne ne la référence encore.

---

## 2. Clips (bibliothèque vidéo)

Onglet **Clips** → formulaire *Déposer un clip*.

### Contraintes de la vidéo

| Contrainte | Valeur |
|---|---|
| Format | **MP4** (H.264 pour la vidéo, AAC pour le son) |
| Durée | **15 s maximum**. 10 à 12 s conseillé. |
| Poids | **10 Mo maximum** |

Le navigateur contrôle le fichier avant l'envoi et refuse un MP4 trop long ou trop lourd. Le serveur revérifie à la publication (type, taille, durée).

Un clip dépassant 10 Mo se compresse, par exemple avec HandBrake (préréglage « Fast 720p30 ») ou `ffmpeg` :

```
ffmpeg -i entree.mp4 -vf scale=-2:720 -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 96k -movflags +faststart -t 12 sortie.mp4
```

`+faststart` aide la lecture rapide sur mobile.

### Étapes

1. **Choisis le fichier MP4.** La durée et la taille sont mesurées et affichées.
2. **Nom** : un nom interne clair (« RideCloud, version courte »). Il est repris du nom du fichier si le champ est vide.
3. **Application présentée** (facultatif) : l'application que le clip présente. Elle sert uniquement à filtrer les clips proposés dans les campagnes. Sans choix, le clip est proposé pour toutes les applications.
4. Clique sur le bouton de dépôt. Une barre de progression s'affiche.

### Gérer la bibliothèque

- **Aperçu** : lit le clip dans un cadre de téléphone.
- **Renommer** : change le nom interne seulement.
- **Supprimer** : refusé tant qu'une campagne utilise le clip (la liste des campagnes concernées est affichée). Change d'abord le clip de ces campagnes.
- Le contenu d'un clip **ne peut pas être remplacé**. Pour une nouvelle version, dépose un nouveau clip, mets-le dans la campagne, puis supprime l'ancien.

La colonne **Utilisé par** indique quelles campagnes se servent de chaque clip.

---

## 3. Campagnes

Onglet **Campagnes** → **Nouvelle campagne**.

### Champs du formulaire

| Champ | Obligatoire | Règle |
|---|---|---|
| **Titre interne** | Oui | Pour te repérer (« Découvrir SousPli »). Jamais affiché aux joueurs. |
| **Application promue** | Oui | L'application dont on fait la promotion. Son nom est celui envoyé au jeu. Choisir l'application préremplit le lien Google Play si elle en a un. |
| **Jeux où la promotion s'affiche** | Oui, au moins un | Cases à cocher, limitées aux jeux diffuseurs. Un jeu **ne se promeut jamais lui-même**. |
| **Langue** | Oui | `fr`, `de`, `es`, `it`, `en`, `nl`, `pt`. Un jeu ne garde que les campagnes de **sa** langue (GéoFR le français, GéoDE l'allemand…). **Le clip doit être dans cette langue.** |
| **Lien Google Play** | Oui | Obligatoirement `https://play.google.com/…`. C'est la destination du clic. |
| **Clip vidéo** | Oui | Choisi dans la bibliothèque. Sont proposés les clips de l'application promue et les clips sans application. La durée s'affiche une fois choisi. |
| **Début / Fin** | Non | Fenêtre de diffusion. La fin doit être **après** le début. Sans dates, la campagne n'a pas de limite. |
| **Poids de rotation** | Oui | Entier de **1 à 10**. Plus il est élevé, plus la campagne revient souvent quand plusieurs campagnes visent le même jeu. Défaut : 1. |

Le public est toujours **adulte** (`audience: "adult"`). Les jeux ne montrent les promotions qu'à un public adulte.

### Cycle de vie

```
Brouillon ──Activer──► Active ──Désactiver──► Désactivée
                          │                       │
                          └──── Archiver ◄────────┘
```

| Statut | Effet |
|---|---|
| **Brouillon** | État à la création. Jamais publié. |
| **Active** | Publiée dans le catalogue des jeux choisis, si elle est valide. |
| **Désactivée** | Retirée du catalogue, réversible avec **Activer**. |
| **Archivée** | Retirée et mise de côté. Il n'y a plus de bouton Activer. |

### Procédure recommandée

1. Vérifie que l'application promue, le jeu diffuseur et le clip existent (parties 1 et 2).
2. **Nouvelle campagne**, remplis le formulaire, **Enregistrer**. Elle est créée en **brouillon**.
3. Dans la liste, clique sur **Aperçu** pour voir le rendu dans un cadre de téléphone.
4. Clique sur **Activer**. Le catalogue est republié.
5. Contrôle le bandeau de résultat de la publication (voir plus bas).

### Modifier ou arrêter

- **Modifier** : tous les champs sont modifiables, y compris le clip. Le statut est conservé.
- **Désactiver** : coupe la diffusion tout de suite, de façon réversible.
- **Archiver** : met la campagne de côté.
- **Supprimer** : supprime la campagne définitivement. Le clip de la bibliothèque, lui, **reste**.

---

## Publication et vérification

Le bouton **Republier les catalogues** (en haut à droite) relance la publication à la main. Il est aussi appelé automatiquement après chaque enregistrement ou changement de statut d'une campagne, et après chaque modification d'une application.

Le bandeau de résultat indique :
- le **nombre de campagnes publiées par jeu** ;
- les campagnes **ignorées**, avec la raison.

### Une campagne active n'est pas publiée : pourquoi ?

| Raison affichée | Solution |
|---|---|
| Application promue introuvable | L'application a été supprimée : recrée-la ou change la campagne. |
| Aucun jeu source choisi | Coche au moins un jeu diffuseur. |
| Le lien doit être une fiche play.google.com | Corrige l'URL (`https`, domaine `play.google.com`). |
| Durée de la vidéo hors limite (15 s maximum) | Le clip dépasse 15 s : utilise un clip plus court. |
| Date invalide | Corrige le début ou la fin. |
| Fichier vidéo introuvable dans Storage | Le fichier a disparu : redépose le clip et réassocie-le. |
| La vidéo n'est pas un MP4 | Réexporte en MP4. |
| La vidéo dépasse 10 Mo | Compresse-la. |

Rappel : une campagne n'apparaît dans un jeu que si le jeu est **diffuseur**, si la campagne est **active**, si la **langue** correspond et si la **période** est en cours.

### Ce que reçoit le jeu

Pour chaque campagne publiée, le catalogue `public_catalogs/{id-du-jeu}` contient :

```json
{
  "id": "XbNCmI01jFesz7g1slMT",
  "name": "SousPli",
  "audience": "adult",
  "locale": "fr",
  "videoUrl": "https://firebasestorage.googleapis.com/v0/b/<bucket>/o/library%2F….mp4?alt=media",
  "durationMs": 14016,
  "destinationUrl": "https://play.google.com/store/apps/details?id=…",
  "weight": 5,
  "startsAt": "2026-11-03T00:35:00.000Z",
  "endsAt": "2027-05-02T22:30:00.000Z"
}
```

Le jeu garde ce catalogue en cache environ 15 minutes. Une modification peut donc mettre quelques minutes à apparaître dans le jeu.

---

## Exemple complet : promouvoir SousPli dans Motissimo

1. **Applications** : vérifie que `motissimo` existe avec **Ce jeu diffuse les promos** coché, et ajoute `souspli` (package `fr.javachrist.souspli`, lien Google Play).
2. **Clips** : dépose `clip-souspli.mp4` (12 s, 4 Mo), nom « SousPli, version courte », application présentée : SousPli.
3. **Campagnes** → **Nouvelle campagne** :
   - titre : « Découvrir SousPli » ;
   - application promue : SousPli ;
   - jeux : Motissimo ;
   - langue : Français ;
   - lien : la fiche Google Play de SousPli ;
   - clip : « SousPli, version courte » ;
   - début et fin : 3 novembre → 2 mai (facultatif) ;
   - poids : 5.
4. **Enregistrer**, puis **Aperçu**, puis **Activer**.
5. Vérifie dans le bandeau : `motissimo : 1`.

## Règles à respecter

- **Durée ≤ 15 s** et jamais de pression forcée sur le joueur : la conformité Google Play prime. Voir le cahier des charges ([Cahier_des_charges_Gestionnaire_Promotions_JavaChrist.md](Cahier_des_charges_Gestionnaire_Promotions_JavaChrist.md)).
- **Un jeu ne dépend jamais** du catalogue ni de Storage pour avancer : en cas d'erreur ou de timeout, la promotion se ferme et le jeu continue.
- **Public adulte uniquement**, les promotions ne s'affichent pas autrement.
