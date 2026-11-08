const {chromium}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch();
 for(const width of [375,768,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('raqio-cookie-choice','essential'));
  await page.goto('http://localhost:3000',{waitUntil:'networkidle'});
  await page.waitForTimeout(800);
  const result=await page.evaluate(()=>{const copy=document.querySelector('.hero-copy').getBoundingClientRect();const art=document.querySelector('.hero-illustration').getBoundingClientRect();const mark=document.querySelector('header img');return {copy:{x:copy.x,y:copy.y},art:{x:art.x,y:art.y},mark:mark?.getAttribute('src'),loaded:mark?.complete,css:document.styleSheets.length,overflow:document.documentElement.scrollWidth>innerWidth,sculptures:document.querySelectorAll('.release-sculpture').length};});
  await page.screenshot({path:'test-results/restored-hero-'+width+'.png'});
  console.log(JSON.stringify({width,errors,...result}));await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
