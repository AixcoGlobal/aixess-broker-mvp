// Local-only browser QA. Admin responses are fixtures; no real admin credentials or writes.
async function verifyLocales(page) {
  if(!/^http:\/\/localhost:\d+\//.test(page.url())) throw new Error('Run translation fixtures only on localhost');
  const base=page.url().split('/').slice(0,3).join('/');
  const overview={days:7,from:Date.now()-7*86400000,updatedAt:Date.now(),sessions:0,leads:0,convertedSessions:0,events:[],trend:[],pages:[],floors:[],units:[],devices:[],locales:[]};
  let login=false;
  await page.route('**/api/admin/**',route=>{
    const path=route.request().url().split('?')[0];
    const body=path.endsWith('/state')?{setupAvailable:false}:path.endsWith('/session')?(login?{error:'Sign in'}:{email:'qa@example.test',source:'D1'}):path.endsWith('/overview')?overview:{rows:[],total:0};
    return route.fulfill({status:login&&path.endsWith('/session')?401:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  // The source dictionaries are validated separately; these phrases detect common visible regressions.
  const forbidden=/\b(A Block|B Block|Loading admin|Welcome back|Sign in to monitor|Email address|Recovery code|Page views|Follow-up status|Select a residence|Available residences|Reset filters|Click outside|room_kitchen)\b/i;
  const results=[];
  try {
    for(const locale of ['en','de','pl','sl','ru']) {
      await page.evaluate(locale=>{localStorage.setItem('aixess-language',locale);localStorage.setItem('aixess.privacy.v1',JSON.stringify({value:'rejected',expires:Date.now()+86400000}));},locale);
      await page.goto(base+'/#insights');
      await page.reload();
      await page.waitForFunction(locale=>document.documentElement.lang===locale,locale);
      for(const [width,height] of [[1440,900],[390,844],[320,568]]) {
        await page.setViewportSize({width,height});
        for(const route of ['home','why-aixess','broker-access','insights','broker-tools','privacy','admin']) {
          login=false;
          await page.evaluate(route=>{location.hash=route;},route);
          await page.waitForTimeout(200);
          await page.evaluate(()=>document.fonts.ready);
          if(route==='admin') await page.locator('.admin-metrics').waitFor();
          const body=await page.locator('body').innerText();
          if(locale!=='en' && forbidden.test(body)) throw new Error(`${locale}/${route}: English remains: ${body.match(forbidden)[0]}`);
          if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)) throw new Error(`${locale}/${route}/${width}: horizontal overflow`);
          if(['pl','ru','de'].includes(locale)&&width===390&&['insights','broker-tools','admin'].includes(route)) await page.screenshot({path:`output/playwright/locale-${locale}-${route}-${width}.png`});
          results.push({locale,route,width});
        }
        login=true;
        await page.reload();
        await page.locator('.admin-login-card').waitFor();
        if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)) throw new Error(`${locale}/login/${width}: horizontal overflow`);
        if(locale!=='en'&&forbidden.test(await page.locator('body').innerText())) throw new Error(`${locale}: English login`);
        if(width===390) await page.screenshot({path:`output/playwright/locale-${locale}-login.png`});
        await page.evaluate(()=>{location.hash='insights';});
        await page.waitForTimeout(100);
      }
    }
  } finally { await page.unroute('**/api/admin/**'); }
  return {pageChecks:results.length,loginChecks:15,results};
}
