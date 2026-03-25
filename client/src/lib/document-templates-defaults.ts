/**
 * Modèles HTML par défaut pour chaque type de document.
 * Utilisés lors de la création d'un nouveau modèle pour pré-remplir l'éditeur.
 * Toutes les balises dynamiques ({variable}) sont issues de TEMPLATE_VARIABLES.
 */

export const DOCUMENT_DEFAULTS: Record<string, string> = {

  // ─────────────────────────────────────────────────────────────────────────
  // CONVENTION DE FORMATION
  // ─────────────────────────────────────────────────────────────────────────
  convention: `
<h1 style="text-align:center">CONVENTION DE FORMATION PROFESSIONNELLE CONTINUE</h1>
<p style="text-align:center"><em>Article L.6353-1 du Code du travail</em></p>
<br/>

<p>La présente convention est conclue entre :</p>

<p><strong>L'organisme de formation :</strong><br/>
SO'SAFE<br/>
N° de déclaration d'activité : {nda_organisme}<br/>
Représenté par sa direction</p>

<p><strong>Et :</strong><br/>
{nom_entreprise}<br/>
{adresse_entreprise}<br/>
SIRET : {siret_entreprise}<br/>
Représenté(e) par : {contact_entreprise}</p>

<br/>
<h2>Article 1 – Objet de la convention</h2>
<p>La présente convention a pour objet de définir les conditions dans lesquelles SO'SAFE dispensera une action de formation intitulée :</p>
<p><strong>{nom_formation}</strong></p>

<h2>Article 2 – Caractéristiques de la formation</h2>
<table>
  <tr><th>Intitulé</th><td>{nom_formation}</td></tr>
  <tr><th>Objectifs</th><td>{objectifs_formation}</td></tr>
  <tr><th>Durée</th><td>{duree_formation}</td></tr>
  <tr><th>Dates</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Modalité</th><td>{modalite_formation}</td></tr>
  <tr><th>Nombre de stagiaires</th><td>{nombre_stagiaires}</td></tr>
</table>

<h2>Article 3 – Programme et méthodes pédagogiques</h2>
<p>{programme_formation}</p>

<h2>Article 4 – Évaluation</h2>
<p>L'évaluation des acquis sera réalisée par {type_evaluation}. Une attestation de fin de formation sera remise au(x) stagiaire(s) ayant suivi l'intégralité de la formation.</p>

<h2>Article 5 – Prix et modalités de règlement</h2>
<p>Le coût total de la formation est fixé à : <strong>{montant_formation} € HT</strong></p>
<p>Modalités de règlement : à réception de la facture, à 30 jours.</p>

<h2>Article 6 – Dédit</h2>
<p>En cas d'abandon en cours de formation ou d'absence non justifiée, le stagiaire ou l'entreprise devra s'acquitter de la totalité du prix de la formation.</p>

<h2>Article 7 – Différend</h2>
<p>En cas de différend, les parties s'efforceront de trouver un accord amiable avant tout recours judiciaire.</p>

<br/>
<p>Fait en deux exemplaires, le {date_document}</p>

<br/>
<table>
  <tr>
    <th style="width:50%">Pour l'organisme de formation<br/>SO'SAFE</th>
    <th style="width:50%">Pour l'entreprise / le bénéficiaire<br/>{nom_entreprise}</th>
  </tr>
  <tr>
    <td style="height:60px">Signature et cachet :</td>
    <td style="height:60px">Signature et cachet :</td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // CONTRAT PARTICULIER / VAE
  // ─────────────────────────────────────────────────────────────────────────
  contrat_particulier: `
<h1 style="text-align:center">CONTRAT DE FORMATION PROFESSIONNELLE</h1>
<p style="text-align:center"><em>Articles L.6353-3 et suivants du Code du travail</em></p>
<br/>

<p>Entre :</p>
<p><strong>SO'SAFE</strong>, organisme de formation, déclaré sous le n° {nda_organisme},<br/>
ci-après dénommé « le prestataire »</p>

<p>Et :</p>
<p><strong>{nom_apprenant} {prenom_apprenant}</strong><br/>
Né(e) le {date_naissance_apprenant}<br/>
Domicilié(e) : {adresse_apprenant}<br/>
ci-après dénommé « le stagiaire »</p>

<h2>Article 1 – Objet du contrat</h2>
<p>Le prestataire s'engage à organiser l'action de formation suivante :<br/>
<strong>{nom_formation}</strong></p>

<h2>Article 2 – Caractéristiques</h2>
<table>
  <tr><th>Intitulé</th><td>{nom_formation}</td></tr>
  <tr><th>Durée totale</th><td>{duree_formation}</td></tr>
  <tr><th>Dates</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
</table>

<h2>Article 3 – Prix</h2>
<p>Le prix total de la formation est de <strong>{montant_formation} € TTC</strong>.</p>
<p>Modalités : {modalites_paiement}</p>

<h2>Article 4 – Rétractation</h2>
<p>Le stagiaire dispose d'un délai de 10 jours calendaires à compter de la signature du présent contrat pour se rétracter, par lettre recommandée avec accusé de réception.</p>

<h2>Article 5 – Résiliation</h2>
<p>Si le stagiaire est empêché de suivre la formation par suite de force majeure dûment reconnue, le contrat est résilié et l'organisme de formation rembourse au stagiaire les sommes versées.</p>

<br/>
<p>Fait à {lieu_session}, le {date_document}</p>
<br/>
<table>
  <tr>
    <th>Le prestataire</th>
    <th>Le stagiaire</th>
  </tr>
  <tr>
    <td style="height:60px">Signature :</td>
    <td style="height:60px">Signature :<br/><em>(précédée de la mention « Lu et approuvé »)</em></td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // CONVOCATION
  // ─────────────────────────────────────────────────────────────────────────
  convocation: `
<h1 style="text-align:center">CONVOCATION À LA FORMATION</h1>
<br/>

<p>Madame / Monsieur <strong>{nom_apprenant} {prenom_apprenant}</strong>,</p>

<p>Nous avons le plaisir de vous convoquer à la formation suivante :</p>

<table>
  <tr><th>Formation</th><td><strong>{nom_formation}</strong></td></tr>
  <tr><th>Date(s)</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Horaires</th><td>{horaires_session}</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Formateur</th><td>{nom_formateur}</td></tr>
  <tr><th>Durée</th><td>{duree_formation}</td></tr>
</table>

<br/>
<h2>Documents à apporter</h2>
<ul>
  <li>Une pièce d'identité valide</li>
  <li>Votre carte professionnelle (si applicable)</li>
  <li>Tout document demandé lors de votre inscription</li>
</ul>

<h2>Informations pratiques</h2>
<p>En cas d'empêchement, merci de nous contacter dès que possible au <strong>{telephone_organisme}</strong> ou par email à <strong>{email_organisme}</strong>.</p>

<p>Nous restons à votre disposition pour toute question.</p>

<br/>
<p>Cordialement,</p>
<p><strong>L'équipe SO'SAFE</strong></p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // ATTESTATION DE FIN DE FORMATION
  // ─────────────────────────────────────────────────────────────────────────
  attestation: `
<h1 style="text-align:center">ATTESTATION DE FIN DE FORMATION</h1>
<p style="text-align:center"><em>Article L.6353-1 du Code du travail</em></p>
<br/>

<p>Je soussigné(e), représentant(e) légal(e) de l'organisme de formation <strong>SO'SAFE</strong>, certifie que :</p>

<p style="text-align:center; font-size:1.2em">
  <strong>{nom_apprenant} {prenom_apprenant}</strong>
</p>

<p style="text-align:center">a suivi et réussi la formation :</p>

<p style="text-align:center; font-size:1.1em"><strong>« {nom_formation} »</strong></p>

<table>
  <tr><th>Dates de la formation</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Durée</th><td>{duree_formation}</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Formateur</th><td>{nom_formateur}</td></tr>
  <tr><th>Taux de présence</th><td>{taux_presence} %</td></tr>
</table>

<br/>
<h2>Objectifs atteints</h2>
<p>{objectifs_formation}</p>

<br/>
<p>La présente attestation est délivrée pour valoir ce que de droit.</p>

<br/>
<p>Fait à Paris, le {date_delivrance}</p>

<br/>
<table>
  <tr>
    <td style="width:50%">
      <strong>SO'SAFE</strong><br/>
      Cachet et signature :
      <div style="height:60px"></div>
    </td>
    <td style="width:50%; text-align:right">
      <strong>{nom_apprenant} {prenom_apprenant}</strong><br/>
      Signature :<br/>
      <div style="height:60px"></div>
    </td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // CERTIFICAT DE RÉALISATION
  // ─────────────────────────────────────────────────────────────────────────
  certificat_realisation: `
<h1 style="text-align:center">CERTIFICAT DE RÉALISATION</h1>
<p style="text-align:center"><em>Article L.6353-1 du Code du travail</em></p>
<br/>

<p>L'organisme de formation <strong>SO'SAFE</strong> (N° DA : {nda_organisme}) certifie avoir dispensé l'action de formation suivante :</p>

<table>
  <tr><th>Intitulé</th><td><strong>{nom_formation}</strong></td></tr>
  <tr><th>Bénéficiaire</th><td>{nom_apprenant} {prenom_apprenant}</td></tr>
  <tr><th>Dates de réalisation</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Durée totale</th><td>{duree_formation}</td></tr>
  <tr><th>Nombre de jours réalisés</th><td>{jours_realises}</td></tr>
  <tr><th>Heures réalisées</th><td>{heures_realisees} heures</td></tr>
  <tr><th>Lieu de réalisation</th><td>{lieu_session}</td></tr>
  <tr><th>Modalité</th><td>{modalite_formation}</td></tr>
  <tr><th>Statut de présence</th><td>{statut_presence}</td></tr>
</table>

<br/>
<p>Ce certificat est établi à la demande de l'intéressé(e) pour servir et valoir ce que de droit.</p>

<br/>
<p>Fait à Paris, le {date_delivrance}</p>
<br/>
<p><strong>SO'SAFE</strong> — Cachet et signature</p>
<div style="height:60px; border:1px dashed #ccc; width:200px; margin-top:8px"></div>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // ATTESTATION D'ASSIDUITÉ
  // ─────────────────────────────────────────────────────────────────────────
  attestation_assiduite: `
<h1 style="text-align:center">ATTESTATION D'ASSIDUITÉ</h1>
<br/>

<p>Je soussigné(e), responsable de l'organisme de formation <strong>SO'SAFE</strong>, atteste que :</p>

<p style="text-align:center"><strong>{nom_apprenant} {prenom_apprenant}</strong></p>

<p>a participé à la formation <strong>« {nom_formation} »</strong> avec le niveau d'assiduité suivant :</p>

<table>
  <tr><th>Nombre total de séances</th><td>{nombre_seances}</td></tr>
  <tr><th>Séances effectuées</th><td>{seances_presentes}</td></tr>
  <tr><th>Taux de présence</th><td><strong>{taux_presence} %</strong></td></tr>
  <tr><th>Heures réalisées</th><td>{heures_realisees} h sur {duree_formation}</td></tr>
  <tr><th>Période</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
</table>

<br/>
<p>Cette attestation est établie sur demande et pour valoir ce que de droit.</p>

<br/>
<p>Fait le {date_delivrance}</p>
<br/>
<p><strong>SO'SAFE</strong><br/>Cachet et signature :</p>
<div style="height:60px; border:1px dashed #ccc; width:200px; margin-top:8px"></div>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // ATTESTATION DPC
  // ─────────────────────────────────────────────────────────────────────────
  attestation_dpc: `
<h1 style="text-align:center">ATTESTATION DE PARTICIPATION — DÉVELOPPEMENT PROFESSIONNEL CONTINU (DPC)</h1>
<br/>

<p>L'organisme de développement professionnel continu <strong>SO'SAFE</strong> atteste que :</p>

<p style="text-align:center"><strong>{nom_apprenant} {prenom_apprenant}</strong></p>

<p>a participé à l'action de DPC suivante :</p>

<table>
  <tr><th>Intitulé de l'action</th><td><strong>{nom_formation}</strong></td></tr>
  <tr><th>N° de dossier DPC</th><td>{numero_dpc}</td></tr>
  <tr><th>Type de financement</th><td>{type_financement}</td></tr>
  <tr><th>Dates</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Durée</th><td>{duree_formation}</td></tr>
  <tr><th>Heures réalisées</th><td>{heures_realisees} heures</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Formateur</th><td>{nom_formateur}</td></tr>
</table>

<br/>
<p>L'action satisfait aux critères de qualité définis par le Développement Professionnel Continu.</p>

<br/>
<p>Fait le {date_delivrance}</p>
<br/>
<p><strong>SO'SAFE</strong> — Signature :</p>
<div style="height:60px; border:1px dashed #ccc; width:200px; margin-top:8px"></div>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // DEVIS
  // ─────────────────────────────────────────────────────────────────────────
  devis: `
<h1 style="text-align:center">DEVIS</h1>
<p style="text-align:right">N° Devis : {numero_devis}<br/>Date : {date_document}</p>

<h2>Émetteur</h2>
<p><strong>SO'SAFE</strong><br/>
{adresse_organisme}<br/>
SIRET : {siret_organisme}<br/>
N° DA : {nda_organisme}</p>

<h2>Destinataire</h2>
<p><strong>{nom_entreprise}</strong><br/>
{adresse_entreprise}<br/>
SIRET : {siret_entreprise}<br/>
À l'attention de : {contact_entreprise}</p>

<h2>Objet</h2>
<p>Prestation de formation professionnelle : <strong>{nom_formation}</strong></p>

<h2>Détail de la prestation</h2>
<table>
  <tr><th>Désignation</th><th>Quantité</th><th>P.U. HT</th><th>Total HT</th></tr>
  <tr>
    <td>Formation {nom_formation} — {duree_formation}</td>
    <td>{nombre_stagiaires} stagiaire(s)</td>
    <td>{montant_formation} €</td>
    <td>{montant_formation} €</td>
  </tr>
</table>

<br/>
<table>
  <tr><th>Total HT</th><td>{montant_formation} €</td></tr>
  <tr><th>TVA (20 %)</th><td>Exonéré — Article 261-4-4° du CGI (organismes de formation)</td></tr>
  <tr><th>Total TTC</th><td><strong>{montant_formation} €</strong></td></tr>
</table>

<br/>
<p>Devis valable 30 jours à compter de sa date d'émission.</p>
<p>Pour acceptation, merci de nous retourner ce devis signé avec la mention « Bon pour accord ».</p>

<br/>
<table>
  <tr>
    <th>SO'SAFE</th>
    <th>{nom_entreprise}</th>
  </tr>
  <tr>
    <td style="height:60px">Signature :</td>
    <td style="height:60px">Bon pour accord — Date :<br/>Signature :</td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // FACTURE
  // ─────────────────────────────────────────────────────────────────────────
  facture: `
<h1 style="text-align:center">FACTURE</h1>
<p style="text-align:right">N° Facture : {numero_facture}<br/>Date : {date_document}</p>

<h2>Émetteur</h2>
<p><strong>SO'SAFE</strong><br/>
{adresse_organisme}<br/>
SIRET : {siret_organisme}<br/>
N° DA : {nda_organisme}</p>

<h2>Facturé à</h2>
<p><strong>{nom_entreprise}</strong><br/>
{adresse_entreprise}<br/>
SIRET : {siret_entreprise}</p>

<h2>Détail</h2>
<table>
  <tr><th>Désignation</th><th>Quantité</th><th>P.U. HT</th><th>Total HT</th></tr>
  <tr>
    <td>Formation : {nom_formation}<br/><em>Du {date_debut_session} au {date_fin_session} — {duree_formation}</em></td>
    <td>{nombre_stagiaires} pers.</td>
    <td>{montant_formation} €</td>
    <td>{montant_formation} €</td>
  </tr>
</table>

<br/>
<table>
  <tr><th>Total HT</th><td>{montant_formation} €</td></tr>
  <tr><th>TVA</th><td>Non applicable — Art. 261-4-4° du CGI</td></tr>
  <tr><th style="font-size:1.1em">TOTAL TTC</th><td style="font-size:1.1em"><strong>{montant_formation} €</strong></td></tr>
</table>

<br/>
<p><strong>Règlement :</strong> Virement bancaire — IBAN : [IBAN SO'SAFE] — Dans un délai de 30 jours.</p>
<p><em>En cas de retard de paiement, des pénalités de 3 fois le taux légal seront appliquées, ainsi qu'une indemnité forfaitaire de recouvrement de 40 €.</em></p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // PROGRAMME DE FORMATION
  // ─────────────────────────────────────────────────────────────────────────
  programme: `
<h1 style="text-align:center">PROGRAMME DE FORMATION</h1>
<p style="text-align:center"><strong>{nom_formation}</strong></p>
<br/>

<table>
  <tr><th>Durée</th><td>{duree_formation}</td></tr>
  <tr><th>Dates</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Formateur</th><td>{nom_formateur}</td></tr>
  <tr><th>Modalité</th><td>{modalite_formation}</td></tr>
  <tr><th>Public visé</th><td>Professionnels de santé — Tout public</td></tr>
  <tr><th>Prérequis</th><td>Aucun</td></tr>
  <tr><th>Nombre de participants</th><td>Maximum {nombre_stagiaires} personnes</td></tr>
</table>

<h2>Objectifs de la formation</h2>
<p>{objectifs_formation}</p>

<h2>Contenu pédagogique</h2>
<h3>Partie 1 — Apports théoriques</h3>
<ul>
  <li>Module 1 : [Contenu du module 1]</li>
  <li>Module 2 : [Contenu du module 2]</li>
  <li>Module 3 : [Contenu du module 3]</li>
</ul>

<h3>Partie 2 — Mise en pratique</h3>
<ul>
  <li>Exercices pratiques et simulations</li>
  <li>Études de cas concrets</li>
  <li>Évaluation des acquis</li>
</ul>

<h2>Méthodes pédagogiques</h2>
<p>Exposés théoriques, travaux pratiques, exercices de mise en situation, supports de cours remis aux participants.</p>

<h2>Évaluation</h2>
<p>{type_evaluation}</p>

<h2>Sanction de la formation</h2>
<p>Attestation de fin de formation délivrée aux participants ayant suivi l'intégralité du programme.</p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // RÈGLEMENT INTÉRIEUR
  // ─────────────────────────────────────────────────────────────────────────
  reglement: `
<h1 style="text-align:center">RÈGLEMENT INTÉRIEUR DE LA FORMATION PROFESSIONNELLE</h1>
<p style="text-align:center"><em>SO'SAFE — Organisme de formation</em></p>
<br/>

<p>Conformément aux articles L.6352-3 et L.6352-4 du Code du travail, le présent règlement intérieur s'applique à toute personne participant à une action de formation dispensée par SO'SAFE.</p>

<h2>Article 1 — Objet et champ d'application</h2>
<p>Le présent règlement intérieur définit les règles d'hygiène, de sécurité et de discipline applicables à tous les stagiaires accueillis au sein de nos sessions de formation.</p>

<h2>Article 2 — Horaires</h2>
<p>Les stagiaires sont tenus de respecter les horaires de formation indiqués dans leur convocation. Tout retard ou absence doit être signalé à l'organisme de formation dans les meilleurs délais.</p>

<h2>Article 3 — Assiduité</h2>
<p>La présence à l'intégralité des séances de formation est obligatoire. Les absences sont portées sur la feuille d'émargement. En cas d'absence justifiée (maladie, force majeure), le stagiaire doit en informer SO'SAFE dans les 24h.</p>

<h2>Article 4 — Discipline</h2>
<p>Tout comportement perturbateur, irrespectueux ou contraire à l'ordre public pourra entraîner l'exclusion temporaire ou définitive du stage. Toute fraude ou tentative de fraude lors des évaluations est strictement interdite.</p>

<h2>Article 5 — Hygiène et sécurité</h2>
<p>Les participants doivent respecter les consignes de sécurité du lieu de formation. En cas d'accident survenant pendant la formation, le stagiaire s'engage à prévenir immédiatement l'organisme de formation.</p>

<h2>Article 6 — Matériel et locaux</h2>
<p>Les stagiaires s'engagent à utiliser avec soin les équipements pédagogiques mis à leur disposition. Tout dommage causé intentionnellement aux équipements sera à la charge du responsable.</p>

<h2>Article 7 — Représentation des stagiaires</h2>
<p>Dans les sessions regroupant plus de 20 stagiaires, des délégués peuvent être élus pour représenter les participants auprès de l'organisme de formation.</p>

<h2>Article 8 — Sanctions</h2>
<p>En cas de manquement au présent règlement, les mesures disciplinaires suivantes peuvent être prononcées : avertissement, mise à pied temporaire, exclusion définitive de la formation.</p>

<br/>
<p>Le présent règlement intérieur est remis à chaque stagiaire à son entrée en formation.</p>
<p>En s'inscrivant à une action de formation SO'SAFE, le participant reconnaît en avoir pris connaissance et en accepter les termes.</p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // CONDITIONS GÉNÉRALES DE VENTE (CGV)
  // ─────────────────────────────────────────────────────────────────────────
  cgv: `
<h1 style="text-align:center">CONDITIONS GÉNÉRALES DE VENTE (CGV)</h1>
<p style="text-align:center"><em>SO'SAFE — Organisme de formation professionnelle</em></p>
<br/>

<h2>Article 1 — Champ d'application</h2>
<p>Les présentes CGV s'appliquent à toutes les prestations de formation dispensées par SO'SAFE, à destination de toute personne physique ou morale (ci-après « le Client »).</p>

<h2>Article 2 — Inscription</h2>
<p>L'inscription à une formation est définitive à réception du devis signé ou de la convention de formation signée. Toute inscription vaut acceptation des présentes CGV.</p>

<h2>Article 3 — Tarifs</h2>
<p>Les tarifs sont exprimés en euros HT. SO'SAFE bénéficie de l'exonération de TVA conformément à l'article 261-4-4° du CGI. Les prix peuvent être révisés sans préavis.</p>

<h2>Article 4 — Modalités de règlement</h2>
<p>Les factures sont payables à 30 jours date de facture, par virement bancaire. Tout retard de paiement entraîne des pénalités de 3 fois le taux légal, ainsi qu'une indemnité forfaitaire de recouvrement de 40 €.</p>

<h2>Article 5 — Annulation et report</h2>
<p><strong>Par le Client :</strong> Toute annulation doit être notifiée par écrit. En cas d'annulation moins de 7 jours ouvrés avant le début de la formation, la totalité du prix est due. Au-delà de ce délai, aucune pénalité n'est appliquée.</p>
<p><strong>Par SO'SAFE :</strong> SO'SAFE se réserve le droit d'annuler ou reporter une session en cas de force majeure ou d'effectif insuffisant. Le Client sera prévenu dans les meilleurs délais et un remboursement intégral sera effectué si aucun report ne convient.</p>

<h2>Article 6 — Propriété intellectuelle</h2>
<p>Tous les supports pédagogiques remis lors des formations sont la propriété exclusive de SO'SAFE et ne peuvent être reproduits, diffusés ou exploités sans autorisation écrite préalable.</p>

<h2>Article 7 — Confidentialité et RGPD</h2>
<p>SO'SAFE s'engage à traiter les données personnelles conformément au Règlement (UE) 2016/679 (RGPD). Les données sont collectées pour la gestion administrative des formations et ne sont pas transmises à des tiers sans consentement.</p>

<h2>Article 8 — Responsabilité</h2>
<p>SO'SAFE ne saurait être tenu responsable des dommages indirects liés à la participation ou non-participation à une formation.</p>

<h2>Article 9 — Litiges</h2>
<p>En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, le Tribunal compétent sera celui du siège de SO'SAFE.</p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // CONVENTION D'INTERVENTION (formateur)
  // ─────────────────────────────────────────────────────────────────────────
  convention_intervention: `
<h1 style="text-align:center">CONVENTION D'INTERVENTION DE FORMATEUR</h1>
<br/>

<p>Entre :</p>
<p><strong>SO'SAFE</strong>, organisme de formation,<br/>
ci-après dénommé « le Donneur d'ordre »</p>

<p>Et :</p>
<p><strong>{nom_formateur} {prenom_formateur}</strong><br/>
Statut : {statut_formateur}<br/>
SIRET : {siret_formateur}<br/>
Adresse : {adresse_formateur}<br/>
ci-après dénommé « l'Intervenant »</p>

<h2>Article 1 — Objet</h2>
<p>Le Donneur d'ordre confie à l'Intervenant la mission de formation suivante :</p>
<p><strong>{objet_mission}</strong></p>

<h2>Article 2 — Conditions d'intervention</h2>
<table>
  <tr><th>Session</th><td>{nom_formation}</td></tr>
  <tr><th>Dates</th><td>Du {date_debut_mission} au {date_fin_mission}</td></tr>
  <tr><th>Lieu</th><td>{lieu_mission}</td></tr>
  <tr><th>Durée</th><td>{nombre_jours_mission} jour(s)</td></tr>
  <tr><th>Public</th><td>{nombre_stagiaires} stagiaire(s)</td></tr>
</table>

<h2>Article 3 — Rémunération</h2>
<p>L'Intervenant percevra une rémunération de :</p>
<table>
  <tr><th>Taux journalier</th><td>{taux_journalier} € HT / jour</td></tr>
  <tr><th>Nombre de jours</th><td>{nombre_jours_mission}</td></tr>
  <tr><th>Total honoraires HT</th><td><strong>{honoraires_session} € HT</strong></td></tr>
</table>
<p>Règlement sur présentation de facture, sous 30 jours.</p>
<p>RIB / IBAN : {rib_formateur}</p>

<h2>Article 4 — Obligations de l'Intervenant</h2>
<ul>
  <li>Dispenser la formation conformément au programme défini</li>
  <li>Tenir les feuilles d'émargement à jour</li>
  <li>Respecter le règlement intérieur du lieu de formation</li>
  <li>Garantir la confidentialité des informations des stagiaires</li>
</ul>

<h2>Article 5 — Indépendance</h2>
<p>L'Intervenant exerce sa mission en toute indépendance, sans lien de subordination avec SO'SAFE.</p>

<br/>
<p>Fait en deux exemplaires, le {date_document}</p>
<br/>
<table>
  <tr>
    <th>Pour SO'SAFE</th>
    <th>L'Intervenant</th>
  </tr>
  <tr>
    <td style="height:60px">Signature :</td>
    <td style="height:60px">Signature :<br/><em>(Lu et approuvé)</em></td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // CONTRAT CADRE DE SOUS-TRAITANCE
  // ─────────────────────────────────────────────────────────────────────────
  contrat_cadre: `
<h1 style="text-align:center">CONTRAT CADRE DE SOUS-TRAITANCE</h1>
<br/>

<p>Entre :</p>
<p><strong>SO'SAFE</strong>, organisme de formation,<br/>
ci-après dénommé « le Donneur d'ordre »</p>

<p>Et :</p>
<p><strong>{nom_formateur} {prenom_formateur}</strong><br/>
SIRET : {siret_formateur}<br/>
Adresse : {adresse_formateur}<br/>
ci-après dénommé « le Prestataire »</p>

<h2>Article 1 — Objet</h2>
<p>Le présent contrat cadre définit les conditions générales dans lesquelles le Prestataire interviendra ponctuellement pour le compte de SO'SAFE sur des actions de formation professionnelle.</p>

<h2>Article 2 — Durée</h2>
<p>Le présent contrat est conclu pour une durée d'un an, renouvelable par tacite reconduction.</p>

<h2>Article 3 — Missions</h2>
<p>Chaque intervention fera l'objet d'une convention d'intervention spécifique précisant les dates, lieu, public et rémunération.</p>

<h2>Article 4 — Rémunération</h2>
<p>La rémunération est déterminée d'un commun accord pour chaque intervention et précisée dans la convention d'intervention correspondante. Taux journalier de référence : {taux_journalier} € HT.</p>

<h2>Article 5 — Confidentialité</h2>
<p>Le Prestataire s'engage à ne divulguer aucune information confidentielle relative aux activités, clients, programmes ou méthodes pédagogiques de SO'SAFE.</p>

<h2>Article 6 — Propriété intellectuelle</h2>
<p>Les supports pédagogiques créés dans le cadre des missions restent la propriété de SO'SAFE, sauf accord contraire écrit.</p>

<h2>Article 7 — Indépendance</h2>
<p>Le Prestataire agit en qualité de travailleur indépendant. La présente convention n'emporte aucun lien de subordination.</p>

<br/>
<p>Fait en deux exemplaires, le {date_document}</p>
<br/>
<table>
  <tr>
    <th>Pour SO'SAFE</th>
    <th>Le Prestataire</th>
  </tr>
  <tr>
    <td style="height:60px">Signature :</td>
    <td style="height:60px">Signature :<br/><em>(Lu et approuvé)</em></td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // AUTORISATION D'EXPLOITATION D'IMAGE
  // ─────────────────────────────────────────────────────────────────────────
  autorisation_image: `
<h1 style="text-align:center">AUTORISATION D'EXPLOITATION DE DROITS À L'IMAGE</h1>
<br/>

<p>Je soussigné(e) :</p>
<p><strong>{nom_apprenant} {prenom_apprenant}</strong><br/>
Né(e) le : {date_naissance_apprenant}<br/>
Adresse : {adresse_apprenant}</p>

<p>Autorise l'organisme de formation <strong>SO'SAFE</strong> à prendre des photos et/ou vidéos lors de la formation :</p>
<p><strong>« {nom_formation} »</strong> — Du {date_debut_session} au {date_fin_session}</p>

<h2>Utilisation autorisée</h2>
<p>Ces images pourront être utilisées à des fins exclusivement pédagogiques et de communication de SO'SAFE, sur les supports suivants :</p>
<ul>
  <li>Site internet de SO'SAFE</li>
  <li>Réseaux sociaux professionnels</li>
  <li>Brochures et supports de communication imprimés</li>
  <li>Dossiers de réponse à appels d'offres</li>
</ul>

<h2>Durée et territoire</h2>
<p>La présente autorisation est accordée pour une durée de 5 ans à compter de la signature, pour le monde entier.</p>

<h2>Révocation</h2>
<p>Cette autorisation peut être révoquée à tout moment par courrier recommandé adressé à SO'SAFE. La révocation ne porte pas sur les publications déjà effectuées.</p>

<h2>Contrepartie</h2>
<p>Cette autorisation est accordée à titre gracieux.</p>

<br/>
<p>Fait à {lieu_session}, le {date_document}</p>
<br/>
<table>
  <tr>
    <th>L'intéressé(e)</th>
    <th>SO'SAFE</th>
  </tr>
  <tr>
    <td style="height:60px">Signature :<br/><em>(Précédée de la mention « Lu et approuvé »)</em></td>
    <td style="height:60px">Signature :</td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // ADMISSIBILITÉ VAE
  // ─────────────────────────────────────────────────────────────────────────
  admissibilite_vae: `
<h1 style="text-align:center">COURRIER D'ADMISSIBILITÉ — VALIDATION DES ACQUIS DE L'EXPÉRIENCE (VAE)</h1>
<br/>

<p>Paris, le {date_document}</p>
<br/>

<p><strong>{nom_apprenant} {prenom_apprenant}</strong><br/>
{adresse_apprenant}</p>

<p>Objet : Décision d'admissibilité à votre démarche VAE — {nom_formation}</p>

<p>Madame / Monsieur {nom_apprenant},</p>

<p>Nous avons bien réceptionné votre livret de recevabilité (Livret 1) relatif à votre projet de Validation des Acquis de l'Expérience pour la certification :</p>

<p style="text-align:center"><strong>« {nom_formation} »</strong></p>

<p>Après examen de votre dossier, nous avons le plaisir de vous informer que votre candidature est <strong>ADMISSIBLE</strong>.</p>

<h2>Prochaines étapes</h2>
<ol>
  <li>Constitution du Livret 2 (dossier de preuves)</li>
  <li>Accompagnement VAE — {duree_formation}</li>
  <li>Passage devant le jury de validation</li>
</ol>

<h2>Votre référent VAE</h2>
<p>{nom_formateur}<br/>
Contact : {email_organisme}</p>

<p>Nous vous remercions de la confiance que vous accordez à SO'SAFE et nous mettons à votre disposition pour vous accompagner tout au long de cette démarche.</p>

<br/>
<p>Cordialement,</p>
<p><strong>SO'SAFE</strong></p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // CERTIFICAT (générique)
  // ─────────────────────────────────────────────────────────────────────────
  certificat: `
<h1 style="text-align:center">CERTIFICAT</h1>
<br/>

<p>L'organisme de formation <strong>SO'SAFE</strong> certifie que :</p>

<p style="text-align:center; font-size:1.2em">
  <strong>{nom_apprenant} {prenom_apprenant}</strong>
</p>

<p style="text-align:center">a suivi avec succès la formation :</p>

<p style="text-align:center; font-size:1.1em"><strong>« {nom_formation} »</strong></p>

<table>
  <tr><th>Dates</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Durée</th><td>{duree_formation}</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Formateur</th><td>{nom_formateur}</td></tr>
  <tr><th>Modalité</th><td>{modalite_formation}</td></tr>
</table>

<br/>
<h2>Compétences acquises</h2>
<p>{objectifs_formation}</p>

<br/>
<p>Le présent certificat est délivré pour faire valoir ce que de droit.</p>

<br/>
<p>Fait à Paris, le {date_delivrance}</p>

<br/>
<table>
  <tr>
    <td style="width:50%">
      <strong>SO'SAFE</strong><br/>
      Cachet et signature :
      <div style="height:60px"></div>
    </td>
    <td style="width:50%; text-align:right">
      <strong>{nom_apprenant} {prenom_apprenant}</strong><br/>
      Signature :<br/>
      <div style="height:60px"></div>
    </td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // CONTRAT VAE
  // ─────────────────────────────────────────────────────────────────────────
  contrat_vae: `
<h1 style="text-align:center">CONTRAT D'ACCOMPAGNEMENT À LA VALIDATION DES ACQUIS DE L'EXPÉRIENCE (VAE)</h1>
<p style="text-align:center"><em>Articles L.6313-5 et L.6353-3 du Code du travail</em></p>
<br/>

<p>Entre :</p>
<p><strong>SO'SAFE</strong>, organisme de formation,<br/>
N° de déclaration d'activité : {nda_organisme}<br/>
ci-après dénommé « le prestataire »</p>

<p>Et :</p>
<p><strong>{nom_apprenant} {prenom_apprenant}</strong><br/>
Né(e) le {date_naissance_apprenant}<br/>
Domicilié(e) : {adresse_apprenant}<br/>
ci-après dénommé « le bénéficiaire »</p>

<h2>Article 1 – Objet</h2>
<p>Le présent contrat a pour objet l'accompagnement du bénéficiaire dans sa démarche de VAE pour l'obtention de la certification :</p>
<p><strong>{nom_formation}</strong></p>

<h2>Article 2 – Caractéristiques de la prestation</h2>
<table>
  <tr><th>Nature de la prestation</th><td>Accompagnement VAE</td></tr>
  <tr><th>Durée totale</th><td>{duree_formation}</td></tr>
  <tr><th>Dates prévisionnelles</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Modalité</th><td>{modalite_formation}</td></tr>
</table>

<h2>Article 3 – Étapes de l'accompagnement</h2>
<ol>
  <li>Analyse de la recevabilité et du parcours professionnel</li>
  <li>Aide à la rédaction du Livret 2 (dossier de preuves)</li>
  <li>Préparation au passage devant le jury de validation</li>
  <li>Suivi post-jury (en cas de validation partielle)</li>
</ol>

<h2>Article 4 – Prix et financement</h2>
<p>Le coût total de l'accompagnement est de <strong>{montant_formation} € TTC</strong>.</p>
<p>Type de financement : {type_financement}</p>

<h2>Article 5 – Rétractation</h2>
<p>Le bénéficiaire dispose d'un délai de 10 jours calendaires à compter de la signature pour se rétracter par lettre recommandée avec accusé de réception.</p>

<h2>Article 6 – Résiliation</h2>
<p>Le contrat peut être résilié en cas de force majeure. Les sommes non utilisées seront remboursées au prorata.</p>

<br/>
<p>Fait en deux exemplaires, le {date_document}</p>
<br/>
<table>
  <tr>
    <th>Le prestataire — SO'SAFE</th>
    <th>Le bénéficiaire</th>
  </tr>
  <tr>
    <td style="height:60px">Signature :</td>
    <td style="height:60px">Signature :<br/><em>(« Lu et approuvé »)</em></td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // ATTESTATION FIFPL
  // ─────────────────────────────────────────────────────────────────────────
  attestation_fifpl: `
<h1 style="text-align:center">ATTESTATION DE PRÉSENCE — FINANCEMENT FIFPL</h1>
<br/>

<p>L'organisme de formation <strong>SO'SAFE</strong> (N° DA : {nda_organisme}) atteste que :</p>

<p style="text-align:center"><strong>{nom_apprenant} {prenom_apprenant}</strong></p>

<p>a suivi l'action de formation suivante dans le cadre d'un financement FIFPL :</p>

<table>
  <tr><th>Intitulé</th><td><strong>{nom_formation}</strong></td></tr>
  <tr><th>N° de dossier FIFPL</th><td>{numero_fifpl}</td></tr>
  <tr><th>Type de financement</th><td>{type_financement}</td></tr>
  <tr><th>Dates</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Durée totale</th><td>{duree_formation}</td></tr>
  <tr><th>Heures réalisées</th><td>{heures_realisees} heures</td></tr>
  <tr><th>Taux de présence</th><td>{taux_presence} %</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Formateur</th><td>{nom_formateur}</td></tr>
</table>

<br/>
<p>Le stagiaire a suivi l'intégralité de la formation et satisfait aux conditions requises par le FIFPL.</p>

<br/>
<p>Fait le {date_delivrance}</p>
<br/>
<p><strong>SO'SAFE</strong> — Cachet et signature :</p>
<div style="height:60px; border:1px dashed #ccc; width:200px; margin-top:8px"></div>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // POLITIQUE DE CONFIDENTIALITÉ
  // ─────────────────────────────────────────────────────────────────────────
  politique_confidentialite: `
<h1 style="text-align:center">POLITIQUE DE CONFIDENTIALITÉ</h1>
<p style="text-align:center"><em>SO'SAFE — Organisme de formation</em></p>
<br/>

<h2>Article 1 — Objet</h2>
<p>La présente politique de confidentialité décrit la manière dont SO'SAFE collecte, utilise et protège les données personnelles de ses stagiaires, clients et partenaires conformément au Règlement (UE) 2016/679 (RGPD).</p>

<h2>Article 2 — Données collectées</h2>
<p>Les données collectées incluent :</p>
<ul>
  <li>Identité (nom, prénom, date de naissance)</li>
  <li>Coordonnées (adresse, email, téléphone)</li>
  <li>Données professionnelles (poste, employeur, SIRET)</li>
  <li>Données de formation (inscriptions, résultats, attestations)</li>
  <li>Données de facturation (montants, modalités de paiement)</li>
</ul>

<h2>Article 3 — Finalités du traitement</h2>
<p>Les données sont traitées pour : la gestion administrative des formations, l'émission de documents réglementaires (conventions, attestations, certificats), la facturation, le suivi qualité Qualiopi et les relances de recyclage.</p>

<h2>Article 4 — Base légale</h2>
<p>Le traitement repose sur l'exécution du contrat de formation, le respect d'obligations légales (Qualiopi, Code du travail) et l'intérêt légitime de l'organisme.</p>

<h2>Article 5 — Durée de conservation</h2>
<p>Les données sont conservées pendant 10 ans à compter de la fin de la dernière formation, conformément aux obligations réglementaires en matière de formation professionnelle.</p>

<h2>Article 6 — Droits des personnes</h2>
<p>Conformément au RGPD, toute personne dispose d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition. Ces droits peuvent être exercés par courrier ou email adressé à SO'SAFE.</p>

<h2>Article 7 — Sécurité</h2>
<p>SO'SAFE met en œuvre des mesures techniques et organisationnelles appropriées pour garantir la sécurité et la confidentialité des données personnelles.</p>

<h2>Article 8 — Transfert de données</h2>
<p>Les données ne sont pas transférées en dehors de l'Union européenne. Elles ne sont pas communiquées à des tiers sans le consentement des personnes concernées, sauf obligation légale.</p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // DEVIS SOUS-TRAITANCE
  // ─────────────────────────────────────────────────────────────────────────
  devis_sous_traitance: `
<h1 style="text-align:center">DEVIS DE SOUS-TRAITANCE</h1>
<p style="text-align:right">N° Devis : {numero_devis}<br/>Date : {date_document}</p>

<h2>Donneur d'ordre</h2>
<p><strong>SO'SAFE</strong><br/>
{adresse_organisme}<br/>
SIRET : {siret_organisme}</p>

<h2>Prestataire</h2>
<p><strong>{nom_formateur} {prenom_formateur}</strong><br/>
SIRET : {siret_formateur}<br/>
Adresse : {adresse_formateur}</p>

<h2>Objet</h2>
<p>Prestation de formation en sous-traitance : <strong>{nom_formation}</strong></p>

<h2>Détail de la prestation</h2>
<table>
  <tr><th>Désignation</th><th>Nb jours</th><th>Taux journalier HT</th><th>Total HT</th></tr>
  <tr>
    <td>Intervention : {nom_formation}<br/><em>Du {date_debut_mission} au {date_fin_mission}</em></td>
    <td>{nombre_jours_mission}</td>
    <td>{taux_journalier} €</td>
    <td>{honoraires_session} €</td>
  </tr>
</table>

<br/>
<table>
  <tr><th>Total HT</th><td>{honoraires_session} €</td></tr>
  <tr><th>TVA</th><td>Selon régime du prestataire</td></tr>
</table>

<br/>
<p>Devis valable 30 jours.</p>

<br/>
<table>
  <tr>
    <th>SO'SAFE</th>
    <th>Le Prestataire</th>
  </tr>
  <tr>
    <td style="height:60px">Bon pour accord :</td>
    <td style="height:60px">Signature :</td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // FACTURE BLENDED
  // ─────────────────────────────────────────────────────────────────────────
  facture_blended: `
<h1 style="text-align:center">FACTURE — FORMATION BLENDED LEARNING</h1>
<p style="text-align:right">N° Facture : {numero_facture}<br/>Date : {date_document}</p>

<h2>Émetteur</h2>
<p><strong>SO'SAFE</strong><br/>
{adresse_organisme}<br/>
SIRET : {siret_organisme}<br/>
N° DA : {nda_organisme}</p>

<h2>Facturé à</h2>
<p><strong>{nom_entreprise}</strong><br/>
{adresse_entreprise}<br/>
SIRET : {siret_entreprise}</p>

<h2>Détail de la prestation</h2>
<table>
  <tr><th>Désignation</th><th>Quantité</th><th>P.U. HT</th><th>Total HT</th></tr>
  <tr>
    <td>
      Formation blended : <strong>{nom_formation}</strong><br/>
      <em>Partie présentielle : Du {date_debut_session} au {date_fin_session} — {lieu_session}</em><br/>
      <em>Partie e-learning : accès plateforme inclus</em>
    </td>
    <td>{nombre_stagiaires} pers.</td>
    <td>{montant_formation} €</td>
    <td>{montant_formation} €</td>
  </tr>
</table>

<br/>
<table>
  <tr><th>Total HT</th><td>{montant_formation} €</td></tr>
  <tr><th>TVA</th><td>Non applicable — Art. 261-4-4° du CGI</td></tr>
  <tr><th style="font-size:1.1em">TOTAL TTC</th><td style="font-size:1.1em"><strong>{montant_formation} €</strong></td></tr>
</table>

<br/>
<p><strong>Règlement :</strong> Virement bancaire — Délai 30 jours.</p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // FACTURE SPÉCIFIQUE
  // ─────────────────────────────────────────────────────────────────────────
  facture_specifique: `
<h1 style="text-align:center">FACTURE — FORMATION SPÉCIFIQUE</h1>
<p style="text-align:right">N° Facture : {numero_facture}<br/>Date : {date_document}</p>

<h2>Émetteur</h2>
<p><strong>SO'SAFE</strong><br/>
{adresse_organisme}<br/>
SIRET : {siret_organisme}<br/>
N° DA : {nda_organisme}</p>

<h2>Facturé à</h2>
<p><strong>{nom_entreprise}</strong><br/>
{adresse_entreprise}<br/>
SIRET : {siret_entreprise}</p>

<h2>Détail de la prestation</h2>
<table>
  <tr><th>Désignation</th><th>Quantité</th><th>P.U. HT</th><th>Total HT</th></tr>
  <tr>
    <td>
      Formation sur mesure : <strong>{nom_formation}</strong><br/>
      <em>Du {date_debut_session} au {date_fin_session} — {duree_formation}</em><br/>
      <em>Lieu : {lieu_session}</em>
    </td>
    <td>{nombre_stagiaires} pers.</td>
    <td>{montant_formation} €</td>
    <td>{montant_formation} €</td>
  </tr>
</table>

<br/>
<table>
  <tr><th>Total HT</th><td>{montant_formation} €</td></tr>
  <tr><th>TVA</th><td>Non applicable — Art. 261-4-4° du CGI</td></tr>
  <tr><th style="font-size:1.1em">TOTAL TTC</th><td style="font-size:1.1em"><strong>{montant_formation} €</strong></td></tr>
</table>

<br/>
<p><strong>Règlement :</strong> Virement bancaire — Délai 30 jours.</p>
<p><em>En cas de retard, pénalités de 3× le taux légal + indemnité forfaitaire de 40 €.</em></p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // FICHE FIFPL (demande de prise en charge)
  // ─────────────────────────────────────────────────────────────────────────
  fiche_fipl: `
<h1 style="text-align:center">FICHE DE DEMANDE DE PRISE EN CHARGE FIFPL</h1>
<br/>

<h2>Organisme de formation</h2>
<table>
  <tr><th>Nom</th><td>SO'SAFE</td></tr>
  <tr><th>N° de déclaration d'activité</th><td>{nda_organisme}</td></tr>
  <tr><th>Adresse</th><td>{adresse_organisme}</td></tr>
  <tr><th>Contact</th><td>{email_organisme} — {telephone_organisme}</td></tr>
</table>

<h2>Stagiaire</h2>
<table>
  <tr><th>Nom</th><td>{nom_apprenant} {prenom_apprenant}</td></tr>
  <tr><th>Profession</th><td>[Profession libérale]</td></tr>
  <tr><th>N° RPPS / ADELI</th><td>[À compléter]</td></tr>
</table>

<h2>Formation</h2>
<table>
  <tr><th>Intitulé</th><td><strong>{nom_formation}</strong></td></tr>
  <tr><th>Dates</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Durée</th><td>{duree_formation}</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Coût pédagogique</th><td>{montant_formation} € HT</td></tr>
  <tr><th>N° dossier FIFPL</th><td>{numero_fifpl}</td></tr>
</table>

<br/>
<p>La présente fiche est établie pour la demande de prise en charge au titre du FIFPL.</p>

<br/>
<p>Date : {date_document}</p>
<table>
  <tr>
    <th>Signature du stagiaire</th>
    <th>Cachet de l'organisme</th>
  </tr>
  <tr>
    <td style="height:60px"></td>
    <td style="height:60px"></td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // RAPPORT D'ÉMARGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  rapport_emargement: `
<h1 style="text-align:center">FEUILLE D'ÉMARGEMENT</h1>
<br/>

<table>
  <tr><th>Formation</th><td><strong>{nom_formation}</strong></td></tr>
  <tr><th>Session</th><td>{titre_session}</td></tr>
  <tr><th>Dates</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Formateur</th><td>{nom_formateur}</td></tr>
  <tr><th>Durée</th><td>{duree_formation}</td></tr>
</table>

<br/>
<h2>Émargement des stagiaires</h2>
<table>
  <tr>
    <th style="width:5%">N°</th>
    <th style="width:25%">Nom et Prénom</th>
    <th style="width:15%">Entreprise</th>
    <th style="width:13%">Matin<br/><em>Arrivée</em></th>
    <th style="width:13%">Matin<br/><em>Signature</em></th>
    <th style="width:13%">Après-midi<br/><em>Arrivée</em></th>
    <th style="width:13%">Après-midi<br/><em>Signature</em></th>
  </tr>
  <tr>
    <td>1</td>
    <td>{nom_apprenant} {prenom_apprenant}</td>
    <td>{entreprise_apprenant}</td>
    <td style="height:40px"></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr><td>2</td><td></td><td></td><td style="height:40px"></td><td></td><td></td><td></td></tr>
  <tr><td>3</td><td></td><td></td><td style="height:40px"></td><td></td><td></td><td></td></tr>
  <tr><td>4</td><td></td><td></td><td style="height:40px"></td><td></td><td></td><td></td></tr>
  <tr><td>5</td><td></td><td></td><td style="height:40px"></td><td></td><td></td><td></td></tr>
  <tr><td>6</td><td></td><td></td><td style="height:40px"></td><td></td><td></td><td></td></tr>
  <tr><td>7</td><td></td><td></td><td style="height:40px"></td><td></td><td></td><td></td></tr>
  <tr><td>8</td><td></td><td></td><td style="height:40px"></td><td></td><td></td><td></td></tr>
</table>

<br/>
<h2>Signature du formateur</h2>
<table>
  <tr>
    <th>Nom : {nom_formateur}</th>
    <th>Signature :</th>
  </tr>
  <tr>
    <td style="height:60px"></td>
    <td style="height:60px"></td>
  </tr>
</table>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // ÉTIQUETTE D'ENVOI POSTAL
  // ─────────────────────────────────────────────────────────────────────────
  etiquette_envoi: `
<div style="width:100mm; height:60mm; border:1px dashed #ccc; padding:12mm 15mm; font-family:Arial,sans-serif; font-size:12pt; line-height:1.6;">

<p style="margin:0"><strong>{prenom} {nom}</strong></p>
<p style="margin:0">{adresse_apprenant}</p>
<p style="margin:0">{code_postal_apprenant} {ville_apprenant}</p>

</div>

<p style="font-size:8pt; color:#999; margin-top:8mm;">
Document généré le {date_document} — {nom_organisme}
</p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // LIVRET D'ACCUEIL
  // ─────────────────────────────────────────────────────────────────────────
  livret_accueil: `
<div style="font-family:Arial,sans-serif; max-width:800px; margin:0 auto; color:#333;">

<!-- Page de couverture -->
<div style="text-align:center; padding:60px 40px; border-bottom:3px solid #1a2b49;">
  <h1 style="font-size:28pt; color:#1a2b49; margin-bottom:10px;">LIVRET D'ACCUEIL</h1>
  <h2 style="font-size:16pt; color:#3869d4; margin-bottom:30px;">{nom_organisme}</h2>
  <p style="font-size:14pt; color:#555;">Formation : <strong>{nom_formation}</strong></p>
  <p style="font-size:11pt; color:#777; margin-top:20px;">Document remis au stagiaire avant le début de la formation</p>
</div>

<!-- Mot de bienvenue -->
<div style="padding:30px 0; border-bottom:1px solid #e5e7eb;">
  <h2 style="color:#1a2b49; font-size:14pt; border-left:4px solid #3869d4; padding-left:12px;">Bienvenue</h2>
  <p style="line-height:1.8; font-size:10pt;">
    Nous avons le plaisir de vous accueillir au sein de <strong>{nom_organisme}</strong> pour votre formation
    <strong>« {nom_formation} »</strong>. Ce livret d'accueil a pour objectif de vous fournir toutes les informations
    pratiques nécessaires au bon déroulement de votre parcours de formation.
  </p>
</div>

<!-- Présentation de l'organisme -->
<div style="padding:30px 0; border-bottom:1px solid #e5e7eb;">
  <h2 style="color:#1a2b49; font-size:14pt; border-left:4px solid #3869d4; padding-left:12px;">Présentation de l'organisme</h2>
  <table style="width:100%; font-size:10pt; line-height:1.8;">
    <tr><td style="width:200px; color:#666; padding:4px 0;">Raison sociale</td><td><strong>{nom_organisme}</strong></td></tr>
    <tr><td style="color:#666; padding:4px 0;">Adresse</td><td>{adresse_organisme}</td></tr>
    <tr><td style="color:#666; padding:4px 0;">Téléphone</td><td>{telephone_organisme}</td></tr>
    <tr><td style="color:#666; padding:4px 0;">Email</td><td>{email_organisme}</td></tr>
    <tr><td style="color:#666; padding:4px 0;">N° SIRET</td><td>{siret_organisme}</td></tr>
    <tr><td style="color:#666; padding:4px 0;">N° de déclaration d'activité</td><td>{nda_organisme}</td></tr>
  </table>
</div>

<!-- Informations sur la formation -->
<div style="padding:30px 0; border-bottom:1px solid #e5e7eb;">
  <h2 style="color:#1a2b49; font-size:14pt; border-left:4px solid #3869d4; padding-left:12px;">Votre formation</h2>
  <table style="width:100%; font-size:10pt; line-height:1.8;">
    <tr><td style="width:200px; color:#666; padding:4px 0;">Intitulé</td><td><strong>{nom_formation}</strong></td></tr>
    <tr><td style="color:#666; padding:4px 0;">Dates</td><td>{dates}</td></tr>
    <tr><td style="color:#666; padding:4px 0;">Durée</td><td>{duree_formation} heures</td></tr>
    <tr><td style="color:#666; padding:4px 0;">Lieu</td><td>{lieu}</td></tr>
    <tr><td style="color:#666; padding:4px 0;">Modalité</td><td>{modalite}</td></tr>
    <tr><td style="color:#666; padding:4px 0;">Formateur(s)</td><td>{nom_formateur}</td></tr>
  </table>

  <h3 style="color:#1a2b49; font-size:11pt; margin-top:20px;">Objectifs pédagogiques</h3>
  <p style="font-size:10pt; line-height:1.8;">{objectifs_formation}</p>

  <h3 style="color:#1a2b49; font-size:11pt; margin-top:15px;">Méthodes pédagogiques</h3>
  <p style="font-size:10pt; line-height:1.8;">{methodes_pedagogiques}</p>

  <h3 style="color:#1a2b49; font-size:11pt; margin-top:15px;">Modalités d'évaluation</h3>
  <p style="font-size:10pt; line-height:1.8;">{type_evaluation}</p>
</div>

<!-- Informations pratiques -->
<div style="padding:30px 0; border-bottom:1px solid #e5e7eb;">
  <h2 style="color:#1a2b49; font-size:14pt; border-left:4px solid #3869d4; padding-left:12px;">Informations pratiques</h2>

  <h3 style="color:#1a2b49; font-size:11pt; margin-top:15px;">Horaires</h3>
  <p style="font-size:10pt; line-height:1.8;">
    Les horaires de formation sont généralement de <strong>9h00 à 12h30</strong> et de <strong>13h30 à 17h00</strong>.
    Les horaires précis vous seront communiqués dans votre convocation.
  </p>

  <h3 style="color:#1a2b49; font-size:11pt; margin-top:15px;">Accès et transports</h3>
  <p style="font-size:10pt; line-height:1.8;">
    Lieu de formation : <strong>{lieu}</strong><br/>
    {{#if adresse_lieu}}{adresse_lieu}{{/if}}
  </p>

  <h3 style="color:#1a2b49; font-size:11pt; margin-top:15px;">Restauration</h3>
  <p style="font-size:10pt; line-height:1.8;">
    La pause déjeuner est libre. Des solutions de restauration sont disponibles à proximité du lieu de formation.
  </p>
</div>

<!-- Droits et obligations -->
<div style="padding:30px 0; border-bottom:1px solid #e5e7eb;">
  <h2 style="color:#1a2b49; font-size:14pt; border-left:4px solid #3869d4; padding-left:12px;">Droits et obligations du stagiaire</h2>

  <h3 style="color:#1a2b49; font-size:11pt; margin-top:15px;">Assiduité</h3>
  <p style="font-size:10pt; line-height:1.8;">
    La présence à l'ensemble des séquences de formation est obligatoire. Toute absence doit être signalée et justifiée.
    Une feuille d'émargement est signée par demi-journée.
  </p>

  <h3 style="color:#1a2b49; font-size:11pt; margin-top:15px;">Règlement intérieur</h3>
  <p style="font-size:10pt; line-height:1.8;">
    Le règlement intérieur de l'organisme de formation est applicable à tous les stagiaires.
    Il est consultable sur demande et affiché dans les locaux de formation.
    Les stagiaires s'engagent à le respecter pendant toute la durée de la formation.
  </p>

  <h3 style="color:#1a2b49; font-size:11pt; margin-top:15px;">Confidentialité et propriété intellectuelle</h3>
  <p style="font-size:10pt; line-height:1.8;">
    Les supports pédagogiques remis durant la formation sont la propriété intellectuelle de l'organisme.
    Toute reproduction ou diffusion sans autorisation est interdite.
  </p>
</div>

<!-- Accessibilité et handicap -->
<div style="padding:30px 0; border-bottom:1px solid #e5e7eb;">
  <h2 style="color:#1a2b49; font-size:14pt; border-left:4px solid #3869d4; padding-left:12px;">Accessibilité et situation de handicap</h2>
  <p style="font-size:10pt; line-height:1.8;">
    <strong>{nom_organisme}</strong> s'engage à rendre ses formations accessibles aux personnes en situation de handicap.
    Si vous êtes concerné(e), nous vous invitons à nous contacter en amont afin d'adapter les conditions d'accueil,
    les moyens pédagogiques et les modalités d'évaluation.
  </p>
  <p style="font-size:10pt; line-height:1.8;">
    <strong>Référent handicap :</strong> {email_organisme} — {telephone_organisme}
  </p>
</div>

<!-- Réclamations et médiation -->
<div style="padding:30px 0; border-bottom:1px solid #e5e7eb;">
  <h2 style="color:#1a2b49; font-size:14pt; border-left:4px solid #3869d4; padding-left:12px;">Réclamations et médiation</h2>
  <p style="font-size:10pt; line-height:1.8;">
    Toute réclamation peut être adressée par email à <strong>{email_organisme}</strong> ou par courrier à l'adresse de l'organisme.
    Nous nous engageons à accuser réception sous 48 heures et à apporter une réponse sous 15 jours ouvrés.
  </p>
  <p style="font-size:10pt; line-height:1.8;">
    En cas de litige non résolu, vous pouvez faire appel au médiateur de la consommation compétent.
  </p>
</div>

<!-- Contact -->
<div style="padding:30px 0; text-align:center; background:#f8fafc; border-radius:8px; margin-top:20px;">
  <h2 style="color:#1a2b49; font-size:14pt; margin-bottom:15px;">Vos contacts</h2>
  <p style="font-size:10pt; line-height:1.8; margin:0;">
    <strong>{nom_organisme}</strong><br/>
    {adresse_organisme}<br/>
    Tél. : {telephone_organisme}<br/>
    Email : {email_organisme}
  </p>
</div>

<p style="font-size:8pt; color:#999; text-align:center; margin-top:30px;">
  Document généré le {date_document} — {nom_organisme} — N° de déclaration d'activité : {nda_organisme}
</p>

</div>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // BILAN PÉDAGOGIQUE ET FINANCIER (BPF)
  // ─────────────────────────────────────────────────────────────────────────
  bpf: `
<h1 style="text-align:center">BILAN PÉDAGOGIQUE ET FINANCIER</h1>
<p style="text-align:center"><em>Article L.6352-11 du Code du travail</em></p>
<br/>

<h2>Identification de l'organisme</h2>
<table>
  <tr><th>Raison sociale</th><td>SO'SAFE</td></tr>
  <tr><th>SIRET</th><td>{siret_organisme}</td></tr>
  <tr><th>N° de déclaration d'activité</th><td>{nda_organisme}</td></tr>
  <tr><th>Adresse</th><td>{adresse_organisme}</td></tr>
  <tr><th>Responsable</th><td>{representant_legal}</td></tr>
</table>

<h2>A — Bilan financier</h2>
<table>
  <tr><th>Produit des prestations de formation</th><td>__________ €</td></tr>
  <tr><th>Dont entreprises</th><td>__________ €</td></tr>
  <tr><th>Dont particuliers</th><td>__________ €</td></tr>
  <tr><th>Dont OPCO / financeurs publics</th><td>__________ €</td></tr>
  <tr><th>Charges de fonctionnement</th><td>__________ €</td></tr>
  <tr><th>Charges de personnel</th><td>__________ €</td></tr>
  <tr><th>Sous-traitance</th><td>__________ €</td></tr>
</table>

<h2>B — Bilan pédagogique</h2>
<table>
  <tr><th>Nombre total de stagiaires formés</th><td>__________</td></tr>
  <tr><th>Nombre d'heures de formation dispensées</th><td>__________ h</td></tr>
  <tr><th>Nombre de sessions réalisées</th><td>__________</td></tr>
  <tr><th>Nombre de formateurs mobilisés</th><td>__________</td></tr>
</table>

<h2>C — Répartition par type de formation</h2>
<table>
  <tr><th>Type</th><th>Nb sessions</th><th>Nb stagiaires</th><th>Nb heures</th></tr>
  <tr><td>Formations santé / sécurité</td><td></td><td></td><td></td></tr>
  <tr><td>Formations réglementaires</td><td></td><td></td><td></td></tr>
  <tr><td>Formations continues</td><td></td><td></td><td></td></tr>
  <tr><td>DPC</td><td></td><td></td><td></td></tr>
</table>

<h2>D — Indicateurs qualité</h2>
<table>
  <tr><th>Taux de satisfaction global</th><td>__________ %</td></tr>
  <tr><th>Taux de réussite</th><td>__________ %</td></tr>
  <tr><th>Taux de recommandation</th><td>__________ %</td></tr>
  <tr><th>Taux d'abandon</th><td>__________ %</td></tr>
</table>

<br/>
<p>Le présent bilan est établi conformément à l'article L.6352-11 du Code du travail.</p>
<p>Fait le {date_document}</p>
<br/>
<p><strong>SO'SAFE</strong> — Signature du responsable :</p>
<div style="height:60px; border:1px dashed #ccc; width:200px; margin-top:8px"></div>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // BADGE DE RÉUSSITE
  // ─────────────────────────────────────────────────────────────────────────
  badge: `
<div style="font-family:Arial,sans-serif; max-width:400px; margin:0 auto; text-align:center; border:3px solid #1a2b49; border-radius:20px; padding:40px 30px; background:linear-gradient(135deg, #f8fafc 0%, #e8f0fe 100%);">

  <div style="width:80px; height:80px; margin:0 auto 15px; border-radius:50%; background:#1a2b49; display:flex; align-items:center; justify-content:center;">
    <span style="font-size:36px; color:white;">✓</span>
  </div>

  <h1 style="font-size:14pt; color:#1a2b49; margin:0 0 5px; text-transform:uppercase; letter-spacing:2px;">Badge de réussite</h1>

  <div style="width:60px; height:2px; background:#3869d4; margin:10px auto 20px;"></div>

  <p style="font-size:12pt; color:#555; margin:0 0 5px;">Décerné à</p>
  <p style="font-size:16pt; color:#1a2b49; font-weight:bold; margin:0 0 20px;">{nom_apprenant} {prenom_apprenant}</p>

  <p style="font-size:10pt; color:#555; margin:0 0 5px;">Pour avoir réussi la formation</p>
  <p style="font-size:13pt; color:#3869d4; font-weight:bold; margin:0 0 20px;">« {nom_formation} »</p>

  <table style="width:100%; font-size:9pt; color:#666; margin:15px 0;">
    <tr><td>Durée : {duree_formation}</td><td>Du {date_debut_session} au {date_fin_session}</td></tr>
    <tr><td>Formateur : {nom_formateur}</td><td>Lieu : {lieu_session}</td></tr>
  </table>

  <div style="margin-top:20px; padding-top:15px; border-top:1px solid #d1d5db;">
    <p style="font-size:9pt; color:#999; margin:0;">Délivré le {date_delivrance}</p>
    <p style="font-size:10pt; color:#1a2b49; font-weight:bold; margin:5px 0 0;">SO'SAFE</p>
    <p style="font-size:8pt; color:#999; margin:0;">Organisme de formation — N° DA : {nda_organisme}</p>
  </div>

</div>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // QUESTIONNAIRE DE SATISFACTION (à chaud)
  // ─────────────────────────────────────────────────────────────────────────
  questionnaire_satisfaction: `
<h1 style="text-align:center">QUESTIONNAIRE DE SATISFACTION</h1>
<p style="text-align:center"><em>Évaluation à chaud — À compléter en fin de formation</em></p>
<br/>

<table>
  <tr><th>Formation</th><td><strong>{nom_formation}</strong></td></tr>
  <tr><th>Dates</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Formateur</th><td>{nom_formateur}</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Stagiaire</th><td>{nom_apprenant} {prenom_apprenant}</td></tr>
</table>

<br/>
<p><em>Merci d'évaluer chaque critère sur une échelle de 1 (pas du tout satisfait) à 5 (très satisfait).</em></p>

<h2>1. Organisation générale</h2>
<table>
  <tr><th style="width:60%">Critère</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
  <tr><td>Accueil et informations préalables</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>Respect du programme annoncé</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>Qualité des locaux / conditions matérielles</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>Rythme et durée de la formation</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
</table>

<h2>2. Contenu pédagogique</h2>
<table>
  <tr><th style="width:60%">Critère</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
  <tr><td>Clarté des objectifs pédagogiques</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>Qualité des supports pédagogiques</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>Équilibre entre théorie et pratique</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>Pertinence des exercices / mises en situation</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>Applicabilité dans votre pratique professionnelle</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
</table>

<h2>3. Le formateur</h2>
<table>
  <tr><th style="width:60%">Critère</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
  <tr><td>Maîtrise du sujet</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>Qualité d'animation et pédagogie</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>Disponibilité et écoute</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>Capacité à répondre aux questions</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
</table>

<h2>4. Satisfaction globale</h2>
<table>
  <tr><th style="width:60%">Critère</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
  <tr><td>Satisfaction globale sur cette formation</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>Recommanderiez-vous cette formation ?</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
</table>

<h2>5. Commentaires libres</h2>
<p><strong>Ce que vous avez le plus apprécié :</strong></p>
<div style="border:1px solid #ccc; min-height:60px; padding:8px; margin-bottom:15px;"></div>

<p><strong>Ce qui pourrait être amélioré :</strong></p>
<div style="border:1px solid #ccc; min-height:60px; padding:8px; margin-bottom:15px;"></div>

<p><strong>Autres remarques :</strong></p>
<div style="border:1px solid #ccc; min-height:60px; padding:8px;"></div>

<br/>
<p>Date : {date_document} — Signature (optionnelle) :</p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // ÉVALUATION PRÉ-FORMATION (positionnement)
  // ─────────────────────────────────────────────────────────────────────────
  evaluation_pre_formation: `
<h1 style="text-align:center">ÉVALUATION DE POSITIONNEMENT — PRÉ-FORMATION</h1>
<br/>

<table>
  <tr><th>Formation</th><td><strong>{nom_formation}</strong></td></tr>
  <tr><th>Dates prévues</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Stagiaire</th><td>{nom_apprenant} {prenom_apprenant}</td></tr>
  <tr><th>Entreprise</th><td>{entreprise_apprenant}</td></tr>
</table>

<br/>
<p><em>Ce questionnaire permet d'évaluer votre niveau initial et d'adapter le contenu de la formation à vos besoins. Merci de répondre sincèrement.</em></p>

<h2>1. Votre profil</h2>
<p><strong>Quelle est votre fonction actuelle ?</strong></p>
<div style="border:1px solid #ccc; min-height:30px; padding:8px; margin-bottom:10px;"></div>

<p><strong>Depuis combien de temps exercez-vous cette fonction ?</strong></p>
<p>☐ Moins d'un an &nbsp; ☐ 1 à 3 ans &nbsp; ☐ 3 à 5 ans &nbsp; ☐ Plus de 5 ans</p>

<p><strong>Avez-vous déjà suivi une formation sur ce sujet ?</strong></p>
<p>☐ Oui &nbsp; ☐ Non</p>
<p>Si oui, laquelle et quand ?</p>
<div style="border:1px solid #ccc; min-height:30px; padding:8px; margin-bottom:10px;"></div>

<h2>2. Vos connaissances actuelles</h2>
<p><em>Évaluez votre niveau sur chaque thème : 1 = Novice, 2 = Notions de base, 3 = Intermédiaire, 4 = Avancé</em></p>
<table>
  <tr><th style="width:60%">Thème</th><th>1</th><th>2</th><th>3</th><th>4</th></tr>
  <tr><td>[Thème 1 de la formation]</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>[Thème 2 de la formation]</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>[Thème 3 de la formation]</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
  <tr><td>[Thème 4 de la formation]</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
</table>

<h2>3. Vos attentes</h2>
<p><strong>Quels sont vos principaux objectifs pour cette formation ?</strong></p>
<div style="border:1px solid #ccc; min-height:60px; padding:8px; margin-bottom:10px;"></div>

<p><strong>Y a-t-il des points spécifiques que vous souhaitez aborder ?</strong></p>
<div style="border:1px solid #ccc; min-height:60px; padding:8px;"></div>

<br/>
<p>Date : {date_document}</p>
<p>Signature : ________________________</p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // ÉVALUATION DES ACQUIS (post-formation)
  // ─────────────────────────────────────────────────────────────────────────
  evaluation_acquis: `
<h1 style="text-align:center">ÉVALUATION DES ACQUIS — POST-FORMATION</h1>
<br/>

<table>
  <tr><th>Formation</th><td><strong>{nom_formation}</strong></td></tr>
  <tr><th>Dates</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Formateur</th><td>{nom_formateur}</td></tr>
  <tr><th>Stagiaire</th><td>{nom_apprenant} {prenom_apprenant}</td></tr>
</table>

<br/>
<p><em>Cette évaluation permet de mesurer les connaissances et compétences acquises à l'issue de la formation.</em></p>

<h2>Partie 1 — QCM (cochez la ou les bonnes réponses)</h2>

<p><strong>Question 1 :</strong> [Intitulé de la question]</p>
<p>☐ Réponse A &nbsp; ☐ Réponse B &nbsp; ☐ Réponse C &nbsp; ☐ Réponse D</p>

<p><strong>Question 2 :</strong> [Intitulé de la question]</p>
<p>☐ Réponse A &nbsp; ☐ Réponse B &nbsp; ☐ Réponse C &nbsp; ☐ Réponse D</p>

<p><strong>Question 3 :</strong> [Intitulé de la question]</p>
<p>☐ Réponse A &nbsp; ☐ Réponse B &nbsp; ☐ Réponse C &nbsp; ☐ Réponse D</p>

<p><strong>Question 4 :</strong> [Intitulé de la question]</p>
<p>☐ Réponse A &nbsp; ☐ Réponse B &nbsp; ☐ Réponse C &nbsp; ☐ Réponse D</p>

<p><strong>Question 5 :</strong> [Intitulé de la question]</p>
<p>☐ Réponse A &nbsp; ☐ Réponse B &nbsp; ☐ Réponse C &nbsp; ☐ Réponse D</p>

<h2>Partie 2 — Questions ouvertes</h2>

<p><strong>Question 6 :</strong> [Question ouverte]</p>
<div style="border:1px solid #ccc; min-height:60px; padding:8px; margin-bottom:15px;"></div>

<p><strong>Question 7 :</strong> [Question ouverte]</p>
<div style="border:1px solid #ccc; min-height:60px; padding:8px; margin-bottom:15px;"></div>

<h2>Partie 3 — Mise en situation</h2>

<p><strong>Décrivez comment vous appliqueriez les connaissances acquises dans votre contexte professionnel :</strong></p>
<div style="border:1px solid #ccc; min-height:80px; padding:8px; margin-bottom:15px;"></div>

<br/>
<h2>Résultat</h2>
<table>
  <tr><th>Score QCM</th><td>_____ / 5</td></tr>
  <tr><th>Appréciation globale</th><td>☐ Acquis &nbsp; ☐ En cours d'acquisition &nbsp; ☐ Non acquis</td></tr>
</table>

<br/>
<table>
  <tr>
    <th>Le formateur</th>
    <th>Le stagiaire</th>
  </tr>
  <tr>
    <td style="height:60px">{nom_formateur}<br/>Signature :</td>
    <td style="height:60px">{nom_apprenant} {prenom_apprenant}<br/>Signature :</td>
  </tr>
</table>
<p style="text-align:right; font-size:9pt; color:#999;">Date : {date_document}</p>
`,

  // ─────────────────────────────────────────────────────────────────────────
  // PROTOCOLE INDIVIDUEL DE FORMATION (PIF)
  // ─────────────────────────────────────────────────────────────────────────
  protocole_individuel: `
<h1 style="text-align:center">PROTOCOLE INDIVIDUEL DE FORMATION</h1>
<p style="text-align:center"><em>Document Qualiopi — Indicateur 8</em></p>
<br/>

<h2>Organisme de formation</h2>
<p><strong>SO'SAFE</strong><br/>
{adresse_organisme}<br/>
SIRET : {siret_organisme} — N° DA : {nda_organisme}</p>

<h2>Bénéficiaire</h2>
<table>
  <tr><th>Nom et prénom</th><td>{nom_apprenant} {prenom_apprenant}</td></tr>
  <tr><th>Entreprise</th><td>{entreprise_apprenant}</td></tr>
  <tr><th>Fonction</th><td>[Fonction du stagiaire]</td></tr>
</table>

<h2>Formation concernée</h2>
<table>
  <tr><th>Intitulé</th><td><strong>{nom_formation}</strong></td></tr>
  <tr><th>Objectifs</th><td>{objectifs_formation}</td></tr>
  <tr><th>Prérequis</th><td>{prerequis_formation}</td></tr>
  <tr><th>Durée totale</th><td>{duree_formation}</td></tr>
  <tr><th>Dates</th><td>Du {date_debut_session} au {date_fin_session}</td></tr>
  <tr><th>Lieu</th><td>{lieu_session}</td></tr>
  <tr><th>Modalité</th><td>{modalite_formation}</td></tr>
  <tr><th>Formateur référent</th><td>{nom_formateur}</td></tr>
</table>

<h2>Parcours individualisé</h2>
<p><strong>Résultat du positionnement initial :</strong></p>
<div style="border:1px solid #ccc; min-height:40px; padding:8px; margin-bottom:10px;"></div>

<p><strong>Objectifs personnalisés :</strong></p>
<div style="border:1px solid #ccc; min-height:40px; padding:8px; margin-bottom:10px;"></div>

<p><strong>Adaptations prévues :</strong></p>
<ul>
  <li>☐ Adaptation du rythme</li>
  <li>☐ Contenus complémentaires</li>
  <li>☐ Accompagnement renforcé</li>
  <li>☐ Accessibilité handicap : _______________</li>
  <li>☐ Autre : _______________</li>
</ul>

<h2>Modalités d'évaluation</h2>
<p>☐ Évaluation pré-formation (positionnement)<br/>
☐ Évaluation continue (exercices pratiques)<br/>
☐ Évaluation post-formation (QCM / mise en situation)<br/>
☐ Évaluation de satisfaction</p>

<h2>Engagement réciproque</h2>
<p>Le bénéficiaire s'engage à participer activement à l'ensemble des séquences de formation et à réaliser les travaux demandés.</p>
<p>SO'SAFE s'engage à mettre en œuvre les moyens pédagogiques et techniques nécessaires à la bonne réalisation de la formation, et à adapter le parcours si nécessaire.</p>

<br/>
<p>Fait en deux exemplaires, le {date_document}</p>
<br/>
<table>
  <tr>
    <th>Le responsable — SO'SAFE</th>
    <th>Le bénéficiaire</th>
  </tr>
  <tr>
    <td style="height:60px">Signature :</td>
    <td style="height:60px">Signature :<br/><em>(Lu et approuvé)</em></td>
  </tr>
</table>
`,

};

/**
 * Retourne le contenu par défaut pour un type de document donné.
 * Si aucun modèle n'existe pour ce type, retourne une chaîne vide.
 */
export function getDefaultTemplate(type: string): string {
  return DOCUMENT_DEFAULTS[type] || "";
}
