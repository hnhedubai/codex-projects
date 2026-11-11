const nav = document.querySelector('.left-nav');
const menu = document.querySelector('#tracker-sidebar');
const shellTextFixes = [['\u00e2\u20ac\u00a6','...'],['\u00c2\u00b7',' - '],['\u00e2\u20ac\u201d',' - '],['\u00e2\u2020\u2019',' -> '],['\u00c2\u00b2','2']];
function normalizeShellText(){const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(node=>{let text=node.nodeValue;shellTextFixes.forEach(([bad,good])=>{text=text.split(bad).join(good)});if(text!==node.nodeValue)node.nodeValue=text})}
new MutationObserver(normalizeShellText).observe(document.body,{childList:true,subtree:true,characterData:true}); normalizeShellText();
const dashboardLink = menu?.querySelector('a[href="/tracker/dashboard.html"]');
const projectsLink = menu?.querySelector('a[href="/tracker/projects.html"]');
if (dashboardLink && projectsLink) dashboardLink.after(projectsLink);
if (menu && !menu.querySelector('a[href="/tracker/accounts.html"]')) { const accountsLink = document.createElement('a'); accountsLink.href = '/tracker/accounts.html'; accountsLink.textContent = 'Accounts'; if (projectsLink) projectsLink.after(accountsLink); else menu.append(accountsLink); }
if (menu && !menu.querySelector('a[href="/tracker/official-leads.html"]')) { const leadsLink = document.createElement('a'); leadsLink.href = '/tracker/official-leads.html'; leadsLink.textContent = 'Official leads'; const accountsLinkForOrder = menu.querySelector('a[href="/tracker/accounts.html"]'); if (accountsLinkForOrder) accountsLinkForOrder.after(leadsLink); else if (projectsLink) projectsLink.after(leadsLink); else menu.append(leadsLink); }
if (menu && !menu.querySelector('a[href="/tracker/contacts.html"]')) { const contactsLink = document.createElement('a'); contactsLink.href = '/tracker/contacts.html'; contactsLink.textContent = 'Contacts'; const leadsLink = menu.querySelector('a[href="/tracker/official-leads.html"]'); if (leadsLink) leadsLink.after(contactsLink); else menu.append(contactsLink); }
if (nav && !nav.querySelector('a[href="/board"]')) { const board = document.createElement('a'); board.href = '/board'; board.className = 'agent-board-link'; board.textContent = 'Agent board'; nav.append(board); }
const boardLink = nav?.querySelector('a.agent-board-link'); if (boardLink && location.pathname.startsWith('/board')) boardLink.classList.add('active');
const accountsLink = menu?.querySelector('a[href="/tracker/accounts.html"]'); if (accountsLink && location.pathname.startsWith('/tracker/accounts')) accountsLink.classList.add('active');
const toggle = document.querySelector('#toggle-sidebar');
if (toggle) toggle.textContent = nav?.classList.contains('sidebar-collapsed') ? '\u203a' : '\u2039';
toggle?.addEventListener('click',()=>{toggle.textContent=nav?.classList.contains('sidebar-collapsed')?'\u203a':'\u2039';});
const resize = document.querySelector('#sidebar-resizer');
try { const s=JSON.parse(localStorage.getItem('oman-tracker-sidebar')||'null'); if(s?.width) document.documentElement.style.setProperty('--sidebar-width',`${Math.max(190,Math.min(420,Number(s.width)))}px`); if(s?.collapsed) nav?.classList.add('sidebar-collapsed'); } catch {}
document.documentElement.classList.add('sidebar-ready');
function save(){try{localStorage.setItem('oman-tracker-sidebar',JSON.stringify({width:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')),collapsed:nav?.classList.contains('sidebar-collapsed')}));}catch{}}
toggle?.addEventListener('click',()=>{nav.classList.toggle('sidebar-collapsed');const open=!nav.classList.contains('sidebar-collapsed');toggle.textContent=open?'‹':'›';toggle.setAttribute('aria-expanded',String(open));toggle.title=open?'Hide menu':'Show menu';save();});
let dragging=false; resize?.addEventListener('pointerdown',e=>{if(!nav.classList.contains('sidebar-collapsed')){dragging=true;resize.setPointerCapture?.(e.pointerId);}}); resize?.addEventListener('pointermove',e=>{if(dragging)document.documentElement.style.setProperty('--sidebar-width',`${Math.max(190,Math.min(420,e.clientX))}px`);}); resize?.addEventListener('pointerup',()=>{dragging=false;save();});
