import * as SQLite from 'expo-sqlite';

export async function openDb() {
  const db = await SQLite.openDatabaseAsync('cahier.db');
  await initDb(db);
  return db;
}

async function initDb(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS clients (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nom           TEXT NOT NULL,
      telephone     TEXT,
      limite_credit INTEGER,
      note          TEXT,
      cree_le       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dettes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      montant     INTEGER NOT NULL CHECK (montant > 0),
      description TEXT,
      date        TEXT NOT NULL DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS paiements (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      montant   INTEGER NOT NULL CHECK (montant > 0),
      date      TEXT NOT NULL DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS parametres (
      cle    TEXT PRIMARY KEY,
      valeur TEXT
    );

    CREATE TABLE IF NOT EXISTS plans (
      client_id INTEGER PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      montant   INTEGER NOT NULL CHECK (montant > 0),
      frequence TEXT NOT NULL CHECK (frequence IN ('semaine', 'mois'))
    );

    CREATE INDEX IF NOT EXISTS idx_dettes_client    ON dettes(client_id);
    CREATE INDEX IF NOT EXISTS idx_paiements_client ON paiements(client_id);
  `);
}

export function getClientsAvecSolde(db) {
  return db.getAllAsync(`
    SELECT c.id, c.nom, c.telephone, c.limite_credit,
      COALESCE((SELECT SUM(montant) FROM dettes    WHERE client_id = c.id), 0)
    - COALESCE((SELECT SUM(montant) FROM paiements WHERE client_id = c.id), 0) AS solde
    FROM clients c
    ORDER BY solde DESC, c.nom
  `);
}

export function ajouterClient(db, { nom, telephone = null, limiteCredit = null, note = null }) {
  return db.runAsync(
    'INSERT INTO clients (nom, telephone, limite_credit, note) VALUES (?, ?, ?, ?)',
    [nom, telephone, limiteCredit, note]
  );
}

export function ajouterDette(db, clientId, montant, description = null) {
  return db.runAsync(
    'INSERT INTO dettes (client_id, montant, description) VALUES (?, ?, ?)',
    [clientId, montant, description]
  );
}

export function ajouterPaiement(db, clientId, montant) {
  return db.runAsync(
    'INSERT INTO paiements (client_id, montant) VALUES (?, ?)',
    [clientId, montant]
  );
}

export function getClient(db, clientId) {
  return db.getFirstAsync(
    `SELECT c.id, c.nom, c.telephone, c.limite_credit, c.note,
      COALESCE((SELECT SUM(montant) FROM dettes    WHERE client_id = c.id), 0)
    - COALESCE((SELECT SUM(montant) FROM paiements WHERE client_id = c.id), 0) AS solde
    FROM clients c WHERE c.id = ?`,
    [clientId]
  );
}

export function getHistorique(db, clientId) {
  return db.getAllAsync(
    `SELECT 'dette' AS type, id, montant, description, date
       FROM dettes WHERE client_id = ?
     UNION ALL
     SELECT 'paiement' AS type, id, montant, NULL AS description, date
       FROM paiements WHERE client_id = ?
     ORDER BY date DESC, id DESC`,
    [clientId, clientId]
  );
}

export function modifierClient(db, id, { nom, telephone, limiteCredit, note }) {
  return db.runAsync(
    'UPDATE clients SET nom = ?, telephone = ?, limite_credit = ?, note = ? WHERE id = ?',
    [nom, telephone, limiteCredit, note, id]
  );
}

export function supprimerClient(db, id) {
  return db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
}

export async function getParametres(db) {
  const lignes = await db.getAllAsync('SELECT cle, valeur FROM parametres');
  return Object.fromEntries(lignes.map((l) => [l.cle, l.valeur]));
}

export function setParametre(db, cle, valeur) {
  return db.runAsync(
    'INSERT INTO parametres (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur',
    [cle, valeur]
  );
}

export function getPlan(db, clientId) {
  return db.getFirstAsync(
    'SELECT montant, frequence FROM plans WHERE client_id = ?',
    [clientId]
  );
}

export function setPlan(db, clientId, montant, frequence) {
  return db.runAsync(
    `INSERT INTO plans (client_id, montant, frequence) VALUES (?, ?, ?)
     ON CONFLICT(client_id) DO UPDATE SET montant = excluded.montant, frequence = excluded.frequence`,
    [clientId, montant, frequence]
  );
}

export function supprimerPlan(db, clientId) {
  return db.runAsync('DELETE FROM plans WHERE client_id = ?', [clientId]);
}