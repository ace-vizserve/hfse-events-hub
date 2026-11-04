import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankEvent, csvCell, due, safeNext, status } from '../lib/shared.ts';
import { parseEvent, parseRegistration } from '../lib/validate.ts';

test('safeNext keeps same-site paths and refuses everything else', () => {
  assert.equal(safeNext('/registrations?event=1'), '/registrations?event=1');
  for (const bad of [null, undefined, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/\t/evil.example', '/\\/evil.example']) {
    assert.equal(safeNext(bad), '/events');
  }
});

const form = {
  parentName: 'Tan, Mei',
  phone: '+65 9123 4567',
  studentName: 'Tan, Wei',
  level: 'Primary One',
  classSection: 'Trust',
  adults: 2,
  sessions: [],
  questions: '',
  consent: true,
};

test('accepts a complete registration', () => {
  assert.ok('value' in parseRegistration(form, []));
});

test('requires PDPA consent', () => {
  assert.ok('error' in parseRegistration({ ...form, consent: false }, []));
  assert.ok('error' in parseRegistration({ ...form, consent: 'true' }, []));
});

test('requires Last Name, First Name format', () => {
  assert.ok('error' in parseRegistration({ ...form, parentName: 'Tan Mei' }, []));
});

test('limits adults to 1-20 whole numbers', () => {
  for (const adults of [0, 21, 1.5, '2']) assert.ok('error' in parseRegistration({ ...form, adults }, []));
});

test('sessions must belong to the event, and one is required when the event has any', () => {
  assert.ok('error' in parseRegistration({ ...form, sessions: ['Other'] }, ['AM']));
  assert.ok('error' in parseRegistration({ ...form, sessions: [] }, ['AM']));
  assert.ok('value' in parseRegistration({ ...form, sessions: ['AM'] }, ['AM']));
});

test('survives malformed bodies', () => {
  for (const body of [null, 'text', [], 5]) assert.ok('error' in parseRegistration(body, []));
  for (const body of [null, 'text', [], 5]) assert.ok('error' in parseEvent(body));
});

const event = () => ({ ...blankEvent(), title: 'Fair' });

test('accepts a new event', () => {
  assert.ok('value' in parseEvent(event()));
});

test('rejects an end date without or before the start date', () => {
  assert.ok('error' in parseEvent({ ...event(), end: '2027-01-01' }));
  assert.ok('error' in parseEvent({ ...event(), start: '2027-01-02', end: '2027-01-01' }));
});

test('rejects impossible dates that would fail in the database', () => {
  assert.ok('error' in parseEvent({ ...event(), start: '2027-02-31' }));
});

test('rejects a wrong milestone count', () => {
  assert.ok('error' in parseEvent({ ...event(), milestones: [] }));
});

test('rejects file keys outside the files/ namespace', () => {
  const e = event();
  e.milestones[0].files = [{ name: 'x.pdf', key: '../secret' }];
  assert.ok('error' in parseEvent(e));
});

test('deadline classification', () => {
  const now = '2027-01-15';
  assert.equal(due({ done: true, due: '2020-01-01' }, now), 'Complete');
  assert.equal(due({ done: false, due: '' }, now), 'Unscheduled');
  assert.equal(due({ done: false, due: '2027-01-14' }, now), 'Overdue');
  assert.equal(due({ done: false, due: '2027-01-15' }, now), 'Due today');
  assert.equal(due({ done: false, due: '2027-01-29' }, now), 'Due in 2 weeks');
  assert.equal(due({ done: false, due: '2027-01-30' }, now), 'Upcoming');
});

test('events without a start date need dates confirmed', () => {
  assert.equal(status(event(), '2027-01-15'), 'Dates to confirm');
});

test('CSV cells neutralise formulas but keep their text', () => {
  assert.equal(csvCell('+65 9123'), '"\'+65 9123"');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('plain'), '"plain"');
});
