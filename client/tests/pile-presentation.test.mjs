import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {presentPile} from '../src/presentPile.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const ui=read('client/src/PresidentAsshole.tsx');
const css=read('client/src/styles.css');
const engine=read('server/src/president.ts');

test('pile heading reflects latest combination, not total pile cards',()=>{
 const prior=[{by:'p1',cards:['5C','5D'],serial:1}];
 const pair=[...prior,{by:'p2',cards:['9C','9H'],serial:2}];
 assert.equal(presentPile(['5C','5D','9C','9H'],pair).heading,'CURRENT PILE – PAIRS (2)');
 assert.equal(presentPile(['9C'],[{by:'p1',cards:['9C'],serial:1}]).heading,'CURRENT PILE – SINGLE (1)');
 assert.equal(presentPile(['3C','3D','3H'],[{by:'p1',cards:['3C','3D','3H'],serial:1}]).heading,'CURRENT PILE – TRIPLES (3)');
 assert.equal(presentPile(['8C','8D','8H','8S'],[{by:'p1',cards:['8C','8D','8H','8S'],serial:1}]).heading,'CURRENT PILE – FOUR OF A KIND (4)');
 assert.equal(presentPile([],[]).heading,'CURRENT PILE – EMPTY');
 assert.equal(presentPile(['4C','5C'],[{by:'p1',cards:['4C'],serial:1},{by:'p2',cards:['5C'],serial:2}]).heading,'CURRENT PILE – SINGLE (1)');
});

test('one compact overlapping fan, including latest cards, rather than grouped carousels',()=>{
 const pile=['3C','4D','5H','6S','7C','8D','9H','10S','JC'];
 const plays=[{by:'p1',serial:1,cards:['3C']},{by:'p2',serial:2,cards:['JC']}];
 const result=presentPile(pile,plays);
 assert.equal(result.cards.length,6);
 assert.equal(result.hiddenCount,3);
 assert.equal(result.cards.at(-1)?.card,'JC');
 assert.equal(result.cards.at(-1)?.latest,true);
 assert.equal(result.cards[0].latest,false);
 assert.equal(result.cards.map(c=>c.card).join(','),'6S,7C,8D,9H,10S,JC');
 const lastTriple=presentPile(pile,[{by:'p3',serial:3,cards:['9H','10S','JC']}]);
 assert.deepEqual(lastTriple.cards.slice(-3).map(c=>c.latest),[true,true,true]);
 assert.match(ui,/className="pa-pile-fan"/);
 assert.match(ui,/className="pa-stack-index"/);
 assert.match(ui,/className="pa-stack-pip"/);
 assert.match(ui,/\{pileView\.hiddenCount\} below/);
 assert.doesNotMatch(ui,/CURRENT COMBINATION|LATEST PLAY|EARLIER PLAY|pa-play-group/);
 assert.match(css,/\.pa-stack-card\{[^}]*margin-left:clamp\(-19px/);
 assert.match(css,/\.pa-stack-card\.latest\{/);
 assert.doesNotMatch(css,/\.pa-table-ring \.pa-pile\{[^}]*overflow-x:auto/);
});

test('older hidden cards never hide latest four-card combination',()=>{
 const cards=['3C','3D','4C','4D','5C','5D','6C','9C','9D','9H','9S'];
 const state=presentPile(cards,[{by:'p4',cards:['9C','9D','9H','9S'],serial:3}]);
 assert.equal(state.hiddenCount,5);
 assert.deepEqual(state.cards.slice(-4).map(c=>c.card),['9C','9D','9H','9S']);
 assert.ok(state.cards.slice(-4).every(c=>c.latest));
});

test('Last Pile preserves attribution while full pile history remains host-only',()=>{
 assert.match(ui,/<h3>Last Pile<\/h3>/);
 assert.match(ui,/game\.names\[lastPile\.by\].*cleared/);
 assert.match(ui,/lastPile\.cards\.map/);
 assert.match(engine,/pileHistory=\[\.\.\.\(g\.pileHistory\?\?\[\]\)\.slice\(-7\),record\]/);
 assert.match(engine,/pileHistory:host\?/);
});
