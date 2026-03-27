# Requêtes GraphQL Digiforma - Export complet

Lance chaque requête dans l'explorateur GraphQL Digiforma et sauvegarde le résultat JSON
dans `scripts/digiforma-data/` en remplaçant les fichiers existants.

---

## 1. Programmes avec PRIX (programs-full.json)

```graphql
query getPrograms {
  programs(pagination: {page: 0, size: 200}) {
    id
    name
    subtitle
    code
    description
    trainingType
    language
    onSale
    cpf
    cpfCode
    rncpCode
    durationInHours
    durationInDays
    satisfactionRate
    handicappedAccessibility
    createdAt
    updatedAt
    generatedProgramUrl
    publicRegistrationUrl
    image { url }
    category { id name }
    tags { id name }
    capacity { min max }
    goals
    prerequisites
    targets
    steps { name description position durationInHours }
    assessments { name description position }
    pedagogicalResources { name description position }
    documents { id filename type url }
    room { id name }
    costsInter { cost costType label }
    costsIntra { cost costType label }
  }
}
```

---

## 2. Factures avec MONTANTS (invoices-full.json)

```graphql
query getInvoices {
  invoices(pagination: {page: 0, size: 500}) {
    id
    number
    numberStr
    prefix
    date
    reference
    orderForm
    freeText
    locked
    paymentLimitDays
    isPaymentLimitEndMonth
    insertedAt
    updatedAt
    fileUrl
    roadAddress
    city
    cityCode
    countryCode
    totalHT
    totalTTC
    totalVAT
    status
    type
    paidAmount
    remainingAmount
    lines {
      description
      quantity
      unitAmount
      totalAmount
      vatRate
    }
    customer {
      id
      name
      siret
      roadAddress
      city
      cityCode
      countryCode
    }
    trainingSession {
      id
      name
    }
  }
}
```

---

## 3. Devis avec MONTANTS (quotations-full.json)

```graphql
query getQuotations {
  quotations(pagination: {page: 0, size: 500}) {
    id
    number
    numberStr
    prefix
    date
    acceptedAt
    insertedAt
    updatedAt
    totalHT
    totalTTC
    totalVAT
    status
    fileUrl
    lines {
      description
      quantity
      unitAmount
      totalAmount
      vatRate
    }
    customer {
      id
      name
    }
    trainingSession {
      id
      name
    }
  }
}
```

---

## 4. Sessions avec inscriptions complètes (sessions-full.json)

```graphql
query getTrainingSessions {
  trainingSessions(pagination: {page: 0, size: 500}) {
    id
    name
    code
    startDate
    endDate
    inter
    remote
    hasELearning
    pipelineState
    extranetUrl
    place
    placeName
    program { id name }
    room { id name city roadAddress capacity }
    instructors { id firstname lastname email }
    documents { id filename type url }
    trainingSessionSlots {
      date
      startTime
      endTime
      slot
      bypassConflicts
      trainingSessionInstructors {
        instructor { id email firstname lastname }
      }
    }
    trainees {
      id
      firstname
      lastname
      email
      status
      company { id name }
    }
    totalHT
    totalTTC
  }
}
```

---

## 5. Stagiaires complets (trainees-full.json)

```graphql
query getTrainees {
  trainees(pagination: {page: 0, size: 1000}) {
    id
    civility
    firstname
    lastname
    email
    phone
    position
    profession
    status
    city
    roadAddress
    cityCode
    countryCode
    company { id name siret }
    trainingSessions { id name startDate endDate }
  }
}
```

---

## 6. Entreprises complètes (companies-full.json)

```graphql
query getCompanies {
  companies(pagination: {page: 0, size: 500}) {
    id
    name
    siret
    email
    phone
    roadAddress
    city
    cityCode
    country
    countryCode
    vatNumber
    apeCode
    legalForm
    capitalAmount
    website
    billingEmail
    billingRoadAddress
    billingCity
    billingCityCode
    billingCountryCode
  }
}
```

---

## 7. Formateurs complets (instructors-full.json)

```graphql
query getInstructors {
  instructors(pagination: {page: 0, size: 100}) {
    id
    firstname
    lastname
    email
    phone
    city
    roadAddress
    cityCode
    countryCode
    specialty
    biography
    avatarUrl
    dailyRate
    hourlyRate
  }
}
```

---

## 8. Salles / Lieux (rooms-full.json)

Déjà assez complet, pas besoin de re-exporter.

---

## 9. Infos académie (misc-full.json)

```graphql
query getMisc {
  academy {
    id
    contactEmail
    vatExempted
    academyExtranetAvatar
    name
    address
    city
    phone
    siret
    website
    logo { url }
  }
  fundingAgencies(pagination: {page: 0, size: 100}) {
    id
    name
  }
  managers(pagination: {page: 0, size: 50}) {
    id
    firstname
    lastname
    email
  }
  programCategories {
    id
    name
  }
}
```

---

## Notes importantes

- Si une requête renvoie une erreur sur un champ (ex: `costsInter` n'existe pas),
  retire ce champ et relance. Note les champs qui échouent.
- Pour les stagiaires, si > 1000, il faudra paginer (page: 1, page: 2, etc.)
- Sauvegarde chaque résultat dans `scripts/digiforma-data/` avec le suffixe `-full`
- Une fois tous les fichiers récupérés, on mettra à jour le script de sync
