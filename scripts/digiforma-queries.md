# Requêtes GraphQL Digiforma - Export complet

Lance chaque requête dans l'explorateur GraphQL Digiforma et sauvegarde le résultat JSON
dans `scripts/digiforma-data/` en remplaçant les fichiers existants.

---

## 1. Programmes (→ programs.json)

```graphql
query { programs(pagination: {page: 0, size: 200}) { id name subtitle code description trainingType language onSale cpf cpfCode rncpCode durationInHours durationInDays satisfactionRate handicappedAccessibility createdAt updatedAt generatedProgramUrl publicRegistrationUrl image { url } category { id name } tags { id name } capacity { min max } goals prerequisites targets steps { name description position durationInHours } assessments { name description position } pedagogicalResources { name description position } documents { id filename type url } room { id name } costsInter { cost costType label } costsIntra { cost costType label } } }
```

---

## 2. Factures (→ invoices.json)

```graphql
query { invoices(pagination: {page: 0, size: 500}) { id number numberStr prefix date reference orderForm freeText locked paymentLimitDays isPaymentLimitEndMonth insertedAt updatedAt fileUrl roadAddress city cityCode countryCode items { description quantity vat vatType } customer { id } trainingSession { id name } } }
```

---

## 3. Devis (→ quotations.json)

```graphql
query { quotations(pagination: {page: 0, size: 500}) { id items { description quantity } customer { id } trainingSession { id name } } }
```

Si timeout, paginer par 50 :
```
page: 0, size: 50
page: 1, size: 50
... jusqu'a page: 9
```

---

## 4. Sessions (→ training-sessions.json)

```graphql
query { trainingSessions(pagination: {page: 0, size: 500}) { id name code startDate endDate inter remote hasELearning pipelineState extranetUrl place placeName program { id name } room { id name city roadAddress capacity } instructors { id firstname lastname email } documents { id filename type url } trainingSessionSlots { date startTime endTime slot bypassConflicts trainingSessionInstructors { instructor { id email firstname lastname } } } trainees { id firstname lastname email status company { id name } } } }
```

---

## 5. Stagiaires (→ trainees.json puis trainees-all.json)

```graphql
query { trainees(pagination: {page: 0, size: 1000}) { id civility firstname lastname email phone position profession status city roadAddress cityCode countryCode company { id name siret } trainingSessions { id name startDate endDate } } }
```

Si > 1000, paginer : page: 1, page: 2, etc. puis fusionner dans trainees-all.json

---

## 6. Entreprises (→ companies.json)

```graphql
query { companies(pagination: {page: 0, size: 500}) { id name siret email phone roadAddress city cityCode country countryCode vatNumber apeCode legalForm capitalAmount website billingEmail billingRoadAddress billingCity billingCityCode billingCountryCode } }
```

---

## 7. Formateurs (→ instructors.json)

```graphql
query { instructors(pagination: {page: 0, size: 100}) { id firstname lastname email phone city roadAddress cityCode countryCode specialty biography avatarUrl dailyRate hourlyRate } }
```

---

## 8. Salles / Lieux (→ rooms.json)

Deja complet, pas besoin de re-exporter.

---

## 9. Infos academie (→ misc.json)

```graphql
query { academy { id contactEmail vatExempted academyExtranetAvatar name address city phone siret website logo { url } } fundingAgencies(pagination: {page: 0, size: 100}) { id name } managers(pagination: {page: 0, size: 50}) { id firstname lastname email } programCategories { id name } }
```

---

## 10. Modules e-learning (→ modules.json)

```graphql
query { modules(pagination: {page: 0, size: 50}) { id name description sequenceType visible forum showScore visibilityMode image { url } documents { id filename type url } embeds { id url name } scorms { id name url } sequence { id name description resourceType resourceId durationMin } } }
```

Pour récupérer le contenu HTML d'un module spécifique :
```graphql
query { module(id: "MODULE_ID") { htmlDocs { id html css } } }
```

Types de `ModuleSequenceItem.resourceType` : `html_doc`, `evaluation`

---

## Champs NON disponibles dans l'API Digiforma

- Factures : `totalHT`, `totalTTC`, `totalVAT`, `status`, `type`, `paidAmount`, `remainingAmount` → n'existent pas
- Items facture/devis : `unitAmount`, `totalAmount` → n'existent pas. `vatRate` → utiliser `vat` + `vatType`
- Customer : `name`, `siret`, `roadAddress`, `city`, `cityCode`, `countryCode` → seul `id` fonctionne
- Les montants sont calcules dans le script de sync via la table `PROGRAM_PRICES` + nom de session
