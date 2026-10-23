import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from '@playwright/test';
process.loadEnvFile('.env');
const admin=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const email=`cancer-model-${randomUUID()}@example.invalid`,password=`Qa!${randomUUID()}`;
let id,b;
try {
 const u=await admin.auth.admin.createUser({email,password,email_confirm:true});if(u.error)throw u.error;id=u.data.user.id;
 b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage();
 p.on('response',async r=>{if(r.url().includes('/eve/') && !r.url().includes('/stream'))console.log('HTTP',r.status(),new URL(r.url()).pathname,(await r.text()).slice(0,1600));});
 await p.goto(process.env.CANCER_TEST_BASE || 'http://127.0.0.1:5173');await p.getByLabel('E-post',{exact:true}).fill(email);await p.getByLabel('Lösenord',{exact:true}).fill(password);await p.getByRole('button',{name:'Logga in',exact:true}).click();
 await p.getByRole('button',{name:'Starta chatt',exact:true}).click();
 const input=p.getByRole('textbox',{name:'Ditt meddelande'});await expect(input).toBeEnabled({timeout:30000});await input.fill('Svara endast OK.');await p.getByRole('button',{name:'Skicka meddelande'}).click();
 await expect(p.getByRole('article',{name:'OpenCancer',exact:true})).toContainText('OK',{timeout:60000});console.log('PASS initial model response');
 await expect.poll(async()=>{const r=await admin.from('cancer_messages').select('id').eq('owner_id',id).eq('role','assistant');return r.data?.length||0;},{timeout:30000}).toBeGreaterThan(0);
 const bindings=await admin.from('cancer_sessions').select('chat_id,session_id').eq('owner_id',id);const binding=bindings.data[0];
 await admin.from('cancer_sessions').update({session_id:'wrun_01M5N5Z3X2WWBMJ2NCXFRHAG4X'}).eq('chat_id',binding.chat_id);
 await p.reload();await p.getByRole('button',{name:'Återanslut chatten',exact:true}).click({timeout:30000});
 await expect(input).toBeEnabled();await input.fill('Svara endast KLART.');await p.getByRole('button',{name:'Skicka meddelande'}).click();
 await expect.poll(async()=>{const r=await admin.from('cancer_messages').select('content').eq('owner_id',id).eq('role','assistant');return r.data?.some(m=>m.content.includes('KLART'));},{timeout:60000}).toBe(true);
 await p.reload();await expect(p.getByRole('article',{name:'OpenCancer',exact:true}).filter({hasText:'OK'})).toBeVisible();await expect(p.getByRole('article',{name:'OpenCancer',exact:true}).filter({hasText:'KLART'})).toBeVisible();
 console.log('PASS recovery of missing session, model response, persistence and earlier history after reload');
} catch(e){process.exitCode=1;console.log('FAIL',e.message);if(b){console.log((await b.contexts()[0].pages()[0].locator('body').innerText()).slice(-2200));}}finally{await b?.close();if(id)await admin.auth.admin.deleteUser(id);}
