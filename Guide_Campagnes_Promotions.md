# Guide : applications, clips et campagnes

Ce guide décrit comment afficher des clips de promotion dans un jeu JavaChrist depuis l'admin (`javachrist-promotion.vercel.app`).

## Le vocabulaire

- **Application hôte** : l'application *où les clips s'affichent* (ce que voient les joueurs de RideCloud, par exemple).
- **Clip** : une vidéo qui *présente une autre application*. Le clic ouvre la fiche Google Play de cette application.
- **Campagne** : « dans l'application hôte X, afficher ces clips ».

Une application ne se promeut jamais elle-même : dans une campagne hébergée par RideCloud, les clips qui présentent RideCloud ne sont pas proposés.

## Vue d'ensemble

| Ordre | Onglet | Rôle |
|---|---|---|
| 1 | **Applications** | La liste de tes apps, avec leur fiche Google Play. |
| 2 | **Clips** | La bibliothèque de vidéos MP4, chacune liée à l'application qu'elle présente. |
| 3 | **Campagnes** | Choisit l'application hôte, puis les clips à y afficher, la langue, la période et le poids. |

Après chaque modification, l'admin **republie automatiquement** les catalogues. Les jeux lisent uniquement ce catalogue publié : un brouillon n'est jamais visible d'eux.

```
Clip (MP4) + application qu'il présente ─┐
                                          ├─► Campagne ─► Publication ─► public_catalogs/{application hôte} ─► le jeu affiche les clips
Application hôte ─────────────────────────┘
```

---

## 1. Applications

Onglet **Applications** → *Ajouter une application* (ou **Modifier**).

| Champ | Règle |
|---|---|
| **Identifiant** | Minuscules, chiffres et tirets (`motissimo`, `geo-fr`). **Définitif**. Pour une app qui affiche des clips, il doit être **identique à celui codé dans le jeu** : c'est la clé du catalogue qu'il lit. |
| **Nom affiché** | Obligatoire. |
| **Package Android** | Par exemple `fr.javachrist.motissimo`. |
| **Fiche Google Play** | `https://play.google.com/…`. **Nécessaire pour que les clips qui présentent cette app soient publiés** : c'est le lien ouvert au toucher du clip. |

Il n'y a plus de case « diffuse les promos » : toute application peut être hôte ou présentée. La liste indique « Lien manquant » quand la fiche n'est pas renseignée, et combien de clips la présentent et de campagnes où elle affiche des clips.

**Supprimer** retire seulement l'application de la liste (ses clips et campagnes ne sont plus publiés tant que tu ne les as pas changés).

---

## 2. Clips

Onglet **Clips** → *Déposer un clip*.

| Contrainte | Valeur |
|---|---|
| Format | **MP4** (H.264 + AAC) |
| Durée | **15 s maximum** (10 à 12 s conseillé) |
| Poids | **10 Mo maximum** |

Le navigateur contrôle le fichier avant l'envoi et le serveur revérifie à la publication. Pour compresser :

```
ffmpeg -i entree.mp4 -vf scale=-2:720 -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 96k -movflags +faststart -t 12 sortie.mp4
```

### Étapes

1. **Choisis le fichier MP4** (durée et taille affichées).
2. **Nom** : un nom interne clair.
3. **Application présentée** : **obligatoire**. C'est l'application que le clip fait découvrir. Son nom et sa fiche Google Play sont ceux envoyés au jeu.
4. Dépose le clip.

### Gérer la bibliothèque

- **Aperçu** : lecture dans un cadre de téléphone.
- **Modifier** : change le nom et l'application présentée (pas la vidéo).
- **Supprimer** : refusé tant qu'une campagne utilise le clip. La colonne **Dans les campagnes** indique lesquelles.
- Le contenu d'un clip **ne se remplace pas** : dépose un nouveau clip, mets-le dans les campagnes, puis supprime l'ancien.

---

## 3. Campagnes

Onglet **Campagnes** → **Nouvelle campagne**.

| Champ | Règle |
|---|---|
| **Titre interne** | Pour te repérer. Jamais montré aux joueurs. |
| **Application où les clips s'affichent** | L'application hôte. Changer d'hôte retire de la sélection les clips qui présentent cet hôte. |
| **Clips à afficher** | Cases à cocher, **autant que tu veux** (3, 4 ou plus). Les clips de l'application hôte ne sont pas proposés. Un avertissement signale un clip dont l'application n'a pas de fiche Google Play. |
| **Langue** | `fr`, `de`, `es`, `it`, `en`, `nl`, `pt`. Un jeu ne garde que les campagnes de **sa** langue. **Les clips doivent être dans cette langue.** |
| **Début / Fin** | Facultatifs. La fin doit suivre le début. |
| **Poids de rotation** | Entier de 1 à 10. Plus il est élevé, plus la campagne revient souvent. Défaut : 1. |

Le public est toujours **adulte**.

### Cycle de vie

```
Brouillon ──Activer──► Active ──Désactiver──► Désactivée
                          │                       │
                          └──── Archiver ◄────────┘
```

| Statut | Effet |
|---|---|
| **Brouillon** | État à la création. Jamais publié. |
| **Active** | Publiée dans le catalogue de l'application hôte, si valide. |
| **Désactivée** | Retirée du catalogue, réversible. |
| **Archivée** | Retirée et mise de côté. |

### Procédure recommandée

1. Vérifie que l'application hôte, les applications présentées (avec leur fiche Google Play) et les clips existent.
2. **Nouvelle campagne**, choisis l'hôte, coche les clips, **Enregistrer** (brouillon).
3. Dans la liste, clique sur un clip (▶) pour l'aperçu.
4. **Activer**, puis contrôle le bandeau de publication.

**Supprimer** une campagne ne supprime pas les clips.

---

## Publication et vérification

**Republier les catalogues** (en haut à droite) relance la publication à la main ; elle est aussi automatique après chaque modification.

Le bandeau indique le **nombre de clips publiés par application hôte** et les éléments **ignorés**, avec la raison.

| Raison affichée | Solution |
|---|---|
| Ancien format : ouvre la campagne et enregistre-la à nouveau | Campagne créée avant la refonte : ouvre-la, choisis l'hôte et les clips. |
| Application où les clips s'affichent introuvable | L'hôte a été supprimé : recrée-le ou change la campagne. |
| Aucun clip choisi | Coche au moins un clip. |
| Clip introuvable / lié à aucune application existante | Corrige le clip (onglet Clips, **Modifier**). |
| La fiche Google Play de … est manquante ou invalide | Renseigne la fiche dans l'onglet Applications. |
| Durée hors limite / pas un MP4 / dépasse 10 Mo / fichier introuvable | Redépose un clip conforme. |
| Date invalide | Corrige le début ou la fin. |

Un clip n'apparaît dans un jeu que si la campagne est **active**, si la **langue** correspond et si la **période** est en cours.

### Ce que reçoit le jeu

Le catalogue `public_catalogs/{id-de-l-application-hôte}` contient une entrée **par clip** (format inchangé, les jeux n'ont pas à être modifiés) :

```json
{
  "id": "<idCampagne>_<idClip>",
  "name": "SousPli",
  "audience": "adult",
  "locale": "fr",
  "videoUrl": "https://firebasestorage.googleapis.com/v0/b/<bucket>/o/library%2F….mp4?alt=media",
  "durationMs": 14900,
  "destinationUrl": "https://play.google.com/store/apps/details?id=…",
  "weight": 1,
  "startsAt": "2026-11-16T23:00:00.000Z",
  "endsAt": "2027-05-01T16:00:00.000Z"
}
```

`name` est le nom de l'application présentée, `destinationUrl` sa fiche Google Play. Le jeu garde le catalogue en cache environ 15 minutes.

---

## Exemple : 3 clips dans RideCloud

1. **Applications** : `ridecloud`, `cubelyo`, `motissimo` et `souspli` existent, chacune avec sa fiche Google Play.
2. **Clips** : un clip par application, avec l'application qu'il présente.
3. **Campagnes** → **Nouvelle campagne** : titre « Clips dans RideCloud », application où les clips s'affichent : RideCloud, clips : Cubelyo, Motissimo, SousPli (ceux de RideCloud ne sont pas proposés), langue Français.
4. **Enregistrer**, aperçu, **Activer**.
5. Le bandeau indique `ridecloud : 3 clip(s)`.

## Règles à respecter

- **Durée ≤ 15 s**, jamais de pression sur le joueur : la conformité Google Play prime. Voir le [cahier des charges](Cahier_des_charges_Gestionnaire_Promotions_JavaChrist.md).
- **Un jeu ne dépend jamais** du catalogue ni de Storage pour avancer : en cas d'erreur ou de timeout, la promotion se ferme et le jeu continue.
- **Public adulte uniquement.**
