const { chromium } = require('@playwright/test');
const fs=require('node:fs');
(async()=>{
 for(const port of [3000,3100]){
  const base='http://localhost:'+port;
  try{
   const res=await fetch(base);const html=await res.text();
   const css=[...html.matchAll(/href="([^"]+\.css[^\"]*)"/g)].map(m=>m[1].replaceAll('&amp;','&'));
   console.log(JSON.stringify({port,documentStatus:res.status,css}));
   for(const path of css){const r=await fetch(new URL(path,base));const body=await r.text();console.log(JSON.stringify({port,path,status:r.status,type:r.headers.get('content-type'),bytes:body.length,hasTokens:body.includes('--electric')}));}
  }catch(e){console.log(port,e.message);}
 }
 const browser=await chromium.launch();
 for(const port of [3000,3100]){
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{await page.goto('http://localhost:'+port,{waitUntil:'networkidle'});await page.screenshot({path:'test-results/css-current-'+port+'.png'});console.log(JSON.stringify({port,errors,background:await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)}));}catch(e){console.log(port,e.message);}
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
