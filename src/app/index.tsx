import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ajouterClient, getClientsAvecSolde, getParametres, openDb } from '../db';
import FicheClient from '../fiche-client';
import Parametres from '../parametres';

const formatMontant = (n: number) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

export default function ClientsScreen() {
  const [db, setDb] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [selection, setSelection] = useState<number | null>(null);
  const [vue, setVue] = useState<'liste' | 'parametres'>('liste');

  const charger = useCallback(async (d: any) => {
    setClients(await getClientsAvecSolde(d));
    setParams(await getParametres(d));
  }, []);

  useEffect(() => {
    (async () => {
      const d = await openDb();
      setDb(d);
      await charger(d);
    })();
  }, [charger]);

  const ajouter = async () => {
    if (!db || !nom.trim()) return;
    await ajouterClient(db, { nom: nom.trim(), telephone: telephone.trim() || null });
    setNom('');
    setTelephone('');
    await charger(db);
  };

  const retour = async () => {
    setSelection(null);
    setVue('liste');
    if (db) await charger(db);
  };

  const totalDu = clients.reduce((somme, c) => somme + c.solde, 0);

  if (db && selection !== null) {
    return (
      <SafeAreaView style={styles.container}>
        <FicheClient db={db} clientId={selection} onRetour={retour} />
      </SafeAreaView>
    );
  }

  if (db && vue === 'parametres') {
    return (
      <SafeAreaView style={styles.container}>
        <Parametres db={db} onRetour={retour} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.entete}>
        <Text style={styles.titre}>{params.nomBoutique || 'Cahier de dette'}</Text>
        <Pressable onPress={() => setVue('parametres')}>
          <Text style={styles.lien}>Paramètres</Text>
        </Pressable>
      </View>
      <Text style={styles.total}>Total dû : {formatMontant(totalDu)}</Text>

      <View style={styles.formulaire}>
        <TextInput
          style={styles.input}
          placeholder="Nom du client"
          value={nom}
          onChangeText={setNom}
        />
        <TextInput
          style={styles.input}
          placeholder="Téléphone (optionnel)"
          keyboardType="phone-pad"
          value={telephone}
          onChangeText={setTelephone}
        />
        <Pressable style={styles.bouton} onPress={ajouter}>
          <Text style={styles.boutonTexte}>Ajouter le client</Text>
        </Pressable>
      </View>

      <FlatList
        data={clients}
        keyExtractor={(c) => String(c.id)}
        ListEmptyComponent={<Text style={styles.vide}>Aucun client pour l'instant.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.ligne} onPress={() => setSelection(item.id)}>
            <View>
              <Text style={styles.nom}>{item.nom}</Text>
              {item.telephone ? <Text style={styles.tel}>{item.telephone}</Text> : null}
            </View>
            <Text style={[styles.solde, item.solde > 0 && styles.soldeDu]}>
              {formatMontant(item.solde)}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titre: { fontSize: 24, fontWeight: '700', flexShrink: 1 },
  lien: { color: '#1d4ed8', fontSize: 16 },
  total: { fontSize: 16, marginTop: 4, marginBottom: 12, color: '#444' },
  formulaire: { gap: 8, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  bouton: { backgroundColor: '#1d4ed8', borderRadius: 8, padding: 12, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '600' },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nom: { fontSize: 16, fontWeight: '600' },
  tel: { color: '#666', marginTop: 2 },
  solde: { fontSize: 16, color: '#444' },
  soldeDu: { color: '#b91c1c', fontWeight: '700' },
  vide: { textAlign: 'center', color: '#888', marginTop: 24 },
});