export type Lang = 'it' | 'en';

// Every user-facing string lives here. DB values stay English (enum keys);
// only the display labels are localised.
const dict = {
  it: {
    appName: 'Football Manager',
    email: 'Email',
    password: 'Password',
    signIn: 'Accedi',
    signOut: 'Esci',
    usePasskey: 'Accedi con passkey',
    invalidLogin: 'Email o password non validi',
    loading: '…',

    team: 'Squadra',
    season: 'Stagione',
    language: 'Lingua',
    seasonLocked: 'Stagione conclusa — sola lettura',
    noTeam: 'Nessuna squadra assegnata. Contatta l’amministratore.',

    players: 'Giocatori',
    staff: 'Staff',
    parents: 'Genitori',
    cms: 'Gestione',

    add: 'Aggiungi',
    edit: 'Modifica',
    save: 'Salva',
    cancel: 'Annulla',
    delete: 'Elimina',
    create: 'Crea',
    confirmDelete: 'Confermi l’eliminazione?',
    unknown: 'Sconosciuto',
    empty: 'Nessun dato',
    search: 'Cerca',

    // person fields
    firstName: 'Nome',
    lastName: 'Cognome',
    role: 'Ruolo',
    birthDate: 'Data di nascita',
    registrationNumber: 'Matricola',
    preparationStartDate: 'Data inizio preparazione',
    birthTown: 'Comune di nascita',
    homeAddress: 'Indirizzo (via e civico)',
    residenceTown: 'Comune di residenza',
    phone: 'Telefono',

    // player roles
    ATTACKER: 'Attaccante',
    MIDFIELDER: 'Centrocampista',
    DEFENDER: 'Difensore',
    GOALKEEPER: 'Portiere',
    // staff roles
    DIRECTOR: 'Dirigente',
    COACH: 'Allenatore',
    ATHLETIC_TRAINER: 'Preparatore Atletico',
    GOALKEEPER_TRAINER: 'Preparatore dei portieri',

    // genitori
    father: 'Padre',
    mother: 'Madre',
    parentName: 'Nome',
    parentPhone: 'Telefono',
    share: 'Condividi',
    shareContact: 'Condividi contatto',
    noParents: 'Nessun dato genitori',

    // cms
    manageTeams: 'Squadre',
    manageUsers: 'Utenti',
    teamName: 'Nome squadra',
    newTeam: 'Nuova squadra',
    newUser: 'Nuovo utente',
    initialPassword: 'Password iniziale',
    assignedTeams: 'Squadre assegnate',
    changePassword: 'Cambia password (opzionale)',
  },
  en: {
    appName: 'Football Manager',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signOut: 'Sign out',
    usePasskey: 'Sign in with passkey',
    invalidLogin: 'Invalid email or password',
    loading: '…',

    team: 'Team',
    season: 'Season',
    language: 'Language',
    seasonLocked: 'Season ended — read only',
    noTeam: 'No team assigned. Contact your administrator.',

    players: 'Players',
    staff: 'Staff',
    parents: 'Parents',
    cms: 'Admin',

    add: 'Add',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    create: 'Create',
    confirmDelete: 'Delete this record?',
    unknown: 'Unknown',
    empty: 'No data',
    search: 'Search',

    firstName: 'Name',
    lastName: 'Surname',
    role: 'Role',
    birthDate: 'Birth date',
    registrationNumber: 'Registration no.',
    preparationStartDate: 'Preparation start date',
    birthTown: 'Town of birth',
    homeAddress: 'Home address (street & no.)',
    residenceTown: 'Town of residence',
    phone: 'Phone',

    ATTACKER: 'Attacker',
    MIDFIELDER: 'Midfielder',
    DEFENDER: 'Defender',
    GOALKEEPER: 'Goalkeeper',
    DIRECTOR: 'Director',
    COACH: 'Coach',
    ATHLETIC_TRAINER: 'Athletic Trainer',
    GOALKEEPER_TRAINER: 'Goalkeeper Trainer',

    father: 'Father',
    mother: 'Mother',
    parentName: 'Name',
    parentPhone: 'Phone',
    share: 'Share',
    shareContact: 'Share contact',
    noParents: 'No parent data',

    manageTeams: 'Teams',
    manageUsers: 'Users',
    teamName: 'Team name',
    newTeam: 'New team',
    newUser: 'New user',
    initialPassword: 'Initial password',
    assignedTeams: 'Assigned teams',
    changePassword: 'Change password (optional)',
  },
} as const;

export type TKey = keyof (typeof dict)['en'];

export function translator(lang: Lang) {
  return (key: TKey): string => dict[lang][key] ?? dict.en[key] ?? key;
}

export const PLAYER_ROLES = ['ATTACKER', 'MIDFIELDER', 'DEFENDER', 'GOALKEEPER'] as const;
export const STAFF_ROLES = ['DIRECTOR', 'COACH', 'ATHLETIC_TRAINER', 'GOALKEEPER_TRAINER'] as const;
