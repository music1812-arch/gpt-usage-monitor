// Read-only OpenAI organization usage collector. Requires OPENAI_ADMIN_KEY in server environment.
// No secrets are written to disk or exposed to the browser.
import {writeFile,rename} from 'node:fs/promises';
const key=process.env.OPENAI_ADMIN_KEY;
if(!key){console.error('OPENAI_ADMIN_KEY missing; no request made');process.exitCode=2}
else {
 const end=Math.floor(Date.now()/1000);
 const start=end-86400;
 const url=new URL('https://api.openai.com/v1/organization/usage/completions');
 url.searchParams.set('start_time',String(start));url.searchParams.set('end_time',String(end));url.searchParams.set('bucket_width','1d');url.searchParams.set('limit','1');
 try{
 const res=await fetch(url,{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new Error('OpenAI API status '+res.status);
 const payload=await res.json();
 const buckets=Array.isArray(payload.data)?payload.data:[];
 const totals=buckets.flatMap(b=>Array.isArray(b.results)?b.results:[]).reduce((a,r)=>({input:a.input+(Number(r.input_tokens)||0),output:a.output+(Number(r.output_tokens)||0),requests:a.requests+(Number(r.num_model_requests)||0)}),{input:0,output:0,requests:0});
 const snapshot={schemaVersion:1,observedAt:new Date().toISOString(),sources:[{id:'api',state:'ok',limits:[],metrics:{period:'last_24h',inputTokens:totals.input,outputTokens:totals.output,requests:totals.requests}}]};
 const dest=process.argv[2]||'usage-private.json';await writeFile(dest+'.tmp',JSON.stringify(snapshot,null,2)+'\n',{mode:0o600});await rename(dest+'.tmp',dest);console.log('snapshot updated, API totals only; no credentials logged');
 }catch(e){console.error('collector failed:',e.message);process.exitCode=1}
}
