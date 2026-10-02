import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getParametres, setParametre } from './db';

type Props = { db: any; onRetour: () => void };

export default function Parametres({ db, onRetour }: Props) {
  const [boutique, setBoutique] = useState('');
  const [commercant, setCommercant] = useState('');
  const [telephone, setTelephone] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const p = await getParametres(db);
      setBoutique(p.nomBoutique ?? '');
      setCommercant(p.nomCommercant ?? '');
      setTelephone(p.telephone ?? '');
    })();
  }, [db]);

  const enregistrer = async () => {
    await setParametre(db, 'nomBoutique', boutique.trim());
    await setParametre(db, 'nomCommercant', commercant.trim());
    await setParametre(db, 'telephone', telephone.trim());
    setMessage('Paramètres enregistrés.');
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={onRetour}>
        <Text style={styles.lien}>← Retour</Text>
      </Pressable>
      <Text style={styles.titre}>Paramètres</Text>

      <TextInput
        style={styles.input}
        placeholder="Nom de la boutique"
        value={boutique}
        onChangeText={setBoutique}
      />
      <TextInput
        style={styles.input}
        placeholder="Nom du commerçant"
        value={commercant}
        onChangeText={setCommercant}
      />
      <TextInput
        style={styles.input}
        placeholder="Téléphone"
        keyboardType="phone-pad"
        value={telephone}
        onChangeText={setTelephone}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable style={styles.bouton} onPress={enregistrer}>
        <Text style={styles.boutonTexte}>Enregistrer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  lien: { color: '#1d4ed8', fontSize: 16, marginBottom: 8 },
  titre: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  message: { color: '#15803d' },
  bouton: { backgroundColor: '#1d4ed8', borderRadius: 8, padding: 12, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '600' },
});