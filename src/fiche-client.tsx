import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ajouterDette, ajouterPaiement, getClient, getHistorique } from './db';

type Props = { db: any; clientId: number; onRetour: () => void };

const formatMontant = (n: number) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

export default function FicheClient({ db, clientId, onRetour }: Props) {
  const [client, setClient] = useState<any>(null);
  const [historique, setHistorique] = useState<any[]>([]);
  const [montant, setMontant] = useState('');
  const [description, setDescription] = useState('');
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setClient(await getClient(db, clientId));
    setHistorique(await getHistorique(db, clientId));
  }, [db, clientId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const valider = async (type: 'dette' | 'paiement') => {
    const texte = montant.replace(/\s/g, '');
    if (!/^\d+$/.test(texte) || parseInt(texte, 10) <= 0) {
      setErreur('Entre un montant valide (chiffres uniquement).');
      return;
    }
    const m = parseInt(texte, 10);
    if (type === 'dette') {
      await ajouterDette(db, clientId, m, description.trim() || null);
    } else {
      await ajouterPaiement(db, clientId, m);
    }
    setMontant('');
    setDescription('');
    setErreur('');
    await charger();
  };

  if (!client) return null;

  return (
    <View style={styles.container}>
      <Pressable onPress={onRetour}>
        <Text style={styles.retour}>← Retour</Text>
      </Pressable>

      <Text style={styles.nom}>{client.nom}</Text>
      {client.telephone ? <Text style={styles.tel}>{client.telephone}</Text> : null}
      <Text style={[styles.solde, client.solde > 0 && styles.soldeDu]}>
        Solde : {formatMontant(client.solde)}
      </Text>

      <View style={styles.formulaire}>
        <TextInput
          style={styles.input}
          placeholder="Montant"
          keyboardType="numeric"
          value={montant}
          onChangeText={setMontant}
        />
        <TextInput
          style={styles.input}
          placeholder="Description (ex. sac de riz)"
          value={description}
          onChangeText={setDescription}
        />
        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        <View style={styles.boutons}>
          <Pressable style={[styles.bouton, styles.boutonDette]} onPress={() => valider('dette')}>
            <Text style={styles.boutonTexte}>Ajouter une dette</Text>
          </Pressable>
          <Pressable style={[styles.bouton, styles.boutonPaiement]} onPress={() => valider('paiement')}>
            <Text style={styles.boutonTexte}>Enregistrer un paiement</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={historique}
        keyExtractor={(h) => `${h.type}-${h.id}`}
        ListEmptyComponent={<Text style={styles.vide}>Aucun mouvement pour l'instant.</Text>}
        renderItem={({ item }) => (
          <View style={styles.ligne}>
            <View>
              <Text style={styles.type}>{item.type === 'dette' ? 'Dette' : 'Paiement'}</Text>
              <Text style={styles.detail}>
                {item.date}
                {item.description ? ` · ${item.description}` : ''}
              </Text>
            </View>
            <Text style={item.type === 'dette' ? styles.montantDette : styles.montantPaiement}>
              {item.type === 'dette' ? '+' : '−'} {formatMontant(item.montant)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  retour: { color: '#1d4ed8', fontSize: 16, marginBottom: 8 },
  nom: { fontSize: 24, fontWeight: '700' },
  tel: { color: '#666', marginTop: 2 },
  solde: { fontSize: 18, marginTop: 8, marginBottom: 12, color: '#444' },
  soldeDu: { color: '#b91c1c', fontWeight: '700' },
  formulaire: { gap: 8, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  erreur: { color: '#b91c1c' },
  boutons: { flexDirection: 'row', gap: 8 },
  bouton: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  boutonDette: { backgroundColor: '#b91c1c' },
  boutonPaiement: { backgroundColor: '#15803d' },
  boutonTexte: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  type: { fontSize: 16, fontWeight: '600' },
  detail: { color: '#666', marginTop: 2 },
  montantDette: { color: '#b91c1c', fontWeight: '600' },
  montantPaiement: { color: '#15803d', fontWeight: '600' },
  vide: { textAlign: 'center', color: '#888', marginTop: 24 },
});