# Cahier de dette

Application mobile pour les petits commerçants, qui remplace le cahier papier où l'on note les achats à crédit des clients. Le commerçant suit en un coup d'œil qui lui doit combien.

> Projet personnel en cours de développement. Les données montrées dans les captures sont fictives.

## Fonctionnalités

- Liste des clients avec le solde de chacun et le total dû
- Fiche client : historique des dettes et des paiements, du plus récent au plus ancien
- Ajout d'une dette (achat à crédit) et enregistrement d'un paiement, total ou partiel
- Modification et suppression d'un client, avec confirmation
- Paramètres du commerçant : nom de la boutique, nom du commerçant, téléphone
- Fonctionne **sans connexion** : les données sont enregistrées sur le téléphone

## Technologies

- React Native avec Expo (Expo Router) et TypeScript
- SQLite via `expo-sqlite` pour le stockage local

## Lancer le projet

```bash
git clone https://github.com/BORELLJORDY/cahier-dette.git
cd cahier-dette
npm install
npx expo start
```

Scanne ensuite le QR code avec l'application **Expo Go** sur ton téléphone (téléphone et ordinateur sur le même Wi-Fi).

## Choix techniques

- Les montants sont stockés en **nombres entiers**, jamais en décimaux, pour éviter les erreurs d'arrondi.
- Le solde d'un client n'est pas stocké : il est recalculé (dettes moins paiements) à chaque affichage, donc il ne peut jamais être incohérent après une correction.

## Prochaines étapes

- Alerte quand une dette dépasse la limite de crédit d'un client
- Rappels aux clients en retard (message WhatsApp ou SMS)
- Plans de remboursement par tranches
- Archivage des clients à la place de la suppression