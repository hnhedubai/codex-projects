import assert from 'node:assert/strict';
import test from 'node:test';
import {projects} from '../data/source.js';

const project = projects.find(item => item.id === 'baltic-east');
test('Baltic East referral preserves Bartosz without duplicating or changing his public role', () => {
 const contacts = project.contacts.filter(item => item.email === 'bartosz.marciniak@orlen.pl');
 assert.equal(contacts.length, 1);
 assert.match(contacts[0].title, /Deputy Package Manager FOU/);
 assert.match(contacts[0].notes, /For Baltic East matters contact Bartosz/);
 assert.match(contacts[0].source, /^https:\/\/neptun.orlen.pl/);
});
test('Rafal remains a user-supplied other-matters cover contact, not an invented project decision-maker', () => {
 const contacts = project.contacts.filter(item => item.email === 'rafal.zendarski@orlen.pl');
 assert.equal(contacts.length, 1);
 assert.equal(contacts[0].name, 'Rafał Żendarski');
 assert.match(contacts[0].role, /other than Baltic East/);
 assert.match(contacts[0].title, /formal title not supplied/);
 assert.match(contacts[0].status, /not Reoon verified/);
 assert.equal(contacts[0].source, '');
});
test('absence and original-message date uncertainty are retained in history and Magda notes', () => {
 const history = project.history.at(-1);
 assert.match(history[1], /28 October inclusive/);
 assert.match(history[1], /emails are not forwarded/);
 assert.match(history[1], /original message date and return year not supplied/);
 const magda = project.contacts.find(item => item.email === 'magdalena.renda@orlen.pl');
 assert.match(magda.notes, /User-supplied out-of-office/);
 assert.equal(project.signal, 'Partner sought');
});
