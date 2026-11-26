# Problem 2 research notes

Read the shared brief completely. Analysis only; no product build, purchases, installs, GUI changes, or writes outside the two assigned report paths. Required skills read: Emil emil-design-eng, animate, choreograph, apple-design; dickwu Apple SKILL and HIG accessibility, layout, typography, color, designing-for-ios, designing-for-games, game-controls, motion, playing-audio, feedback and cross-platform; build-principles; poteto-agent-code-quality; deep-research; workflow-composer; Durable Objects and core rules; workers-best-practices; webdev and game setup; game-asset-catalog; persistent-computing and Cloud Computer/Reserved references; Socratic tutor.

Initial product thesis: a CABO-family memory-and-bluff game under an original working title, with an original pixel arcade identity and strong private-state networking, not Nintendo imagery. Prioritize invite/join/play/call/reveal/rematch plus honest solo bot. Use DOM for readable cards; no Three.js scene without a material need. Raw rules and full multiplayer transport need live verification.

Sources opened so far:
- https://www.inspora.design/ — text confirms restrained archive navigation, category filters, latest/featured selector, visual posts with creator attribution, sparse sponsor markers. Motion/hover visually unverified at this point; extraction is not a browser interaction.

Important platform distinction: Client Game setup now uses Godot for 2D and Three.js for 3D, and online Game workflow requires Cloud Computer selection before init. Client WebDev Reserved can sustain a single Node WebSocket process but must communicate usage-based pricing. Do not silently relabel a game as a website to evade its setup contract; parent should choose approved route explicitly. No parent-only browser/workflow tools are available in this delegated analysis, so cannot claim visual browser testing or extra subagents.

## Verified source findings

### CABO rules reconciliation
- Official original publisher English PDF opened: http://www.smiling-monster.de/spiele/smg007/download/SMG-Cabo-EN.pdf . Original rules: 2–5 players; discard-taken cards go face down; failed match exposes cards then returns them and discards attempted replacement, loses turn; caller beaten +5; lowest noncaller scores0; unlimited exact100->50; reshuffle discard when deck empty.
- Official second-edition PDF opened, mirrored with Bezier Games footer and 'CABO online rules 2-4-19': https://board-game-rules.com/wp-content/uploads/2025/01/cabo_Official-Rules.pdf . Four cards in fixed line, choose any2 to see initially, clockwise. Draw from deck privately then discard or exchange one/multiple matching own cards; deck-taken replacement facedown. Top discard must exchange and remains faceup. 7/8 own peek,9/10 opponent spy,11/12 one own/opponent swap without changing orientation, only if deck drawn and discarded same turn. Failed multi exchange returns selected cards faceup and adds drawn card;3+ fail adds additional unseen facedown card. Call instead of draw consumes turn; all OTHER players one more turn; caller remains targetable. Round also ends on draw deck depletion, unlike original. Only successful caller <=minimum scores0; failed caller sum+10; noncallers always their sum. Exact two12,two13 ONLY = Kamikaze0, everybodyelse50. Exact100->50 only once/player/game; >100 ends; lowest cumulative wins, tie last-round score. Subsequent start player lowest previous-round score, tie closest to previous starter.
- Deluxe official PDF copy (poor OCR but scoring legible): https://www.spelhuis.be/Files/7/112000/112353/Attachments/Product/h4CLZ4qF10u79561q91aD67G1N4u71E9.pdf confirms caller-only zero, +10, once reset, >100.
- Publisher page https://beziergames.com/pages/cabo explicitly offers expert all face-down and 'Play just4 rounds instead of playing to100'.
- Independent https://whatsericplaying.com/2019/03/25/cabo/ confirms second-edition actions, matching penalty, faceup discard replacements, caller-only zero,+10,Kamikaze,once100reset,>100. Review says2–4,30–45min.
- Independent https://cardrulesplus.com/games/cabo/ contemporary updated2026-11-01 confirms all above; its history erroneously attributes2010 first publisher to Bezier and later-starter text says cumulative rather than last-round; DO NOT adopt those inaccuracies. States52 cards0–13 but not distribution.
- Independent https://treyhunner.com/2015/06/cabo-card-game/ describes explicitly DIFFERENT52standarddeck folk variant: diamond king0, otherkings13, cross-table matching, any2table swap, no caller penalty. Historical trademark/copyright ownership claim credited to Eventide; not a live registration verification.
- https://cambiocardgame.com/cabo-card-game-rules/ updatedOct2026 mixes first/second edition: wrongly gives every lowest player0; claims optional caller immunity; reject in favor of PDF.
- https://cabo-online.com/rules is DIFFERENT4–8player standarddeck variant: hearts king-1,otherkings spy&swap, snap anyturn, caller<=5+immunity. Steal room model, not rules. Incomplete scoring sections.

### IP
- https://www.copyright.gov/register/tx-games.html opened: game idea/method/name not protected by copyright; literary rules text/art canbe copyrighted. This does NOT mean names lack trademark risk.
- https://www.uspto.gov/trademarks/search opened: federal database and comprehensive-clearance guidance. CABO live register status and original working name clearance NOT verified. Recommend original brand/title/art/rules prose, descriptive CABO-family attribution only, no official scanned art, no unicorn/official composition or Nintendo imagery/music/fonts. Attribution/disclaimer isn't permission.
- https://beziergames.com/blogs/news/cabo-deluxe publisher states obtained rights and explains secondedition changes; no need to repeat box/art.

### Inspora detailed public-source inspection
https://www.inspora.design/ opened via fetch and system-trust curl; CSS and application JS inspected in bounded read-only batch, no graphical browser available to subagent. CSS source https://www.inspora.design/_next/static/chunks/3hwi-aty1g228.css?dpl=dpl_6YtwbzWBQkiUMkqhTodHeNBMpKT6 . Public source observations, not claimed subjective visual testing:
- Body Inter variable100–900; white #fff archive, neutral #262626 active text,#767676 inactive. Max archive1705px, padding clamp16..45px. Sticky white header, logo left, balanced center navigation and right contact/overflow; category tabs horizontallyscroll on compact.
- Copy/nav14–16px; control13–14px; navheight32–34px; controlheight39–41px; card gap12–15px; feedgap14–18; headergap24–32.
- Responsive masonry1column then2 at460px,3at760,4at1120. Mixed portrait/landscape visual previews, minimal framing and small creator attribution; archive feels designed via consistent quiet chrome and artwork-led hierarchy rather than big generic hero.
- Category color transitions150ms; sort popover origin-top-right,scale.97/translateY-4px ->1/0,opacity150ms,cubic-bezier(.2,.8,.2,1); focus-ring2px #111 offset3px.
- app chunk30_54run7izxm.js GSAP reveal y14px scale.985->1,duration.55s,stagger.035,easepower3.out; reducedmotion guard. Do NOT clone uniform stagger into frequent gameUI.
- client JS0mg-nfddqa4na.js prefetches postdetail onpointerenter/focus/touch; infinite-feed sentinel IntersectionObserver rootMargin400px threshold.01.
- chunk0cko9kke0eul9.js includes video viewport visibility/play/pause on document.hidden, poster retention; details WAAPI media scale.95->1 and contenttranslateX28px with700ms,strong easeout,40ms overlap; fallback220msfade. Do not copy700ms into gameplay.
- Sponsor CSS linear marquee pauses onhover/focus, removes loop underreducedmotion. Reject sponsor/idle loop for game table. No verified evidence of scrolljacking or parallax.
- Translate hierarchy to compact lobby: live table preview as hero, bigstartbutton,joinfield,quiet rules; table stable spatial seats/centraldraw-discard, sparse context HUD. Motioncausality not motion density.

### Libraries and landscape
- https://gsap.com/docs/v3/Plugins/Flip/ opened: Flip.getState ->DOMcommit ->Flip.from ; use scale:true toavoidwidth/height animation; stabledata-flip-id. Caveats cannotaccommodate3Dtransform so separateouterFLIPwrapper frominnerrotateY; getState may force activeflipcompletion, need deliberate snapshotinterrupt handler.
- https://gsap.com/docs/v3/GSAP/gsap.timeline%28%29/ opened: timeline labels/positionoverlap/defaults/kill/pause/progress; no stateprogressionin animationcallbacks.
- https://gsap.com/resources/React/ opened: useGSAP @gsap/react contextcleanup; contextSafe for later eventhandlers,revertOnUpdate asappropriate. Don'tfollow staleCRA suggestion.
- https://threejs.org/manual/en/post-processing.html opened: EffectComposer RenderPass ShaderPass OutputPass require extra render targets/resize. CannotpostprocessDOM directly. Reject Three.js for readable cards; CSS stationaryscanline onlybelowtext cheaper;WebGLdecorativedisableonlowpower/contextloss.
- https://github.com/websockets/ws opened: MIT, native browserWebSocket,serverws,authonHTTPupgrade, heartbeatping/pong,permessage-deflatedisabledserverdefault(expensive).
- https://docs.colyseus.io/state/view opened: entirestatevisiblebydefault; currentStateView replacesexperimentalfilterdecorators since.16; .view taggedfields,perclientview plus.add/.remove. Robust but defaults dangerous; explicitfilteredJSON easieraudit for4players.
- https://raw.githubusercontent.com/boardgameio/boardgame.io/main/docs/documentation/secret-state.md opened: playerView returns strippedG,client:false secretmoves. Default docs hashroute didnot resolve actualchapter; rawsource did.
- https://playingcards.io/ opened: private roomcode,allmovessynclive,buthumansenforcerulesandturns. Stealfastinvite,avoidtrustingclients.
- https://boardgamearena.com/ opened: browserreal-time/turnbased,tutorialmove; accountstart. Do notcopyaccounts/catalog/ranking. No visualbrowserobservationclaimed.

### Critical live hosting fact
- https://docs.partykit.io/ and https://docs.partykit.io/guides/migrate-to-partyserver/ opened. HostedPartyKitshutdown23Oct2026;newprojects/previewsstop9Oct,deploystop16Oct. Today25Nov: DO NOTrecommendnpxpartykitdeploy or*.partykit.dev. SuccessorPartyServer plainWorker+DOinownCloudflareaccount;wranglerdeploy,partysocket compatible. Critical maxeffortliveverificationfinding.
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/ opened: acceptWebSocket+webSocketMessage/Close,healthyconnectionsstayattachedonhibernate,constructorreruns,serializeAttachment/deserializestoreseat/socketepoch only16KiBmax;notdurablebeyondconnection. CriticalstateSQLite. setTimeout/setIntervalpreventhibernation;alarmsdurabledeadlineone/DO;autoping/pongdoesnotwake.
- https://developers.cloudflare.com/durable-objects/platform/pricing/ opened,modified2026-11-13: SQLiteDOavailableWorkersFree;requests100000/day,duration13000GBs/day,rowsread5m/day,rowswritten100k/day,5GBtotal. Limitsfailoperations,resets00UTC;notunlimitedfree. PaidWorkersminimum5/mo;canavoidpurchaseatdemotraffic.
- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ opened: compatibilitydatecurrent,generatetypeswrangler,bindingssecrets,noasyncfloating,noglobalrequeststate,structuredobservabilityandprivatesourcemaps.
- about:blank opened: StudioGameDevtemplates,publishwebsite;multiplayerConfigure->Multiplayer->SelectCloudComputer->Buyone. Localinstalledskillcurrent2DGodo/3DThreejs;CloudComputerselectionbeforeonlineinit.
- Localpersistent-computingreferences Reserved:1vCPU512MBsingleprocess24/7,costusageCPU30/vCPUmoRAM15/GBmo(fullceiling37.50/mo)minus10monthlycredits+egress. Defaultautoscale5podsinmemoryroomsnot safe. CloudComputerBasic10/mo2vCPU1GB35GB200GBout,0.5xcompute;needTLSproxyandserviceautorestart,paidchoiceonly. No purchasesauthorized.
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices opened: originalsoundOscillatorNode/noisesamples;AudioContextcreate/resumeinusergesture;mute/volumecontrol,AudioParamschedule. BrowsercannotpromiseiPhonehardwareSilentswitchintegration.

## Final synthesis decisions — 2026-11-25

Finished report: `/workspace/analysis/p2-multiplayer-cabo.md` (approximately 3,470 words). Seven build slices total 165 minutes; first three total 90. Allow 165–210 for complete published demo depending on hosting readiness.

Canonical shipped profile is **2019 Bezier hand rules + disclosed Arcade Four session house rules**, not exact standard-edition parity. Keep Peek 7/8, Spy 9/10, Swap 11/12, face-up discard replacements, matching/failure penalty, caller-only zero or +10, caller vulnerability, deck exhaustion and Kamikaze. Play four hands and remove the standard once-only exact-100 reset. Reject snap, negative kings, caller immunity, reshuffle and mixed folk variants. The exact 52-card distribution is explicitly a frozen implementation manifest because the opened 2019 rule sheet does not enumerate multiplicities.

Primary recommendation is custom DOM/React/GSAP + same-origin Cloudflare Worker/SQLite Durable Object **only after explicit hosting/engine choice and deploy access**. Managed Client Game is the integrated alternative with current Godot-2D/Three.js-3D engine rules and saved Cloud Computer selection. Do not silently initialize a DOM web project as an engine Game or buy a VM. Hosted PartyKit is unavailable; PartyServer is the supported successor option.

No product was built, packages installed, GUI actions performed, or deployment/purchase made. Inspora source inspection is not visual playback; the report states this limit. Copyright/trademark guidance was opened; no CABO or CABO clearance is claimed. All original art/audio remains binding; catalog artwork reuse is not recommended under that restriction.

Final differentiator: Reveal Receipt, a six-second post-hand replay of the decisive blind swap with caller totals before/after, released only after resolution and without revealing the undrawn deck.
