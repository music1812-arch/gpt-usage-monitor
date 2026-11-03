import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const password=randomBytes(32).toString('hex');
const child=spawn(process.execPath,['src/server.mjs'],{cwd:process.cwd(),env:{...process.env,MONITOR_PORT:'18791',MONITOR_PASSWORD:password,CODEX_ENABLED:'0',OPENAI_ADMIN_KEY:''},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,httpCredentials:{username:'monitor',password}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:18791');await page.waitForFunction(()=>document.querySelectorAll('.card').length===3);
 assert.equal(await page.locator('.card').count(),3);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.match(await page.locator('#overall').innerText(),/未连接/);
 assert.equal(await page.locator('input').count(),0);
 assert.equal(await page.evaluate(async()=>await caches.keys().then(x=>x.length)),0);
 await mkdir('test-results',{recursive:true});
 await page.screenshot({path:'test-results/iphone-390.png',fullPage:true});
 await page.route('**/v1/usage',r=>r.abort());await page.locator('#refresh').click();await page.waitForFunction(()=>document.querySelector('#overall').textContent.includes('连接失败'));
 await page.unroute('**/v1/usage');await page.locator('#refresh').click();await page.waitForFunction(()=>document.querySelector('#overall').textContent.includes('未连接'));
 await page.setViewportSize({width:320,height:700});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 console.log('Chromium mobile checks passed: 390px/320px, authenticated load, no overflow, no inputs/cache, network failure and recovery, no JS errors');
}finally{await browser.close();child.kill('SIGTERM');}
