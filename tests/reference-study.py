from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root = Path(__file__).resolve().parents[1]
records = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':1000}, device_scale_factor=1)
    for slug,url in [('inspora','https://www.inspora.design/websites'),('superlist','https://www.superlist.com/')]:
        try:
            page.goto(url, wait_until='domcontentloaded', timeout=20000)
            page.wait_for_timeout(1500)
            page.screenshot(path=str(root/'shots'/f'reference-{slug}.png'))
            records.append({'url':url,'title':page.title(),'screenshot':f'shots/reference-{slug}.png','headings':page.locator('h1,h2').all_text_contents()[:12]})
        except Exception as e:
            records.append({'url':url,'error':str(e)})
    browser.close()
(root/'tests/evidence/reference-study.json').write_text(json.dumps(records,indent=2))
print(json.dumps(records,indent=2))
