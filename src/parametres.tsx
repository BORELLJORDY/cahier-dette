import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { getParametres, setParametre } from './db';

type Props = { db: any; onRetour: () => void };

export default function Parametres({ db, onRetour }: Props) {
  const [boutique, setBoutique] = useState('');
  const [commercant, setCommercant] = useState('');
  const [telephone, setTelephone] = useState('');
  const [limite, setLimite] = useState('');
  const [bloquante, setBloquante] = useState(false);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    (async () => {
      const p = await getParametres(db);
      setBoutique(p.nomBoutique ?? '');
      setCommercant(p.nomCommercant ?? '');
      setTelephone(p.telephone ?? '');
      setLimite(p.limiteDefaut ?? '');
      setBloquante(p.limiteBloquante === '1');
    })();
  }, [db]);

  const enregistrer = async () => {
    const limiteTexte = limite.replace(/\s/g, '');
    if (limiteTexte && !/^\d+$/.test(limiteTexte)) {
      setMessage('');
      setErreur('La limite doit contenir uniquement des chiffres.');
      return;
    }
    await setParametre(db, 'nomBoutique', boutique.trim());
    await setParametre(db, 'nomCommercant', commercant.trim());
    await setParametre(db, 'telephone', telephone.trim());
    await setParametre(db, 'limiteDefaut', limiteTexte);
    await setParametre(db, 'limiteBloquante', bloquante ? '1' : '0');
    setErreur('');
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

      <Text style={styles.section}>Limite de crédit</Text>
      <TextInput
        style={styles.input}
        placeholder="Limite par défaut (vide = aucune)"
        keyboardType="numeric"
        value={limite}
        onChangeText={setLimite}
      />
      <Text style={styles.aide}>
        S'applique aux clients qui n'ont pas leur propre limite.
      </Text>
      <View style={styles.ligneSwitch}>
        <Text style={styles.libelleSwitch}>Bloquer les dettes au-dessus de la limite</Text>
        <Switch value={bloquante} onValueChange={setBloquante} />
      </View>

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
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
  section: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  aide: { color: '#666' },
  ligneSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  libelleSwitch: { flex: 1, fontSize: 16 },
  erreur: { color: '#b91c1c' },
  message: { color: '#15803d' },
  bouton: { backgroundColor: '#1d4ed8', borderRadius: 8, padding: 12, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '600' },
});