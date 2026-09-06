// Run with playwright-cli run-code against the local Vite preview.
async function verifyMobileFloorGestures(page) {
  if (!/^http:\/\/localhost:\d+\//.test(page.url())) throw new Error('Local QA only');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const send = (type, points = []) => cdp.send('Input.dispatchTouchEvent', {
    type, touchPoints: points.map((p, id) => ({ x: p.x, y: p.y, id, radiusX: 2, radiusY: 2 })),
  });
  const state = () => page.evaluate(async () => {
    const pc = await import('/node_modules/.vite/deps/playcanvas.js');
    const camera = pc.Application.getApplication().root.findByName('Official Reverance orbit camera');
    const map = document.querySelector('.building-map');
    return { pose: camera.getEulerAngles().toArray(), floor: map.dataset.hoveredFloor,
      block: map.dataset.hoveredBlock, fov: Number(map.dataset.cameraFov), modal: !!document.querySelector('.floor-modal') };
  });
  const points = () => page.evaluate(async () => {
    const pc = await import('/node_modules/.vite/deps/playcanvas.js');
    const { pickBlockFloorFromScreen } = await import('/src/components/reveranceFloorHighlight.js');
    const camera = pc.Application.getApplication().root.findByName('Official Reverance orbit camera');
    const canvas = document.querySelector('.building-map canvas');
    const rect = canvas.getBoundingClientRect();
    const found = {};
    for (let y = 110; y < Math.min(rect.height - 100, innerHeight - rect.top - 100); y += 6) {
      for (let x = 55; x < rect.width - 30; x += 6) {
        if (document.elementFromPoint(rect.left + x, rect.top + y) !== canvas) continue;
        const hit = pickBlockFloorFromScreen(camera, x, y, rect.width, rect.height);
        const key = hit?.blockId || 'background';
        if (hit && (hit.floor < 5 || hit.floor > 12)) continue;
        if (!found[key]) found[key] = { x: rect.left + x, y: rect.top + y, ...hit };
      }
    }
    return found;
  });
  const changed = (a, b) => a.pose.some((n, i) => Math.abs(n - b.pose[i]) > 0.01);
  const checks = [];
  try {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.locator('#residences').evaluate(el => window.scrollTo(0, el.offsetTop));
      await page.waitForFunction(() => document.querySelector('.building-map')?.dataset.loadState === 'ready');
      await frames();
      const targets = await points();
      for (const block of ['ReveranceA', 'ReveranceB']) {
        const point = targets[block];
        if (!point) throw new Error(`${width}: no visible ${block} target`);
        const before = await state();
        await send('touchStart', [point]); await frames();
        const held = await state();
        if (held.floor !== String(point.floor) || held.block !== block) throw new Error(`${width}/${block}: missing touch highlight`);
        await page.screenshot({ path: `output/playwright/touch-highlight-${block}-${width}.png` });
        await send('touchMove', [{ ...point, x: point.x + 25 }]); await frames();
        if (changed(before, await state())) throw new Error(`${width}/${block}: building drag rotated camera`);
        await send('touchEnd'); await frames();
        if ((await state()).modal) throw new Error(`${width}/${block}: drag opened a floor`);
        await send('touchStart', [point]); await frames(); await send('touchEnd');
        await page.locator('.floor-modal').waitFor({ state: 'visible' });
        await page.locator('.floor-modal-close').click();
        checks.push(`${width}/${block}: highlight, blocked orbit, tap selection`);
      }
      const background = (await points()).background;
      if (!background) throw new Error('Missing background target');
      const before = await state();
      await send('touchStart', [background]);
      for (let i = 1; i <= 5; i++) {
        await send('touchMove', [{ x: background.x + i * 12, y: background.y }]); await frames();
      }
      await send('touchEnd'); await frames();
      if (!changed(before, await state())) throw new Error(`${width}: background drag did not rotate`);
      const zoomBefore = await state();
      const left = { x: width / 2 - 35, y: 280 }, right = { x: width / 2 + 35, y: 280 };
      await send('touchStart', [left]); await send('touchStart', [left, right]);
      await send('touchMove', [{ x: left.x - 15, y: left.y }, { x: right.x + 15, y: right.y }]); await frames();
      await send('touchEnd'); await frames();
      const zoomAfter = await state();
      if (zoomAfter.fov >= zoomBefore.fov || zoomAfter.modal) throw new Error(`${width}: pinch failed or selected floor`);
      checks.push(`${width}: background orbit and pinch zoom`);
      const swipe = (await points()).ReveranceA;
      if (!swipe) throw new Error('Missing cancellation target');
      await send('touchStart', [swipe]); await frames();
      await send('touchCancel'); await frames();
      if ((await state()).modal || (await state()).floor) {
        throw new Error(`${width}: cancelled touch retained a highlight or selected a floor`);
      }
      checks.push(`${width}: cancelled touch clears preview without selecting`);
    }
    return checks;
  } finally {
    await send('touchCancel').catch(() => {});
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await cdp.detach();
  }
}
