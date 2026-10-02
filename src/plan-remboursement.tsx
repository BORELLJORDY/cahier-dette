import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getPlan, setPlan, supprimerPlan } from './db';

type Frequence = 'semaine' | 'mois';
type Props = { db: any; clientId: number; solde: number };

const formatMontant = (n: number) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

const pad = (n: number) => String(n).padStart(2, '0');
const formatDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

// Le premier versement a lieu une période après aujourd'hui
function simuler(solde: number, tranche: number, frequence: Frequence) {
  if (solde <= 0 || tranche <= 0) return null;
  const n = Math.ceil(solde / tranche);
  const fin = new Date();
  if (frequence === 'semaine') fin.setDate(fin.getDate() + 7 * n);
  else fin.setMonth(fin.getMonth() + n);
  const dernier = solde - (n - 1) * tranche;
  return { n, fin, dernier };
}

function texteSimulation(solde: number, tranche: number, frequence: Frequence) {
  const s = simuler(solde, tranche, frequence);
  if (!s) return '';
  const versements = `${s.n} versement${s.n > 1 ? 's' : ''}`;
  const dernier = s.n > 1 ? ` (le dernier de ${formatMontant(s.dernier)})` : '';
  return `${versements}${dernier}, dernier versement vers le ${formatDate(s.fin)}.`;
}

export default function PlanRemboursement({ db, clientId, solde }: Props) {
  const [plan, setPlanState] = useState<any>(null);
  const [edition, setEdition] = useState(false);
  const [tranche, setTranche] = useState('');
  const [frequence, setFrequence] = useState<Frequence>('semaine');
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setPlanState(await getPlan(db, clientId));
  }, [db, clientId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const ouvrir = () => {
    setTranche(plan ? String(plan.montant) : '');
    setFrequence(plan?.frequence ?? 'semaine');
    setErreur('');
    setEdition(true);
  };

  const enregistrer = async () => {
    const texte = tranche.replace(/\s/g, '');
    if (!/^\d+$/.test(texte) || parseInt(texte, 10) <= 0) {
      setErreur('Entre un montant valide (chiffres uniquement).');
      return;
    }
    await setPlan(db, clientId, parseInt(texte, 10), frequence);
    setEdition(false);
    await charger();
  };

  const supprimer = async () => {
    await supprimerPlan(db, clientId);
    await charger();
  };

  const trancheNombre = parseInt(tranche.replace(/\s/g, ''), 10);

  if (edition) {
    return (
      <View style={styles.carte}>
        <Text style={styles.titre}>Plan de remboursement</Text>
        <TextInput
          style={styles.input}
          placeholder="Montant par versement"
          keyboardType="numeric"
          value={tranche}
          onChangeText={setTranche}
        />
        <View style={styles.ligne}>
          {(['semaine', 'mois'] as Frequence[]).map((f) => (
            <Pressable
              key={f}
              style={[styles.choix, frequence === f && styles.choixActif]}
              onPress={() => setFrequence(f)}
            >
              <Text style={[styles.choixTexte, frequence === f && styles.choixTexteActif]}>
                {f === 'semaine' ? 'Chaque semaine' : 'Chaque mois'}
              </Text>
            </Pressable>
          ))}
        </View>
        {trancheNombre > 0 ? (
          <Text style={styles.simulation}>{texteSimulation(solde, trancheNombre, frequence)}</Text>
        ) : null}
        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        <View style={styles.ligne}>
          <Pressable style={[styles.bouton, styles.boutonGris]} onPress={() => setEdition(false)}>
            <Text style={styles.boutonTexte}>Annuler</Text>
          </Pressable>
          <Pressable style={[styles.bouton, styles.boutonVert]} onPress={enregistrer}>
            <Text style={styles.boutonTexte}>Enregistrer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!plan) {
    if (solde <= 0) return null;
    return (
      <Pressable style={[styles.bouton, styles.boutonBleu, styles.seul]} onPress={ouvrir}>
        <Text style={styles.boutonTexte}>Proposer un plan de remboursement</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.carte}>
      <Text style={styles.titre}>Plan de remboursement</Text>
      <Text style={styles.texte}>
        {formatMontant(plan.montant)} {plan.frequence === 'semaine' ? 'par semaine' : 'par mois'}
      </Text>
      <Text style={styles.simulation}>
        {solde > 0 ? texteSimulation(solde, plan.montant, plan.frequence) : 'Dette soldée.'}
      </Text>
      <View style={styles.ligne}>
        <Pressable onPress={ouvrir}>
          <Text style={styles.lien}>Modifier</Text>
        </Pressable>
        <Pressable onPress={supprimer}>
          <Text style={styles.lienRouge}>Supprimer le plan</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  titre: { fontSize: 16, fontWeight: '700' },
  texte: { fontSize: 16 },
  simulation: { color: '#444' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  ligne: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  choix: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  choixActif: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  choixTexte: { color: '#444' },
  choixTexteActif: { color: '#fff', fontWeight: '600' },
  erreur: { color: '#b91c1c' },
  bouton: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  seul: { flex: 0, marginTop: 8 },
  boutonBleu: { backgroundColor: '#1d4ed8' },
  boutonVert: { backgroundColor: '#15803d' },
  boutonGris: { backgroundColor: '#6b7280' },
  boutonTexte: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  lien: { color: '#1d4ed8', fontSize: 16 },
  lienRouge: { color: '#b91c1c', fontSize: 16 },
});