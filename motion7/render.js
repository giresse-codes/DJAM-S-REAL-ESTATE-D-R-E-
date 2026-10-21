// Usage: node render.js preview <outdir> t1 t2 ...   |   node render.js video <out.mp4> [fps]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'); const fs = require('fs');
(async () => {
  const [mode, out, ...rest] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] });
  const VW = +(process.env.VW || 1920), VH = +(process.env.VH || 1080);
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  await page.goto('file://' + path.resolve(__dirname, 'scene.html') + (process.env.HASH || ''));
  await page.evaluate(() => window.READY);
  await page.waitForTimeout(300);
  const shot = async t => { await page.evaluate(t => render(t), t); return page.screenshot({ type: 'jpeg', quality: 93 }); };
  if (mode === 'preview') {
    fs.mkdirSync(out, { recursive: true });
    for (const t of rest) fs.writeFileSync(`${out}/t${(+t).toFixed(2)}.jpg`, await shot(+t));
  } else {
    const fps = +(rest[0] || 60), dur = await page.evaluate(() => DURATION), N = Math.round(dur * fps);
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-vf', fps > 30 ? 'tmix=frames=2,fps=30' : 'null', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < N; i++) {
      const buf = await shot(i / fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 120 === 0) console.log(`frame ${i}/${N}`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
