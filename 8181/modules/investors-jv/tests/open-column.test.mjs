import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
const saved=new Map([['oplatform:/investors-jv:visible-columns','[0,1,17]']]);
const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL,localStorage:{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)}});
vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.Classes={PipelineView,ColumnSettings};',context);
const {PipelineView,ColumnSettings}=context.Classes;

test('Open follows the Review column, not the last added data column',()=>{
 const view=Object.create(PipelineView.prototype);
 view.path='/investors-jv';
 view.columns=()=>['Partner','Sector','Review','Confidence','Origin country'];
 const row={id:'example',partner:'Example'};
 assert.match(view.cell(row,'',2),/class="pipeline-review-column"/);
 assert.match(view.cell(row,'',2),/>Open ↗<\/button>/);
 assert.doesNotMatch(view.cell(row,'China',4),/table-open/);
 assert.doesNotMatch(view.cell(row,'High',3),/table-open/);
});

test('fixed Open stays visible without rewriting saved column preferences',()=>{
 const before=JSON.stringify([...saved]);
 const original=ColumnSettings.prototype.render;
 ColumnSettings.prototype.render=function(){};
 try{
  const settings=new ColumnSettings({container:{},table:{},columns:['Partner','Sector','Review'],order:[1,0,2],path:'/investors-jv'});
  assert.ok(settings.visible.has(2));
  assert.equal(JSON.stringify(settings.order),'[1,0,2]');
  assert.equal(JSON.stringify([...saved]),before);
 }finally{ColumnSettings.prototype.render=original;}
});

test('Open header has sticky positioning strong enough to beat resizable header positioning',async()=>{
 const css=await readFile(new URL('../../../platform-shell/shared/css/components.css',import.meta.url),'utf8');
 assert.match(css,/\.pipeline-table-shell \.resizable-table thead th\.pipeline-review-column\{position:sticky;right:0;/);
});
