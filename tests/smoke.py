from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess, time, json, urllib.request, os
ROOT=Path(__file__).resolve().parents[1]
PORT=os.environ.get('TEST_PORT','5812');BASE='http://127.0.0.1:'+PORT
server=subprocess.Popen(['node','server.mjs'],cwd=ROOT,env=os.environ|{'HOST':'127.0.0.1','PORT':PORT},stdout=open(ROOT/'tests/evidence/smoke-server.log','w'),stderr=subprocess.STDOUT)
report={'errors':[],'checks':[]}
def shot(page,name):
    if os.environ.get('NO_SHOTS')!='1':page.screenshot(path=str(ROOT/'shots'/name),full_page=True)
def wait_js(page, expression):
    for _ in range(300):
        if page.evaluate(expression): return
        page.wait_for_timeout(50)
    raise Exception('Timed out: '+expression)
try:
    for _ in range(100):
        try:
            health=json.load(urllib.request.urlopen(BASE+'/health'));break
        except Exception:time.sleep(.1)
    else:raise Exception('Server failed to start')
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.goto(BASE+'/?test=1');wait_js(page,'!!window.__CALLIT__');shot(page,'restyle-first-lobby.png')
        page.evaluate('__CALLIT__.startSolo(77)');page.locator('[data-card="hand:p0:0"]').click();page.locator('[data-card="hand:p0:1"]').click()
        assert page.evaluate('__CALLIT__.getView().hands.p0.filter(c=>c.value!==null).length')==2
        shot(page,'restyle-first-peek.png')
        page.get_by_role('button',name='Hide cards · ready →').click()
        wait_js(page,'__CALLIT__.getView().phase!=="setup"')
        page.evaluate('(async()=>{const {createBot}=await import("/engine.mjs");window.smokeBot=createBot(12)})()')
        for step in range(1000):
            v=page.evaluate('__CALLIT__.getView()')
            if v['phase']=='roundEnd':break
            if (v.get('powerActor') if v['phase'] in ['power','reveal'] else v['active'])=='p0' and v['phase']!='stacking':page.evaluate('__CALLIT__.act(smokeBot.action(__CALLIT__.getView()))')
            page.wait_for_timeout(80)
        else:raise Exception('No round end')
        shot(page,'restyle-first-round.png')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        report['checks']=['health ok','lobby loads','two-card private peek','explicit hide','solo round completes','no horizontal overflow','no page errors']
        assert not report['errors'],report['errors']
        browser.close()
    report['passed']=True
finally:
    server.terminate();server.wait(timeout=5)
    (ROOT/'tests/evidence/rules-smoke.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
