from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time,traceback
ROOT=Path(__file__).resolve().parent;BASE='http://127.0.0.1:5818'
report={'checks':[],'shots':[],'errors':[],'consoleErrors':[],'externalRequests':[],'cspViolations':[],'layouts':[]}
def check(name,ok=True):
    if not ok:raise AssertionError(name)
    report['checks'].append(name)
def wait(page,js):
    end=time.monotonic()+15
    while time.monotonic()<end:
        if page.evaluate(js):return
        page.wait_for_timeout(35)
    raise AssertionError('Timed out: '+js)
def attach(page):
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None)
    page.on('request',lambda r:report['externalRequests'].append(r.url) if not r.url.startswith(BASE+'/') and not r.url.startswith('data:') else None)
    page.add_init_script("window.envCSP=[];document.addEventListener('securitypolicyviolation',e=>envCSP.push({directive:e.violatedDirective,blocked:e.blockedURI}))")
def capture(page,name,animated=False):
    page.screenshot(path=str(ROOT/'shots'/name),full_page=True,animations='allow' if animated else 'disabled');report['shots'].append(name)
def layout(page,width,theme,state):
    data=page.evaluate('''()=>{const box=e=>e.getBoundingClientRect(),cards=[...document.querySelectorAll('.card-slot')].map(box);return {width:innerWidth,scroll:document.documentElement.scrollWidth,avatarOverlap:[...document.querySelectorAll('.avatar')].some(e=>{let a=box(e);return cards.some(c=>a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top)}),environmentPointer:getComputedStyle(document.querySelector('.table-environment')).pointerEvents,environmentZ:getComputedStyle(document.querySelector('.table-environment')).zIndex,theme:document.querySelector('.table-environment').dataset.theme,mood:document.querySelector('.table-environment').dataset.mood,discardVisible:!document.querySelector('.pile.discard')||(()=>{let e=document.querySelector('.pile.discard'),b=box(e);return b.width>=50&&b.height>=65&&e.getClientRects().length>0})()}}''')
    data.update({'requestedWidth':width,'requestedTheme':theme,'state':state});report['layouts'].append(data)
    check(f'{width}/{theme}/{state}: no horizontal overflow',data['scroll']<=width+1)
    check(f'{width}/{theme}/{state}: no avatar/card overlap',not data['avatarOverlap'])
    check(f'{width}/{theme}/{state}: environment noninteractive',data['environmentPointer']=='none')
    check(f'{width}/{theme}/{state}: appearance follows system',data['theme']==theme)
    check(f'{width}/{theme}/{state}: discard unobscured',data['discardVisible'])
def setup(page):
    page.evaluate('__CALLIT__.startSolo(77)');page.locator('[data-card="hand:p0:0"]').click();page.wait_for_timeout(800);page.locator('[data-card="hand:p0:1"]').click();page.get_by_role('button',name='Hide cards · ready →').click();wait(page,'__CALLIT__.getView().phase==="turn"&&__CALLIT__.getView().active==="p0"')
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=2)
        page=context.new_page();attach(page)
        for width in [390,820,1440]:
            for theme in ['light','dark']:
                print('Environment layouts',width,theme,flush=True)
                page.set_viewport_size({'width':width,'height':844 if width==390 else 1000});page.emulate_media(color_scheme=theme,reduced_motion='no-preference')
                page.goto(BASE+'/?test=1');wait(page,'!!window.__CALLIT__');page.evaluate('document.fonts.ready');page.mouse.move(1,1);page.wait_for_timeout(250)
                layout(page,width,theme,'lobby');capture(page,f'restyle-lobby-{width}-{theme}.png')
                setup(page);page.wait_for_timeout(300);check(f'{width}/{theme}: active game has rain mood',page.locator('.table-environment').get_attribute('data-mood')=='rain')
                layout(page,width,theme,'table');capture(page,f'restyle-table-{width}-{theme}.png')
                page.evaluate('__CALLIT__.act({type:"call"})');check(f'{width}/{theme}: CABO reduces rain',page.locator('.table-environment').get_attribute('data-mood')=='tense')
                if width==1440 and theme=='light':capture(page,'environment-call-1440-light.png',True)
                wait(page,'["roundEnd","gameEnd"].includes(__CALLIT__.getView().phase)');page.wait_for_timeout(1300)
                check(f'{width}/{theme}: result clears rain',page.locator('.table-environment').get_attribute('data-mood')=='clear')
                layout(page,width,theme,'round');capture(page,f'restyle-round-{width}-{theme}.png')
                report['cspViolations']+=page.evaluate('envCSP')
        # Replay capture never requires ?test=1 or playing through a match.
        for width,theme in [(1440,'light'),(390,'dark')]:
            page.set_viewport_size({'width':width,'height':844 if width==390 else 1000});page.emulate_media(color_scheme=theme,reduced_motion='no-preference');page.goto(BASE+'/?demo=celebrate');wait(page,'document.body.dataset.celebrationReady==="true"');page.wait_for_timeout(700)
            check(f'{width}/{theme}: clean replay has particles',page.locator('.ink-celebration path').count()==26)
            layout(page,width,theme,'celebration');capture(page,f'celebration-{width}-{theme}.png',True)
            page.wait_for_timeout(3500);check(f'{width}/{theme}: celebration settles/removes particles',page.locator('.ink-celebration').count()==0)
            capture(page,f'celebration-settled-{width}-{theme}.png')
            report['cspViolations']+=page.evaluate('envCSP')
        page.emulate_media(reduced_motion='reduce');page.goto(BASE+'/?demo=celebrate');wait(page,'document.body.dataset.celebrationReady==="true"')
        check('OS reduced motion: no particles',page.locator('.ink-celebration').count()==0)
        check('OS reduced motion: no environment animations',page.locator('.table-environment').evaluate('(e)=>e.getAnimations({subtree:true}).length')==0)
        check('OS reduced motion: static sun visible',page.locator('.env-pocket .env-sun').evaluate('(e)=>getComputedStyle(e).opacity')=='1')
        check('OS reduced motion: static splash mark visible',float(page.locator('.env-pocket .env-still-splash').evaluate('(e)=>getComputedStyle(e).opacity'))>0)
        capture(page,'celebration-reduced-390-dark.png')
        # API lifecycle, visibility pause, static drawing and deterministic seeded geometry.
        page.emulate_media(reduced_motion='no-preference');page.goto(BASE+'/?test=1');wait(page,'!!window.__CALLIT__');page.set_viewport_size({'width':1440,'height':1000})
        report['envCounts']=page.evaluate('''()=>({nodes:document.querySelectorAll('.table-environment *').length,motionNodes:document.querySelectorAll('.table-environment .env-motion').length,activeAnimations:document.querySelector('.table-environment').getAnimations({subtree:true}).length})''')
        check('ambient animation count below 150',report['envCounts']['motionNodes']<=150)
        page.evaluate('''()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}''')
        check('hidden tab pauses all active ambient animations',page.locator('.table-environment').evaluate('(e)=>e.getAnimations({subtree:true}).every(a=>a.playState==="paused")'))
        page.evaluate('''()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));}''')
        check('visible tab resumes ambient animations',page.locator('.table-environment').evaluate('(e)=>e.getAnimations({subtree:true}).every(a=>a.playState==="running")'))
        page.evaluate('__CALLIT__.scene.setReduced(true)');check('user reduced motion removes environment animations',page.locator('.table-environment').evaluate('(e)=>e.getAnimations({subtree:true}).length')==0)
        page.evaluate('__CALLIT__.scene.setReduced(false)')
        life=page.evaluate('''async()=>{const {mountEnvironment}=await import('/environment.mjs');const host=document.createElement('div');document.body.append(host);const a=mountEnvironment(host,{reduced:true,theme:'dark'});let d=host.querySelector('.env-land path').getAttribute('d');a.setMood('clear');let first={theme:host.firstElementChild.dataset.theme,mood:host.firstElementChild.dataset.mood};a.destroy();let empty=host.children.length===0;const b=mountEnvironment(host,{reduced:true,theme:'light'});let same=d===host.querySelector('.env-land path').getAttribute('d');b.destroy();host.remove();return {first,empty,same}}''')
        report['lifecycle']=life;check('environment API themes/mood/destroy and deterministic shape work',life['first']=={'theme':'dark','mood':'clear'} and life['empty'] and life['same'])
        footer=page.evaluate('''async()=>{const [{cardSVG},{makeDeck}]=await Promise.all([import('/cards.mjs'),import('/engine.mjs')]);const host=document.createElement('div');host.style.setProperty('position','absolute');host.style.setProperty('left','-10000px');host.style.setProperty('width','160px');document.body.append(host);let marks=0,bad=[];for(const card of makeDeck()){host.innerHTML=cardSVG(card,{prefix:'footer-audit'});let mark=host.querySelector('.cabo-card-power');if(mark){marks++;let b=mark.getBBox();if(b.x<30||b.x+b.width>130||b.y<198||b.y+b.height>216)bad.push({rank:card.rank,suit:card.suit,box:{x:b.x,y:b.y,width:b.width,height:b.height}});}host.innerHTML=cardSVG({...card,value:null},{prefix:'hidden-audit'});if(host.querySelector('.cabo-card-power'))bad.push({hiddenRank:card.rank});}host.remove();return {marks,bad}}''')
        report['powerFooters']=footer;check('all 52 poker faces: 24 power labels and two red-K point labels clear indices',footer['marks']==26 and not footer['bad'])
        # Honest comparative rAF sample; this is software/headless Chromium, not a native-GPU benchmark.
        setup(page);page.wait_for_timeout(350)
        sample='''async()=>{const times=[];let prev;await new Promise(resolve=>{function frame(now){if(prev!==undefined)times.push(now-prev);prev=now;if(times.length<240)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});const sorted=[...times].sort((a,b)=>a-b);return {samples:times.length,meanMs:times.reduce((a,b)=>a+b,0)/times.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:Math.max(...times),over25Ms:times.filter(x=>x>25).length};}'''
        print('Comparative frame-time samples',flush=True)
        page.evaluate('__CALLIT__.scene.setReduced(true)');static=page.evaluate(sample)
        page.evaluate('__CALLIT__.scene.setReduced(false)');animated=page.evaluate(sample)
        report['frameTime']={'static':static,'animated':animated,'note':'Sandbox headless/software Chromium rAF cadence only; no native GPU or physical device measurement. Current PaperTable is DOM/WAAPI; vendored Three.js/GSAP are not loaded.'}
        report['cspViolations']+=page.evaluate('envCSP');check('no page errors',not report['errors']);check('no console errors',not report['consoleErrors']);check('no CSP violations',not report['cspViolations']);check('no external requests',not report['externalRequests'])
        context.close();browser.close();report['passed']=True
except Exception as e:
    report['failure']=str(e);report['traceback']=traceback.format_exc();raise
finally:
    (ROOT/'shots/environment-checks.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':report.get('passed',False),'checks':len(report['checks']),'failure':report.get('failure'),'errors':report['errors'],'frameTime':report.get('frameTime')},indent=2),flush=True)
