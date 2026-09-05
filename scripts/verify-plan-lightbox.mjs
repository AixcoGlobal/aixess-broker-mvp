// Run with playwright-cli run-code after selecting a residence with both previews.
async function verifyPlanLightbox(page) {
  if (await page.locator('.floor-plan-lightbox').count()) await page.keyboard.press('Escape');
  const results = [];
  for (const [width, height] of [[1669,858], [1440,900], [1024,768], [390,844], [320,568], [844,390]]) {
    await page.setViewportSize({width,height});
    for (const mode of ['2D PLAN', '3D VIEW']) {
      await page.locator('.unit-preview-tabs').getByRole('button',{name:mode,exact:true}).click();
      await page.locator('.unit-preview-button').click();
      await page.locator('.floor-plan-lightbox-image img').evaluate(img=>img.decode());
      const result = await page.locator('.floor-plan-lightbox-image').evaluate(el=>{
        const img=el.querySelector('img'), box=el.getBoundingClientRect(), image=img.getBoundingClientRect();
        return {fits:Math.abs(box.width-image.width)<1 && Math.abs(box.height-image.height)<1,
          contained:getComputedStyle(img).objectFit==='contain',
          inViewport:box.left>=0 && box.top>=0 && box.right<=innerWidth && box.bottom<=innerHeight};
      });
      if (!result.fits || !result.contained || !result.inViewport) throw new Error(JSON.stringify({width,height,mode,...result}));
      await page.screenshot({path:`output/playwright/lightbox-${width}-${height}-${mode.slice(0,2)}.png`});
      await page.keyboard.press('Escape');
      if (await page.locator('.floor-plan-lightbox').count()) throw new Error('Escape did not close the preview');
      results.push({width,height,mode,...result});
    }
  }
  return results;
}
