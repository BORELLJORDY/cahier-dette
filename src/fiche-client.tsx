import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ajouterDette,
  ajouterPaiement,
  getClient,
  getHistorique,
  getParametres,
  modifierClient,
  supprimerClient,
} from './db';

type Props = { db: any; clientId: number; onRetour: () => void };

const formatMontant = (n: number) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

export default function FicheClient({ db, clientId, onRetour }: Props) {
  const [client, setClient] = useState<any>(null);
  const [historique, setHistorique] = useState<any[]>([]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [montant, setMontant] = useState('');
  const [description, setDescription] = useState('');
  const [erreur, setErreur] = useState('');

  const [edition, setEdition] = useState(false);
  const [eNom, setENom] = useState('');
  const [eTel, setETel] = useState('');
  const [eLimite, setELimite] = useState('');
  const [eNote, setENote] = useState('');
  const [erreurEdition, setErreurEdition] = useState('');

  const charger = useCallback(async () => {
    setClient(await getClient(db, clientId));
    setHistorique(await getHistorique(db, clientId));
    setParams(await getParametres(db));
  }, [db, clientId]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Limite du client, sinon limite par défaut du commerçant
  const limiteDefaut = params.limiteDefaut ? parseInt(params.limiteDefaut, 10) : null;
  const limite = client?.limite_credit ?? limiteDefaut;
  const bloquante = params.limiteBloquante === '1';

  const valider = async (type: 'dette' | 'paiement') => {
    const texte = montant.replace(/\s/g, '');
    if (!/^\d+$/.test(texte) || parseInt(texte, 10) <= 0) {
      setErreur('Entre un montant valide (chiffres uniquement).');
      return;
    }
    const m = parseInt(texte, 10);

    const enregistrerMouvement = async () => {
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

    if (type === 'dette' && limite != null && client?.solde + m > limite) {
      if (bloquante) {
        setErreur(
          `Limite de crédit atteinte : ${client?.nom} ne peut pas dépasser ${formatMontant(limite)}.`
        );
        return;
      }
      Alert.alert(
        'Limite de crédit dépassée',
        `Avec cette dette, ${client?.nom} devrait ${formatMontant(client?.solde + m)}, pour une limite de ${formatMontant(limite)}.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ajouter quand même', onPress: enregistrerMouvement },
        ]
      );
      return;
    }
    await enregistrerMouvement();
  };

  // Prépare un message de rappel et ouvre WhatsApp ou l'application SMS
  const rappel = async (canal: 'whatsapp' | 'sms') => {
    setErreur('');
    const tel = (client?.telephone ?? '').trim();
    const boutique = params.nomBoutique || 'votre commerçant';
    const message = `Bonjour ${client?.nom}, un petit rappel de ${boutique} : votre solde est de ${formatMontant(client?.solde)}. Merci de passer régler dès que possible.`;

    let url: string;
    if (canal === 'whatsapp') {
      let numero = tel.replace(/[^\d+]/g, '');
      if (numero.startsWith('00')) numero = '+' + numero.slice(2);
      if (!numero.startsWith('+')) {
        setErreur(
          'Pour WhatsApp, enregistre le numéro au format international (avec + et l\'indicatif du pays) dans « Modifier ».'
        );
        return;
      }
      url = `https://wa.me/${numero.slice(1)}?text=${encodeURIComponent(message)}`;
    } else {
      url = `sms:${tel.replace(/\s/g, '')}?body=${encodeURIComponent(message)}`;
    }

    try {
      await Linking.openURL(url);
    } catch {
      setErreur("Impossible d'ouvrir l'application. Vérifie qu'elle est installée.");
    }
  };

  const ouvrirEdition = () => {
    setENom(client?.nom ?? '');
    setETel(client?.telephone ?? '');
    setELimite(client?.limite_credit != null ? String(client?.limite_credit) : '');
    setENote(client?.note ?? '');
    setErreurEdition('');
    setEdition(true);
  };

  const enregistrer = async () => {
    if (!eNom.trim()) {
      setErreurEdition('Le nom est obligatoire.');
      return;
    }
    const limiteTexte = eLimite.replace(/\s/g, '');
    if (limiteTexte && !/^\d+$/.test(limiteTexte)) {
      setErreurEdition('La limite doit contenir uniquement des chiffres.');
      return;
    }
    await modifierClient(db, clientId, {
      nom: eNom.trim(),
      telephone: eTel.trim() || null,
      limiteCredit: limiteTexte ? parseInt(limiteTexte, 10) : null,
      note: eNote.trim() || null,
    });
    setEdition(false);
    await charger();
  };

  const confirmerSuppression = () => {
    const avertissement =
      client?.solde > 0
        ? `${client?.nom} doit encore ${formatMontant(client?.solde)}. `
        : '';
    Alert.alert(
      'Supprimer ce client ?',
      `${avertissement}Son historique de dettes et de paiements sera effacé définitivement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await supprimerClient(db, clientId);
            onRetour();
          },
        },
      ]
    );
  };

  if (!client) return null;

  if (edition) {
    return (
      <View style={styles.container}>
        <Text style={styles.nom}>Modifier le client</Text>
        <View style={styles.formulaire}>
          <TextInput style={styles.input} placeholder="Nom" value={eNom} onChangeText={setENom} />
          <TextInput
            style={styles.input}
            placeholder="Téléphone (format international pour WhatsApp)"
            keyboardType="phone-pad"
            value={eTel}
            onChangeText={setETel}
          />
          <TextInput
            style={styles.input}
            placeholder={
              limiteDefaut != null
                ? `Limite de crédit (défaut : ${formatMontant(limiteDefaut)})`
                : 'Limite de crédit (optionnelle)'
            }
            keyboardType="numeric"
            value={eLimite}
            onChangeText={setELimite}
          />
          <TextInput
            style={styles.input}
            placeholder="Note"
            value={eNote}
            onChangeText={setENote}
          />
          {erreurEdition ? <Text style={styles.erreur}>{erreurEdition}</Text> : null}
          <View style={styles.boutons}>
            <Pressable style={[styles.bouton, styles.boutonGris]} onPress={() => setEdition(false)}>
              <Text style={styles.boutonTexte}>Annuler</Text>
            </Pressable>
            <Pressable style={[styles.bouton, styles.boutonPaiement]} onPress={enregistrer}>
              <Text style={styles.boutonTexte}>Enregistrer</Text>
            </Pressable>
          </View>
          <Pressable style={[styles.bouton, styles.boutonDette]} onPress={confirmerSuppression}>
            <Text style={styles.boutonTexte}>Supprimer ce client</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.entete}>
        <Pressable onPress={onRetour}>
          <Text style={styles.lien}>← Retour</Text>
        </Pressable>
        <Pressable onPress={ouvrirEdition}>
          <Text style={styles.lien}>Modifier</Text>
        </Pressable>
      </View>

      <Text style={styles.nom}>{client?.nom}</Text>
      {client?.telephone ? <Text style={styles.tel}>{client?.telephone}</Text> : null}
      {client?.note ? <Text style={styles.tel}>{client?.note}</Text> : null}
      <Text style={[styles.solde, client?.solde > 0 && styles.soldeDu]}>
        Solde : {formatMontant(client?.solde)}
      </Text>
      {limite != null ? (
        <Text style={styles.tel}>
          Limite de crédit : {formatMontant(limite)}
          {client?.limite_credit == null ? ' (par défaut)' : ''}
        </Text>
      ) : null}

      {client?.solde > 0 && client?.telephone ? (
        <View style={[styles.boutons, styles.rappels]}>
          <Pressable style={[styles.bouton, styles.boutonWhatsapp]} onPress={() => rappel('whatsapp')}>
            <Text style={styles.boutonTexte}>Rappel WhatsApp</Text>
          </Pressable>
          <Pressable style={[styles.bouton, styles.boutonGris]} onPress={() => rappel('sms')}>
            <Text style={styles.boutonTexte}>Rappel SMS</Text>
          </Pressable>
        </View>
      ) : null}

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
  entete: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lien: { color: '#1d4ed8', fontSize: 16 },
  nom: { fontSize: 24, fontWeight: '700' },
  tel: { color: '#666', marginTop: 2 },
  solde: { fontSize: 18, marginTop: 8, marginBottom: 4, color: '#444' },
  soldeDu: { color: '#b91c1c', fontWeight: '700' },
  formulaire: { gap: 8, marginVertical: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  erreur: { color: '#b91c1c' },
  boutons: { flexDirection: 'row', gap: 8 },
  rappels: { marginTop: 8 },
  bouton: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  boutonDette: { backgroundColor: '#b91c1c' },
  boutonPaiement: { backgroundColor: '#15803d' },
  boutonWhatsapp: { backgroundColor: '#128c7e' },
  boutonGris: { backgroundColor: '#6b7280' },
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