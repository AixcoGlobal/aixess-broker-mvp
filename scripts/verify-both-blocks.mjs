// Run through playwright-cli run-code; checks the actual modal rows against stock.
async function verifyBothBlocks(page) {
  await page.setViewportSize({width:1440,height:1000});
  await page.reload();
  await page.locator('#residences').evaluate(el=>window.scrollTo(0,el.offsetTop+el.offsetHeight-window.innerHeight));
  await page.waitForFunction(()=>document.querySelector('.building-map')?.dataset.loadState==='ready');
  const expected=await page.evaluate(async()=>{
    const {applyWorkbookInventory}=await import('/src/data/reveranceInventory.js');
    return applyWorkbookInventory(await(await fetch('/data/reverance-a.json')).json()).blocks;
  });
  let tested=0;
  for(const block of expected) {
    await page.locator('.model-block-switcher').getByRole('button',{name:block.code,exact:true}).click();
    for(const floor of block.floors) {
      await page.locator('.model-floor-rail button[data-floor="'+floor.number+'"]').click();
      await page.locator('.floor-modal').waitFor();
      const rows=await page.locator('.unit-row').evaluateAll(els=>els.map(el=>({text:el.textContent,className:el.className})));
      if(rows.length!==12) throw new Error(block.code+' '+floor.number+' row count '+rows.length);
      for(const unit of floor.units) {
        const row=rows.find(r=>r.text.includes('#'+unit.name));
        if(!row?.className.includes('is-'+unit.status)) throw new Error('Wrong status '+block.code+' '+unit.name);
      }
      if(floor.number===2 || floor.number===14) await page.screenshot({path:'output/playwright/inventory-'+block.code+'-'+floor.number+'.png'});
      await page.locator('.floor-modal-close').click();
      tested++;
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#residences').evaluate(el=>window.scrollTo(0,el.offsetTop));
  await page.locator('.model-block-switcher').getByRole('button',{name:'B',exact:true}).click();
  await page.screenshot({path:'output/playwright/mobile-building.png'});
  await page.locator('.model-floor-rail button[data-floor="2"]').click();
  await page.locator('.unit-row').first().waitFor();
  await page.screenshot({path:'output/playwright/mobile-b-plan.png'});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  if(overflow) throw new Error('Mobile horizontal overflow');
  console.log(JSON.stringify({floorsTested:tested,apartmentsTested:tested*12,mobileOverflow:overflow}));
}
