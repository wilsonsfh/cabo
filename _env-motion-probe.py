from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time
ROOT=Path(__file__).resolve().parent
report={'note':'Sandbox headless/software Chromium only. Synthetic one-card WAAPI repetition is representative motion, not a real engine action or native-GPU/sustained gameplay test. Celebration is the clean real seeded replay.','errors':[]}
def wait(page,js):
    until=time.monotonic()+15
    while time.monotonic()<until:
        if page.evaluate(js):return
        page.wait_for_timeout(30)
    raise AssertionError(js)
sample='''async()=>{const dt=[];let prev;await new Promise(resolve=>{function frame(now){if(prev!==undefined)dt.push(now-prev);prev=now;if(dt.length<240)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});const sorted=[...dt].sort((a,b)=>a-b);return {samples:dt.length,meanMs:dt.reduce((a,b)=>a+b,0)/dt.length,medianMs:sorted[120],p95Ms:sorted[228],maxMs:Math.max(...dt),over25Ms:dt.filter(x=>x>25).length};}'''
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=2)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.goto('http://127.0.0.1:5818/?test=1');wait(page,'!!window.__CALLIT__');page.evaluate('document.fonts.ready');page.evaluate('__CALLIT__.startSolo(77)');page.locator('[data-card="hand:p0:0"]').click();page.wait_for_timeout(800);page.locator('[data-card="hand:p0:1"]').click();page.get_by_role('button',name='Hide cards · ready →').click();wait(page,'__CALLIT__.getView().phase==="turn"&&__CALLIT__.getView().active==="p0"');page.wait_for_timeout(300)
    page.evaluate('''()=>{window.probeCardMotion=document.querySelector('.card-slot').animate([{transform:'translateY(-5px) rotate(-1deg)'},{transform:'translateY(0) rotate(0)'}],{duration:280,iterations:Infinity,easing:'cubic-bezier(.23,1,.32,1)'});}''')
    page.evaluate('__CALLIT__.scene.setReduced(true)');report['cardMotionEnvironmentStatic']=page.evaluate(sample)
    page.evaluate('__CALLIT__.scene.setReduced(false)');report['cardMotionEnvironmentAnimated']=page.evaluate(sample)
    page.evaluate('probeCardMotion.cancel()')
    page.goto('http://127.0.0.1:5818/?demo=celebrate');wait(page,'document.body.dataset.celebrationReady==="true"');report['celebration']=page.evaluate(sample)
    report['transientRemovedAfterSample']=page.locator('.ink-celebration').count()==0
    b.close()
(ROOT/'shots/environment-motion-cadence.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
