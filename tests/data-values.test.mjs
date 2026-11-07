import test from 'node:test';
import assert from 'node:assert/strict';
import {diffValues,formatDataValue} from '../packages/design-system/src/lib/data-values.ts';
test('display distinguishes missing, null and meaningful falsy values',()=>{
  assert.deepEqual([undefined,null,'',false,0].map(formatDataValue),['Not provided','null','""','false','0']);
});
test('diff handles nested changes, additions, removals and array indices',()=>{
  assert.deepEqual(diffValues({a:false,nested:{n:0},old:'value',ids:['a']},{a:true,nested:{n:0},ids:['a','b']}),[
    {path:'/a',kind:'changed',before:false,after:true},
    {path:'/old',kind:'removed',before:'value'},
    {path:'/ids/1',kind:'added',after:'b'}
  ]);
});
test('JSON pointer paths escape keys and preserve null/type changes',()=>{
  assert.deepEqual(diffValues({'a/b~c':null},{'a/b~c':''}),[{path:'/a~1b~0c',kind:'changed',before:null,after:''}]);
  assert.deepEqual(diffValues({value:[]},{value:{}}),[{path:'/value',kind:'changed',before:[],after:{}}]);
  assert.deepEqual(diffValues({a:0},{a:0}),[]);
});
