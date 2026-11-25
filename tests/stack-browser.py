from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess,time,json,os,urllib.request,traceback
R=Path(__file__).resolve().parents[1];BASE='http://127.0.0.1:5818'
report={'checks':[],'errors':[],'consoleErrors':[],'shots':[]}
server=subprocess.Popen(['node','tests/stack-browser-server.mjs'],cwd=R,stdout=open(R/'tests/evidence/stack-browser-server.log','w'),stderr=subprocess.STDOUT)
def check(name,ok=True):
    assert ok,name
    report['checks'].append(name)
def wait(p,js):
    until=time.monotonic()+10
    while time.monotonic()<until:
        if p.evaluate(js):return
        p.wait_for_timeout(20)
    raise AssertionError('Timed out: '+js)
def act(p,a):
    old=p.evaluate('__CALLIT__.getView().version');p.evaluate('(a)=>__CALLIT__.act(a)',a);wait(p,f'__CALLIT__.getView().version>{old}')
try:
    for _ in range(100):
        try:urllib.request.urlopen(BASE+'/health');break
        except Exception:time.sleep(.05)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        ca=browser.new_context(viewport={'width':1440,'height':1000},color_scheme='light',reduced_motion='reduce')
        cb=browser.new_context(viewport={'width':390,'height':844},color_scheme='dark',reduced_motion='reduce')
        a,b=ca.new_page(),cb.new_page()
        for p in [a,b]:
            p.on('pageerror',lambda e:report['errors'].append(str(e)))
            p.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None)
            p.goto(BASE+'/?test=1');wait(p,'!!window.__CALLIT__')
        a.locator('#name').fill('Wilson');a.locator('#create').click();wait(a,'!!__CALLIT__.getRoom()?.code');code=a.evaluate('__CALLIT__.getRoom().code')
        b.locator('#name').fill('Friend');b.locator('#join-details').evaluate('(e)=>e.open=true');b.locator('#room-code').fill(code);b.locator('#join').click();wait(a,'__CALLIT__.getRoom().connected.length===2');a.locator('#start-match').click();wait(b,'!!__CALLIT__.getView()')
        for p in [a,b]:
            act(p,{'type':'initialPeek','slots':[0,1]});act(p,{'type':'ready'})
        a.wait_for_timeout(120)
        # Isolated server fixture sets p1 as discarder; the first draw broadcasts it.
        act(b,{'type':'draw','source':'deck'});check('fixture draws Queen privately',b.evaluate('__CALLIT__.getView().held.rank')=='Q')
        b.get_by_role('button',name='Discard: Look + swap?',exact=True).click();wait(a,'__CALLIT__.getView().phase==="stacking"')
        check('Stack button appears at discard moment',a.get_by_role('button',name='Stack',exact=True).count()==1)
        check('both peers show pending countdown',a.locator('#power-countdown').count()==1 and b.locator('#power-countdown').count()==1)
        check('power not started during window',a.evaluate('__CALLIT__.getView().power===null'))
        for p,file in [(a,'stack-desktop-light.png'),(b,'stack-mobile-dark.png')]:
            p.screenshot(path=str(R/'shots'/file),full_page=True,animations='disabled');report['shots'].append('shots/'+file)
        before=a.evaluate('__CALLIT__.getView()');act(a,{'type':'stack','slot':1})
        check('wrong stack adds hidden card and retains pending discard',a.evaluate('__CALLIT__.getView().hands.p0.length')==5 and a.evaluate('__CALLIT__.getView().pendingPower.deadline')==before['pendingPower']['deadline'])
        check('penalty face remains hidden to both clients',a.evaluate('__CALLIT__.getView().hands.p0.at(-1).value===null') and b.evaluate('__CALLIT__.getView().hands.p0.at(-1).value===null'))
        a.locator('[data-card="hand:p0:0"]').click();wait(a,'__CALLIT__.getView().powerActor==="p0"');wait(b,'__CALLIT__.getView().powerActor==="p0"')
        check('stack transfers Queen and leaves original active turn',a.evaluate('__CALLIT__.getView().power==="lookSwap" && __CALLIT__.getView().active==="p1" && __CALLIT__.getView().pendingPower===null'))
        check('winner receives clear message','won the power' in a.locator('#toast').inner_text())
        check('discarder receives cancellation message','cancelled' in b.locator('#toast').inner_text())
        a.locator('[data-card="hand:p0:2"]').click();a.locator('[data-card="hand:p1:2"]').click();wait(a,'__CALLIT__.getView().phase==="reveal"');wait(b,'__CALLIT__.getView().phase==="reveal"')
        check('only stacker receives Queen pair',a.evaluate('__CALLIT__.getView().peek.cards.length')==2 and b.evaluate('__CALLIT__.getView().peek===null'))
        check('nonacting client gets no private faces',b.evaluate('__CALLIT__.getView().hands.p0.every(c=>c.value===null)&&__CALLIT__.getView().hands.p1.every(c=>c.value===null)'))
        a.get_by_role('button',name='Keep them',exact=True).click();wait(a,'__CALLIT__.getView().phase==="turn"')
        check('power completion advances only original turn once',a.evaluate('__CALLIT__.getView().active==="p0"&&__CALLIT__.getView().turn===1'))
        check('stack unavailable after power window',not a.evaluate('__CALLIT__.getView().stackAllowed'))
        # Exercise URL-only celebration replay after the rule statechart changed.
        demo=ca.new_page();demo.on('pageerror',lambda e:report['errors'].append(str(e)));demo.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None);demo.goto(BASE+'/?demo=celebrate');wait(demo,'document.body.dataset.celebrationReady==="true"');check('celebration demo still resolves genuine match')
        check('no horizontal overflow',a.evaluate('document.documentElement.scrollWidth<=innerWidth') and b.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        check('zero page errors',not report['errors']);check('zero console errors',not report['consoleErrors']);report['passed']=True
        browser.close()
except Exception as e:
    report['failure']=str(e);report['traceback']=traceback.format_exc();raise
finally:
    server.terminate();server.wait(timeout=5);(R/'tests/evidence/stack-browser-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
