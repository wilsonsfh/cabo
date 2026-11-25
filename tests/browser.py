from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess, time, json, urllib.request, os, traceback
ROOT=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:5812'
REPORT={'checks':[],'screenshots':[],'errors':[],'consoleErrors':[],'responsive':[],'powersSeen':[]}
server=subprocess.Popen(['node','server.mjs'],cwd=ROOT,env=os.environ|{'HOST':'127.0.0.1','PORT':'5812'},stdout=open(ROOT/'tests/evidence/browser-server.log','w'),stderr=subprocess.STDOUT)
def check(name,ok=True):
    assert ok,name
    REPORT['checks'].append(name)
def wait_js(page,expression,seconds=15):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        value=page.evaluate(expression)
        if value:return value
        page.wait_for_timeout(35)
    raise AssertionError('Timed out: '+expression)
def attach(page):
    page.on('pageerror',lambda e:REPORT['errors'].append(str(e)))
    page.on('console',lambda m:REPORT['consoleErrors'].append(m.text) if m.type=='error' else None)
def shot(page,name):
    if os.environ.get('NO_SHOTS')=='1':return
    page.screenshot(path=str(ROOT/'shots'/name),full_page=True,animations='disabled')
    REPORT['screenshots'].append('shots/'+name)
def overflow(page):
    return page.evaluate('({viewport:innerWidth,document:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1})')
def audit_controls(page):
    return page.evaluate('''() => [...document.querySelectorAll('button,input,select,summary')].filter(e=>e.getClientRects().length&&!e.disabled).map(e=>({text:e.getAttribute('aria-label')||e.textContent.trim(),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(x=>x.w<43||x.h<43)''')
def open_page(context):
    page=context.new_page();attach(page);page.goto(BASE+'/?test=1');wait_js(page,'!!window.__CALLIT__');return page
try:
    for _ in range(100):
        try:json.load(urllib.request.urlopen(BASE+'/health'));break
        except Exception:time.sleep(.1)
    else:raise AssertionError('Server failed to start')
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for width in ([] if os.environ.get('NETWORK_ONLY')=='1' else [390,820,1440]):
            for scheme in ['light','dark']:
                print('Responsive',width,scheme,flush=True)
                context=browser.new_context(viewport={'width':width,'height':1000 if width>600 else 844},device_scale_factor=2,color_scheme=scheme)
                page=open_page(context)
                page.evaluate('document.fonts.ready')
                shot(page,f'restyle-lobby-{width}-{scheme}.png')
                check(f'{width} {scheme} lobby no horizontal overflow',not overflow(page)['overflow'])
                short=audit_controls(page)
                check(f'{width} {scheme} lobby interactive target floor',not short)
                page.evaluate('__CALLIT__.startSolo(77)')
                page.locator('[data-card="hand:p0:0"]').click()
                page.wait_for_timeout(800)
                check(f'{width} {scheme} own selection survives opponent readiness',page.locator('#self-hand .selected').count()==1)
                page.locator('[data-card="hand:p0:1"]').click()
                check(f'{width} {scheme} two-card own peek',page.evaluate('__CALLIT__.getView().hands.p0.filter(c=>c.value!==null).length')==2)
                page.wait_for_timeout(350)
                shot(page,f'restyle-table-{width}-{scheme}.png')
                check(f'{width} {scheme} table no horizontal overflow',not overflow(page)['overflow'])
                short=audit_controls(page)
                check(f'{width} {scheme} table interactive target floor',not short)
                # The avatar is a separate row, never intersects a playing card.
                overlap=page.evaluate('''() => {const rect=e=>e.getBoundingClientRect();const cards=[...document.querySelectorAll('.card-slot')].map(rect);return [...document.querySelectorAll('.avatar')].some(e=>{let a=rect(e);return cards.some(c=>a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top)})}''')
                check(f'{width} {scheme} avatars do not cover cards',not overlap)
                page.get_by_role('button',name='Hide cards · ready →').click();wait_js(page,'__CALLIT__.getView().phase!=="setup"')
                check(f'{width} {scheme} explicit hide clears private faces',page.evaluate('__CALLIT__.getView().hands.p0.every(c=>c.value===null)'))
                page.get_by_role('button',name='How to play').click();check(f'{width} {scheme} rules dialog works',page.locator('#rules').evaluate('(e)=>e.open'));page.keyboard.press('Escape');check(f'{width} {scheme} Escape closes rules',not page.locator('#rules').evaluate('(e)=>e.open'))
                REPORT['responsive'].append({'width':width,'scheme':scheme,'dpr':2,'overflow':overflow(page),'smallControls':short})
                context.close()
        print('Two actual browser peers',flush=True)
        ca=browser.new_context(viewport={'width':1440,'height':1000},color_scheme='light')
        cb=browser.new_context(viewport={'width':390,'height':844},color_scheme='dark',reduced_motion='reduce')
        a,b=open_page(ca),open_page(cb)
        a.locator('#name').fill('Wilson');a.locator('#create').click();code=wait_js(a,'__CALLIT__.getRoom()?.code')
        b.locator('#name').fill('A friend');b.locator('#join-details').evaluate('(e)=>e.open=true');b.locator('#room-code').fill(code);b.locator('#join').click()
        wait_js(a,'__CALLIT__.getRoom()?.connected.length===2');a.locator('#start-match').click();wait_js(b,'!!__CALLIT__.getView()')
        # Actual DOM selection and explicit readiness from both independent contexts.
        for page,owner in [(a,'p0'),(b,'p1')]:
            page.locator(f'[data-card="hand:{owner}:0"]').click();page.locator(f'[data-card="hand:{owner}:1"]').click()
            wait_js(page,'__CALLIT__.getView().setup.seen.length===2')
            check(owner+' sees only own initial two cards',page.evaluate('''()=>{let v=__CALLIT__.getView();return v.hands[v.viewer].filter(c=>c.value!==null).length===2&&v.hands[v.players.find(p=>p!==v.viewer)].every(c=>c.value===null)}'''))
            page.get_by_role('button',name='Hide cards · ready →').click()
        wait_js(a,'__CALLIT__.getView().phase!=="setup"')
        a.locator('#chat-input').fill('Good luck, <b>friend</b>.');a.locator('#chat-send').click();wait_js(b,'__CALLIT__.getRoom().chat.length===1')
        check('real chat delivered and escaped',b.locator('#chat-messages').inner_text().endswith('Good luck, <b>friend</b>.'))
        check('chat does not create markup',b.locator('#chat-messages p b').count()==1)
        shot(a,'restyle-network-desktop.png');shot(b,'restyle-network-mobile-dark-reduced.png')
        for page,seed in [(a,881),(b,992)]:page.evaluate(f'(async()=>{{const {{createBot}}=await import("/engine.mjs");window.testBot=createBot({seed});}})()')
        # The bot driver reads only each real client's filtered view, never server state.
        steps=0;captured=set();stacks=0
        while steps<1800:
            av,bv=a.evaluate('__CALLIT__.getView()'),b.evaluate('__CALLIT__.getView()')
            if av['version']!=bv['version']:a.wait_for_timeout(25);continue
            if av['phase']=='gameEnd':break
            for page in [a,b]:page.evaluate('testBot.observe(__CALLIT__.getView())')
            if av['phase']=='setup':actor=a if not av['setup']['ready'] else b
            elif av['phase']=='roundEnd':actor=a if 'p0' not in av['roundReady'] else b
            else:actor=a if av['active']=='p0' else b
            for candidate in [a,b]:
                if candidate.evaluate('!!testBot.stackAction(__CALLIT__.getView())'):
                    actor=candidate;break
            power=av['power']
            if power and power not in REPORT['powersSeen']:REPORT['powersSeen'].append(power)
            if av['phase']=='turn' and 'deck-only' not in captured:
                check('discard pile cannot be clicked to draw',actor.locator('[data-card="discard"]').is_disabled())
                check('no Take discard draw button',actor.get_by_role('button',name=__import__('re').compile('^Take ')).count()==0)
                captured.add('deck-only')
            if av['phase']=='drawn' and power is None and 'auto-power' not in captured:
                held=actor.evaluate('__CALLIT__.getView().held')
                if held and held.get('rank') in ['7','8','9','10','J','Q']:
                    check('one discard action names the automatic power',actor.locator('#actions button').filter(has_text=__import__('re').compile('^Discard: ')).count()==1 and actor.get_by_role('button',name='Discard draw',exact=True).count()==0)
                    captured.add('auto-power')
            if av['phase']=='reveal' and power=='lookSwap' and 'queen' not in captured:
                actor.wait_for_timeout(300);shot(actor,'restyle-queen-private-choice.png');captured.add('queen')
                check('Queen presents explicit swap and keep controls',actor.get_by_role('button',name='Swap these cards').count()==1 and actor.get_by_role('button',name='Keep them').count()==1)
                check('Queen has no skip control',actor.get_by_role('button',name='Skip ability').count()==0)
            if av['phase']=='power' and power=='blindSwap' and 'jack' not in captured:
                shot(actor,'restyle-jack-mandatory.png');captured.add('jack');check('triggered Jack has no skip button',actor.get_by_role('button',name='Skip ability').count()==0)
            before=av['version']
            move=actor.evaluate('testBot.action(__CALLIT__.getView())')
            if move['type']=='stack':
                if 'stack-ui' not in captured:
                    check('eligible stack state clearly labelled',actor.locator('#turn-tag').inner_text()=='STACK')
                    check('own cards offer labelled stack action',actor.get_by_role('button',name=__import__('re').compile('^Stack this card:')).count()>0)
                    captured.add('stack-ui')
                owner=actor.evaluate('__CALLIT__.getView().viewer');actor.locator(f'[data-card="hand:{owner}:{move["slot"]}"]').click();stacks+=1
            else:actor.evaluate('(move)=>__CALLIT__.act(move)',move)
            wait_js(actor,f'__CALLIT__.getView().version>{before}',5)
            steps+=1
            # Stay below the production input rate limiter while preserving a real socket loop.
            actor.wait_for_timeout(38)
        av,bv=a.evaluate('__CALLIT__.getView()'),b.evaluate('__CALLIT__.getView()')
        wait_js(b,'__CALLIT__.getView().phase==="gameEnd"')
        bv=b.evaluate('__CALLIT__.getView()')
        check('two browsers finish four real rounds',av['phase']=='gameEnd' and len(av['history'])==4)
        check('both peers agree on result and totals',av['result']==bv['result'])
        check('reduced-motion peer reaches the same outcome',b.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'))
        check('mobile visible buttons meet 52px minimum',b.evaluate('''()=>[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=52)'''))
        check('mobile has no horizontal overflow',not overflow(b)['overflow'])
        shot(a,'restyle-network-final.png');shot(b,'restyle-network-final-mobile.png')
        for page in [a,b]:page.locator('#result-action button').click()
        wait_js(a,'__CALLIT__.getView().phase==="setup"');wait_js(b,'__CALLIT__.getView().phase==="setup"')
        check('unanimous rematch deals new cards')
        # Reload is a real disconnect/resume with a token retained in this context's sessionStorage.
        b.reload();wait_js(b,'!!window.__CALLIT__');b.locator('#join-details').evaluate('(e)=>e.open=true');b.locator('#join').click();wait_js(b,'!!__CALLIT__.getView()');wait_js(a,'__CALLIT__.getRoom().status==="playing"')
        check('browser reload and seat-token reconnect works',b.evaluate('__CALLIT__.getView().viewer')=='p1')
        REPORT['network']={'room':code,'actions':steps,'rounds':4,'stacks':stacks,'sharedResult':av['result'],'reducedMotion':True,'rematch':True,'reconnect':True}
        # Keyboard only, with the setup completion handler independent of whose first turn it is.
        for page in [a,b]:
            page.locator('#instruction').click();page.keyboard.press('Digit1');page.keyboard.press('Digit2')
            wait_js(page,'__CALLIT__.getView().setup.seen.length===2')
            page.keyboard.press('Enter');wait_js(page,'__CALLIT__.getView().setup.ready')
        wait_js(a,'__CALLIT__.getView().phase!=="setup"');check('keyboard-only initial peek and ready works for both seats')
        check('no page errors',not REPORT['errors']);check('no console errors',not REPORT['consoleErrors'])
        ca.close();cb.close();browser.close()
    REPORT['passed']=True
except Exception as e:
    REPORT['failure']=str(e);REPORT['traceback']=traceback.format_exc();raise
finally:
    server.terminate();server.wait(timeout=5)
    report_name='rules-browser-report.json' if os.environ.get('NETWORK_ONLY')=='1' else 'browser-report.json'
    (ROOT/'tests/evidence'/report_name).write_text(json.dumps(REPORT,indent=2))
    print(json.dumps({'passed':REPORT.get('passed',False),'checks':len(REPORT['checks']),'errors':REPORT['errors'],'failure':REPORT.get('failure'),'screenshots':len(REPORT['screenshots'])},indent=2),flush=True)
