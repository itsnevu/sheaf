const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const base = process.env.DESIGN_URL || 'http://localhost:3100';
const dir='test-results/electric-after';
fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch();const report={base,viewports:[],routes:[],errors:[],checks:[]};
 for(const width of [375,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},permissions:['clipboard-read','clipboard-write']});
  await context.addInitScript(()=>localStorage.setItem('raqio-cookie-choice','essential'));
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForTimeout(400);
  await page.screenshot({path:`${dir}/hero-${width}.png`});
  for(const [name,selector] of Object.entries({showcase:'#showcase',features:'#capabilities',product:'#product',pricing:'#fees',footer:'.engraving-footer'})){
   const el=page.locator(selector);await el.scrollIntoViewIfNeeded();await page.waitForTimeout(350);await el.screenshot({path:`${dir}/${name}-${width}.png`});
  }
  await page.locator('#capabilities').scrollIntoViewIfNeeded();await page.waitForTimeout(500);await page.screenshot({path:`${dir}/floating-nav-${width}.png`});
  report.viewports.push({width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),hiddenContent:await page.locator('.reveal').evaluateAll(es=>es.filter(e=>getComputedStyle(e).opacity==='0').length)});
  await page.locator('#faq').scrollIntoViewIfNeeded();const question=page.getByRole('button',{name:'What is Raqio?'});await question.click();await expect(question).toHaveAttribute('aria-expanded','true');await question.click();
  if(width===375){await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();}
  for(const route of ['/docs','/security','/privacy','/sign-in','/sign-up']){
   const res=await page.goto(base+route,{waitUntil:'networkidle'});report.routes.push({width,route,status:res.status(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});await page.screenshot({path:`${dir}/${route.slice(1)}-${width}.png`,fullPage:true});
  }
  if(width===1440){
   await page.goto(base);await page.getByRole('button',{name:'Pause animation'}).click();await expect(page.getByRole('button',{name:'Play animation'})).toBeVisible();report.checks.push('showcase pause/resume');
   await page.locator('#connect').scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Copy',exact:true}).first().click();await expect(page.getByRole('button',{name:'Copied',exact:true})).toBeVisible();report.checks.push('network clipboard');
  }
  await context.close();
 }
 for(const mode of ['no-js','reduced-motion']){
  const context=await browser.newContext({javaScriptEnabled:mode!=='no-js',reducedMotion:mode==='reduced-motion'?'reduce':'no-preference'});const page=await context.newPage();await page.goto(base);
  report.checks.push({mode,headingVisible:await page.locator('h1').isVisible(),hidden:await page.locator('.reveal').evaluateAll(es=>es.filter(e=>getComputedStyle(e).opacity==='0').length)});await context.close();
 }
 // Authenticate only to the existing local demo; no operations are created or executed.
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
 const auth=await context.request.post(base+'/api/auth/sign-in',{data:{email:'owner@halden.example',password:'Raqio-demo-2026'}});
 report.checks.push({demoAuth:auth.status()});
 if(auth.ok()){
  const response=await context.request.get(base+'/api/batches');const body=await response.json();
  const routes=['/app','/app/batches','/app/batches/new','/app/executions','/app/reconciliation','/app/activity','/app/settings'];if(body.batches?.[0])routes.push('/app/batches/'+body.batches[0].id);
  for(const route of routes){const res=await page.goto(base+route,{waitUntil:'networkidle'});report.routes.push({width:1440,route,status:res.status(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});await page.screenshot({path:`${dir}/desk-${route.replaceAll('/','-')}.png`,fullPage:true});}
 }
 await context.close();await browser.close();fs.writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 if(report.errors.length || report.viewports.some(v=>v.overflow||v.hiddenContent)||report.routes.some(r=>r.status>=400||r.overflow))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
