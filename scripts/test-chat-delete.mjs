import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { chromium, expect } from '@playwright/test';
process.loadEnvFile('.env');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,options);
const base=process.env.CANCER_TEST_BASE || 'http://127.0.0.1:5173';let browser;const users=[];
try {
 for(let i=0;i<2;i++){const email=`delete-${randomUUID()}@example.invalid`,password=`Qa!${randomUUID()}`;const u=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(u.error,null);const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,options);const login=await client.auth.signInWithPassword({email,password});users.push({id:u.data.user.id,email,password,token:login.data.session.access_token});}
 const req=(i,path,method='GET',body)=>fetch(base+path,{method,headers:{authorization:'Bearer '+users[i].token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
 const workspaces=await (await req(0,'/api/workspaces')).json();const wid=workspaces[0].id;
 const chat=await (await req(0,'/api/chats','POST',{workspaceId:wid})).json();
 const sid=(await (await req(0,'/api/chats?workspaceId='+wid)).json())[0].id;
 assert.equal(sid,chat.id);
 await admin.from('cancer_sessions').insert({session_id:'delete-test-'+randomUUID(),chat_id:chat.id,owner_id:users[0].id});
 await admin.from('cancer_messages').insert({id:randomUUID(),chat_id:chat.id,owner_id:users[0].id,role:'user',content:'Deletion fixture'});
 assert.equal((await req(1,'/api/chats?id='+chat.id,'DELETE')).status,404);
 browser=await chromium.launch({channel:'chrome',headless:true});const p=await browser.newPage();await p.goto(base);await p.getByLabel('E-post',{exact:true}).fill(users[0].email);await p.getByLabel('Lösenord',{exact:true}).fill(users[0].password);await p.getByRole('button',{name:'Logga in',exact:true}).click();
 await p.getByRole('button',{name:'Ta bort chatten Ny chatt',exact:true}).click();await p.getByRole('button',{name:'Avbryt',exact:true}).click();await expect(p.getByRole('button',{name:'Ta bort chatten Ny chatt',exact:true})).toBeVisible();
 await p.getByRole('button',{name:'Ta bort chatten Ny chatt',exact:true}).click();await p.getByRole('button',{name:'Ta bort chatt',exact:true}).click();await expect(p.getByRole('heading',{name:'Välkommen till OpenCancer'})).toBeVisible();await p.reload();await expect(p.getByRole('heading',{name:'Välkommen till OpenCancer'})).toBeVisible();
 for(const table of ['cancer_messages','cancer_sessions']){const r=await admin.from(table).select('*').eq('chat_id',chat.id);assert.deepEqual(r.data,[]);}
 assert.equal((await req(0,'/api/workspaces')).status,200);
 console.log('PASS owner-only deletion, confirmation/cancel, last chat empty state, reload and message/session cascade');
} finally {await browser?.close();for(const u of users)await admin.auth.admin.deleteUser(u.id);}
