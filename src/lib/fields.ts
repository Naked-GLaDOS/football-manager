import type { TKey } from './i18n';
import type { Kind } from './api';

export type FieldType = 'text' | 'date' | 'phone' | 'email' | 'role';

export interface FieldDef {
  key: string; // matches Person property + i18n key
  type: FieldType;
}

// Personal fields shared by players and staff, in display order.
const PERSON_FIELDS: FieldDef[] = [
  { key: 'firstName', type: 'text' },
  { key: 'lastName', type: 'text' },
  { key: 'role', type: 'role' },
  { key: 'birthDate', type: 'date' },
  { key: 'registrationNumber', type: 'text' },
  { key: 'preparationStartDate', type: 'date' },
  { key: 'birthTown', type: 'text' },
  { key: 'homeAddress', type: 'text' },
  { key: 'residenceTown', type: 'text' },
  { key: 'phone', type: 'phone' },
  { key: 'email', type: 'email' },
];

export function fieldsFor(_kind: Kind): FieldDef[] {
  // Players and staff share the same personal fields; the `role` field's option
  // set differs (handled by the form via kind).
  return PERSON_FIELDS;
}

// Labels used in the compact table view (first few columns).
export const SUMMARY_KEYS = ['lastName', 'firstName', 'role'] as (TKey & string)[];
