from playwright.sync_api import sync_playwright
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent
out={'errors':[],'console':[],'requests':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    page.on('pageerror',lambda e:out['errors'].append(str(e)))
    page.on('console',lambda m:out['console'].append(m.text) if m.type=='error' else None)
    page.on('request',lambda r:out['requests'].append(r.url) if not r.url.startswith('http://127.0.0.1:5818/') else None)
    page.goto('http://127.0.0.1:5818/?test=1&demo=celebrate');page.wait_for_function('document.body.dataset.celebrationReady==="true"')
    page.evaluate('document.fonts.ready');page.wait_for_timeout(500)
    page.screenshot(path=str(ROOT/'shots/environment-first-lobby.png'),full_page=True)
    page.wait_for_timeout(800)
    page.screenshot(path=str(ROOT/'shots/celebration-first.png'),full_page=True)
    print(json.dumps(out,indent=2));browser.close()
