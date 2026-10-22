import { describe, it, expect } from 'vitest';
import { assignedFirst, assignmentFor } from '../../src/core/site-profile';
import type { Profile } from '../../src/core/types';

const profile = (id: string, label: string): Profile => ({
  id, label,
  lastName: '', firstName: '', lastNameKana: '', firstNameKana: '',
  lastNameRomaji: '', firstNameRomaji: '', gender: '', birthday: '',
  school: '', department: '', companyName: '', companyDepartment: '',
  email: '', tel: '',
} as unknown as Profile);

const profiles = [profile('p1', '自宅'), profile('p2', '会社')];

describe('assignedFirst (PBI-141)', () => {
  it('moves the assigned profile to the front', () => {
    expect(assignedFirst(profiles, 'p2').map((p) => p.id)).toEqual(['p2', 'p1']);
    expect(assignedFirst(profiles, 'p1').map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('keeps the stored order without an assignment or a gone profile', () => {
    expect(assignedFirst(profiles, null)).toEqual(profiles);
    expect(assignedFirst(profiles, 'gone')).toEqual(profiles);
  });
});

describe('assignmentFor (PBI-141)', () => {
  it('reads the host assignment and fails safe', () => {
    const assignments = { 'e.com': 'p2' };
    expect(assignmentFor('https://e.com/form', assignments, ['p1', 'p2'])).toBe('p2');
    expect(assignmentFor('https://other.com', assignments, ['p1', 'p2'])).toBeNull();
    expect(assignmentFor('https://e.com/form', assignments, ['p1'])).toBeNull();
    expect(assignmentFor('not a url', assignments, ['p1', 'p2'])).toBeNull();
  });
});
