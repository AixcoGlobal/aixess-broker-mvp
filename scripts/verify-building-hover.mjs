// Run through playwright-cli run-code in its retained browser session.
async function verifyBuildingHover(page) {
  await page.locator('#residences').evaluate(el => window.scrollTo(0,el.offsetTop+el.offsetHeight-window.innerHeight));
  await page.waitForFunction(()=>document.querySelector('.building-map')?.dataset.loadState==='ready');
  await page.evaluate(async () => {
    window.qaPc=await import('/node_modules/.vite/deps/playcanvas.js');
    window.qaH=await import('/src/components/reveranceFloorHighlight.js');
    window.qaApp=qaPc.Application.getApplication();
    window.qaCamera=qaApp.root.findComponents('camera')[0].entity;
    qaCamera.script.reveranceCameraControls.enabled=false;
  });
  const results=[];
  for(const block of ['ReveranceA','ReveranceB']) {
    for(const angle of [-40,0,40]) {
      await page.mouse.move(10,10);
      await page.evaluate(({block,angle})=>{
        const transform=qaH.getFloorWorldTransform(qaH.getFloorVolumesForBlock(block)[7]);
        const sign=block==='ReveranceA'?1:-1;
        const t=angle*Math.PI/180;
        qaCamera.setPosition(transform.transformPoint(new qaPc.Vec3(sign*3.7*Math.cos(t),.1,3.7*Math.sin(t))));
        qaCamera.lookAt(transform.transformPoint(qaPc.Vec3.ZERO),new qaPc.Vec3(-.00057,.999988,-.00483));
      },{block,angle});
      await page.waitForTimeout(300);
      for(const floor of [2,5,10,13,16]) {
        const points=await page.evaluate(({block,floor})=>{
          const volume=qaH.getFloorVolumesForBlock(block).find(v=>v.number===floor);
          const transform=qaH.getFloorWorldTransform(volume);
          const sign=block==='ReveranceA'?1:-1;
          const rect=document.querySelector('.building-map canvas').getBoundingClientRect();
          return [-.75,0,.75].map(across=>{
            const p=transform.transformPoint(new qaPc.Vec3(sign*.29,0,across*.44));
            const s=qaCamera.camera.worldToScreen(p);
            return {x:s.x+rect.left,y:s.y+rect.top};
          });
        },{block,floor});
        for(const p of points) {
          await page.mouse.move(p.x,p.y);
          await page.waitForFunction(({block,floor})=>{
            const d=document.querySelector('.building-map').dataset;
            return d.hoveredBlock===block && Number(d.hoveredFloor)===floor;
          },{block,floor},{timeout:2500});
        }
        if([2,10,16].includes(floor)) {
          await page.locator('.building-map').screenshot({path:`output/playwright/hover-${block}-${angle}-${floor}.png`});
        }
        results.push({block,angle,floor,hitPoints:points.length});
      }
      await page.mouse.move(740,215);
      await page.waitForTimeout(100);
      const hovered=await page.locator('.building-map').getAttribute('data-hovered-floor');
      if(hovered) throw new Error(`Sky still hovers ${block} ${angle}: ${hovered}`);
    }
  }
  console.log(JSON.stringify({checks:results.length,pointerHits:results.length*3,results}));
}
