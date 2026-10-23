import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { chromium, expect } from '@playwright/test';
process.loadEnvFile('.env');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const users = [0,1,2].map(() => ({ email: `cancer-share-${randomUUID()}@example.invalid`, password: `Qa!${randomUUID()}` }));
const req = (u, path, method = 'GET', body) => fetch(`http://127.0.0.1:5173${path}`, {method,headers:{authorization:`Bearer ${u.token}`,'content-type':'application/json'},body:body ? JSON.stringify(body):undefined});
let browser;
try {
  for (const u of users) {
    const created = await admin.auth.admin.createUser({email:u.email,password:u.password,email_confirm:true}); assert.equal(created.error,null); u.id=created.data.user.id;
    u.client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const login=await u.client.auth.signInWithPassword({email:u.email,password:u.password}); assert.equal(login.error,null); u.token=login.data.session.access_token;
  }
  const [owner,member,outsider]=users;
  const w=await (await req(owner,'/api/workspaces')).json(); const workspace=w[0];
  const ownChat=await (await req(owner,'/api/chats','POST',{workspaceId:workspace.id})).json();
  const session=await (await req(owner,'/eve/v1/session','POST',{})).json(); // Creation without saved-chat header must fail.
  assert.ok(session.error);
  assert.equal((await req(member,'/api/workspace-shares','POST',{workspaceId:workspace.id,email:outsider.email})).status,403);
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('E-post',{exact:true}).fill(owner.email); await page.getByLabel('Lösenord',{exact:true}).fill(owner.password);
  await page.getByRole('button',{name:'Logga in',exact:true}).click();
  await page.getByRole('button',{name:'Dela workspace',exact:true}).click();
  await page.getByLabel('E-postadress',{exact:true}).fill(member.email.toUpperCase());
  await page.getByRole('button',{name:'Ge åtkomst',exact:true}).click();
  await expect(page.getByRole('dialog', {name:'Dela workspace'}).getByRole('status')).toContainText('Åtkomst sparad');
  await mkdir('verification.local',{recursive:true}); await page.screenshot({path:'verification.local/workspace-sharing.png'});
  const shared=await (await req(member,'/api/workspaces')).json(); assert.ok(shared.some(x=>x.id===workspace.id));
  assert.deepEqual(await (await req(member,`/api/chats?workspaceId=${workspace.id}`)).json(),[]);
  assert.deepEqual((await member.client.from('cancer_chats').select('*').eq('id',ownChat.id)).data,[]);
  const memberResponse=await req(member,'/api/chats','POST',{workspaceId:workspace.id}); assert.equal(memberResponse.status,201,await memberResponse.clone().text()); const memberChat=await memberResponse.json();
  assert.equal((await req(member,'/api/workspace-shares','POST',{workspaceId:workspace.id,email:outsider.email})).status,403);
  assert.deepEqual((await outsider.client.from('cancer_workspaces').select('id').eq('id',workspace.id)).data,[]);
  const shares=await (await req(owner,`/api/workspace-shares?workspaceId=${workspace.id}`)).json(); assert.equal(shares.length,1);
  await req(owner,'/api/workspace-shares','POST',{workspaceId:workspace.id,email:member.email});
  assert.equal((await (await req(owner,`/api/workspace-shares?workspaceId=${workspace.id}`)).json()).length,1);
  const memberSessionResponse=await fetch('http://127.0.0.1:5173/eve/v1/session',{method:'POST',headers:{authorization:`Bearer ${member.token}`,'content-type':'application/json','x-cancer-chat-id':memberChat.id},body:'{}'}); assert.equal(memberSessionResponse.status,200); const memberSession=await memberSessionResponse.json();
  await page.getByRole('button',{name:`Ta bort åtkomst för ${member.email}`}).click();
  await expect(page.getByRole('dialog', {name:'Dela workspace'}).getByRole('status')).toContainText('tagits bort');
  assert.deepEqual((await member.client.from('cancer_workspaces').select('id').eq('id',workspace.id)).data,[]);
  assert.deepEqual((await member.client.from('cancer_chats').select('id').eq('id',memberChat.id)).data,[]);
  assert.equal((await req(member,`/eve/v1/session/${memberSession.sessionId}/stream`)).status,403);
  assert.equal((await req(member,'/api/chats','POST',{workspaceId:workspace.id})).status,404);
  assert.ok((await admin.rpc('cancer_save_message',{p_owner:member.id,p_session:memberSession.sessionId,p_id:'revoked',p_role:'assistant',p_content:'Must reject'})).error);
  await page.setViewportSize({width:390,height:844}); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'verification.local/workspace-sharing-mobile.png'});
  console.log('PASS share dialog, email normalization, membership, private chats, member chat creation, owner-only management, duplicate sharing, revocation including session and server writes, mobile');
} finally {
  await browser?.close();
  for(const u of users) if(u.id) { const r=await admin.auth.admin.deleteUser(u.id); assert.equal(r.error,null); }
  console.log('Removed temporary sharing test users and data');
}
