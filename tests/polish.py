from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess,time,json,os,urllib.request,traceback
ROOT=Path(__file__).resolve().parents[1];BASE='http://127.0.0.1:5812'
report={'checks':[],'errors':[],'shots':[]}
server=subprocess.Popen(['node','server.mjs'],cwd=ROOT,env=os.environ|{'HOST':'127.0.0.1','PORT':'5812'},stdout=open(ROOT/'tests/evidence/polish-server.log','w'),stderr=subprocess.STDOUT)
def wait(page,js):
    until=time.monotonic()+15
    while time.monotonic()<until:
        v=page.evaluate(js)
        if v:return v
        page.wait_for_timeout(40)
    raise AssertionError('Timed out: '+js)
def check(name,value=True):
    assert value,name
    report['checks'].append(name)
def shot(page,name):
    if os.environ.get('NO_SHOTS')=='1':return
    page.screenshot(path=str(ROOT/'shots'/name),full_page=True,animations='disabled');report['shots'].append(name)
def setup(page,seed):
    page.evaluate(f'__CALLIT__.startSolo({seed})');page.locator('[data-card="hand:p0:0"]').click();page.wait_for_timeout(800);page.locator('[data-card="hand:p0:1"]').click();page.get_by_role('button',name='Hide cards · ready →').click();wait(page,'__CALLIT__.getView().phase==="turn" && __CALLIT__.getView().active==="p0"')
try:
    for _ in range(100):
        try:urllib.request.urlopen(BASE+'/health');break
        except Exception:time.sleep(.1)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=2)
        page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
        for width in ([] if os.environ.get('ACTIONS_ONLY')=='1' else [390,820,1440]):
            for theme in ['light','dark']:
                print('Final layout',width,theme,flush=True)
                page.set_viewport_size({'width':width,'height':844 if width==390 else 1000});page.emulate_media(color_scheme=theme,reduced_motion='no-preference');page.goto(BASE+'/?test=1');wait(page,'!!window.__CALLIT__');page.evaluate('document.fonts.ready');page.mouse.move(1,1)
                check(f'final {width}/{theme} lobby no horizontal clipping',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                check(f'final {width}/{theme} Quick label fits',page.evaluate('''()=>{let e=document.querySelector('#mode'),s=getComputedStyle(e),c=document.createElement('canvas').getContext('2d');c.font=s.font;return c.measureText(e.options[e.selectedIndex].text).width <= e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-8}'''))
                shot(page,f'restyle-lobby-{width}-{theme}.png')
                page.evaluate('__CALLIT__.startSolo(77)');page.locator('[data-card="hand:p0:0"]').click();page.wait_for_timeout(800);page.locator('[data-card="hand:p0:1"]').click();page.wait_for_timeout(300)
                check(f'final {width}/{theme} card labels fit',page.evaluate('''()=>[...document.querySelectorAll('.slot-label')].every(e=>e.scrollWidth<=e.clientWidth+1)'''))
                check(f'final {width}/{theme} table no horizontal clipping',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                shot(page,f'restyle-table-{width}-{theme}.png')
        page.goto(BASE+'/?test=1');wait(page,'!!window.__CALLIT__');page.emulate_media(color_scheme='light');page.locator('#create').hover();page.wait_for_timeout(250)
        check('Hub hover dims only the competing lobby action',page.locator('#solo').evaluate('(e)=>Number(getComputedStyle(e).opacity)')<.5 and page.locator('#create').evaluate('(e)=>Number(getComputedStyle(e).opacity)')==1)
        check('Hub word highlight reveals on hover',page.locator('#create .button-word').evaluate('(e)=>getComputedStyle(e,"::after").transform')!='matrix(0, 0, 0, 1, 0, 0)')
        check('primary lobby targets are at least 56px high',page.locator('#solo').bounding_box()['height']>=56 and page.locator('#create').bounding_box()['height']>=56)
        shot(page,'restyle-hub-hover.png')
        seeds=page.evaluate('''async()=>{const {createGame}=await import('/engine.mjs');let result={};for(let seed=1;seed<1000;seed++){let s=createGame({seed});if(s.active!=='p0')continue;let rank=s.deck.at(-1).rank;if(['7','8','9','10','J','Q'].includes(rank)&&!result[rank])result[rank]=seed;if(!result.penalty&&s.hands.p0[0].value!==s.hands.p0[1].value)result.penalty=seed;if(['7','8','9','10','J','Q','penalty'].every(r=>result[r]))break;}return result}''')
        report['seeds']=seeds
        for rank in ['7','8','9','10']:
            page.goto(BASE+'/?test=1');wait(page,'!!window.__CALLIT__');setup(page,seeds[rank]);before=page.evaluate('__CALLIT__.getView().version')
            page.keyboard.press('t');page.wait_for_timeout(50);check(rank+' old T discard-draw shortcut does nothing',page.evaluate('__CALLIT__.getView().version')==before)
            page.get_by_role('button',name='Draw a card',exact=True).click()
            label='Discard: Peek own' if rank in ['7','8'] else 'Discard: Peek other'
            check(rank+' has one automatic named discard',page.get_by_role('button',name=label,exact=True).count()==1 and page.get_by_role('button',name='Discard draw',exact=True).count()==0)
            page.keyboard.press('x');check(rank+' X discard automatically enters power',page.evaluate('__CALLIT__.getView().phase')=='power')
            target='p0' if rank in ['7','8'] else 'p1';page.locator(f'[data-card="hand:{target}:2"]').click();check(rank+' exposes only chosen private peek',page.evaluate('__CALLIT__.getView().peek.cards.length')==1)
            page.get_by_role('button',name='Hide card →',exact=True).click();check(rank+' explicit hide clears private peek',page.evaluate('__CALLIT__.getView().peek') is None)
        for rank in ['Q','J']:
            page.goto(BASE+'/?test=1');wait(page,'!!window.__CALLIT__');setup(page,seeds[rank]);page.get_by_role('button',name='Draw a card',exact=True).click()
            check(rank+' has one named Discard action and no optional activation',page.get_by_role('button',name='Discard: Look + swap?' if rank=='Q' else 'Discard: Blind swap',exact=True).count()==1 and page.get_by_role('button',name='Discard draw',exact=True).count()==0)
            page.get_by_role('button',name='Discard: Look + swap?' if rank=='Q' else 'Discard: Blind swap',exact=True).click()
            check(rank+' discard automatically starts power',page.evaluate('__CALLIT__.getView().phase')=='power')
            if rank=='J':
                check('Jack mandatory UI has no skip',page.get_by_role('button',name='Skip ability').count()==0);shot(page,'restyle-jack-mandatory.png')
            page.locator('[data-card="hand:p0:0"]').click();page.locator('[data-card="hand:p1:0"]').click()
            if rank=='Q':
                check('Queen reveals exactly the selected own and opponent pair',page.evaluate('__CALLIT__.getView().peek.cards.length===2'))
                check('Queen has both explicit decisions',page.get_by_role('button',name='Swap these cards').count()==1 and page.get_by_role('button',name='Keep them').count()==1)
                before=page.evaluate('__CALLIT__.getView().peek.cards');shot(page,'restyle-queen-private-choice.png');page.get_by_role('button',name='Keep them',exact=True).click();check('Queen decline ends the turn without a swap event',page.evaluate('__CALLIT__.getView().lastEvent.type')=='keep')
            else:check('Jack selection immediately swaps with no reveal stage',page.evaluate('__CALLIT__.getView().lastEvent.type')=='swap')
        page.set_viewport_size({'width':390,'height':844});page.goto(BASE+'/?test=1');wait(page,'!!window.__CALLIT__');setup(page,4)
        wait(page,'__CALLIT__.getView().stackAllowed');before=page.evaluate('__CALLIT__.getView()')
        check('deterministic stack opportunity is visibly labelled',page.locator('#turn-tag').inner_text()=='STACK' and page.get_by_role('button',name='Stack this card: Your card 1, Face down',exact=True).count()==1)
        check('stack affordance does not expose hidden own rank/suit/value',all(c.get('rank') is None and c.get('suit') is None and c['value'] is None for c in before['hands']['p0']))
        page.locator('[data-card="hand:p0:0"]').click();check('stack miss shows only short generic message',page.locator('#toast').inner_text()=='Not a match.')
        check('stack miss leaves view and version unchanged',page.evaluate('__CALLIT__.getView()')==before)
        page.locator('#instruction').click();page.keyboard.press('Digit2');after=page.evaluate('__CALLIT__.getView()')
        check('numbered keyboard slot stacks successfully and leaves a hole',len(after['hands']['p0'])==3 and all(c['slot']!=1 for c in after['hands']['p0']))
        check('successful stack gives brief confirmation',page.locator('#toast').inner_text()=='Stacked. One fewer card.')
        check('stacked Queen is public but does not trigger power or steal turn',after['discard']['rank']=='Q' and after['phase']=='turn' and after['power'] is None and after['turn']==before['turn'] and after['active']==before['active'])
        page.set_viewport_size({'width':390,'height':844});page.emulate_media(color_scheme='dark',reduced_motion='reduce');page.goto(BASE+'/?test=1');wait(page,'!!window.__CALLIT__');setup(page,seeds['penalty'])
        page.get_by_role('button',name='Draw a card',exact=True).click();page.get_by_role('button',name='Match several',exact=True).click()
        check('multi-card selection has one primary action',page.locator('#actions .primary').count()==1)
        for i in range(3):page.locator(f'[data-card="hand:p0:{i}"]').click()
        page.get_by_role('button',name='Exchange 3',exact=True).click()
        check('failed three-card match creates six-card hand',page.evaluate('__CALLIT__.getView().hands.p0.length')==6)
        check('wide hand scrolls without shrinking cards',page.locator('#self-hand').evaluate('(e)=>e.scrollWidth>e.clientWidth') and page.locator('#self-hand .card-slot').first.bounding_box()['width']>=56)
        check('wide hand does not overflow page',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        page.locator('#self-hand').evaluate('(e)=>e.scrollLeft=e.scrollWidth');shot(page,'restyle-penalty-hand-mobile.png')
        check('reduced motion has no running card animations',page.evaluate('__CALLIT__.scene.animations.size')==0)
        check('all visible mobile buttons meet 52px minimum',page.evaluate('''()=>[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=52)'''))
        page.get_by_role('button',name='How to play',exact=True).click();rules=page.locator('#rules').inner_text()
        check('how-to matches deck-only draw and automatic powers','deck only' in rules and 'automatically starts its power' in rules and 'triggering is optional' not in rules and 'public discard replacements' not in rules.lower())
        check('how-to includes stack and assumptions','Stack:' in rules and 'Stacked powers do not trigger' in rules and 'no penalty' in rules)
        page.keyboard.press('Escape')
        check('no page errors',not report['errors']);report['passed']=True
        browser.close()
except Exception as e:
    report['failure']=str(e);report['traceback']=traceback.format_exc();raise
finally:
    server.terminate();server.wait(timeout=5)
    name='rules-polish-actions-report.json' if os.environ.get('ACTIONS_ONLY')=='1' else 'polish-report.json'
    (ROOT/'tests/evidence'/name).write_text(json.dumps(report,indent=2));print(json.dumps({'passed':report.get('passed',False),'checks':len(report['checks']),'failure':report.get('failure')},indent=2),flush=True)
