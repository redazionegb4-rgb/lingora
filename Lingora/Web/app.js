'use strict';
function startApp(initialState){
const allLessons = [...lessons.en, ...lessons.es];
const byId = Object.fromEntries(allLessons.map(l => [l.id,l]));
let state=initialState;
const main=document.getElementById('main'), modal=document.getElementById('modal');
const navGroups=[
  ['Studio',[['aula','Panoramica','grid'],['corsi','I miei corsi','book'],['grammatica','Grammatica','library'],['dialoghi','Dialoghi','chat'],['esercizi','Esercizi','pencil']]],
  ['Personale',[['quaderno','Il mio quaderno','notebook'],['progressi','Progressi','chart']]]
];
const navTitles = Object.fromEntries(navGroups.flatMap(g=>g[1]).map(n=>[n[0],n[1]]));
let currentRoute=[], speechRun=0, toastTimer;
let filters={grammatica:'en',dialoghi:'en',esercizi:'en',quaderno:'all'}, showTranslation=true;
for(const key of Object.keys(filters)){const v=state.sectionFilters?.[key];if(v==='en'||v==='es'||(v==='all'&&key==='quaderno'))filters[key]=v}
const esc = s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const $ = s=>document.querySelector(s);
function today(offset=0){const d=new Date();d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function streak(){let n=0,offset=state.days[today()]?0:-1;while(state.days[today(offset)]>0){n++;offset--}return n}
function storeState(){accountStore.save(state)}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3500)}
function link(path,text,cls=''){return '<a class="'+cls+'" href="#'+path+'">'+text+'</a>'}
function act(action,text,cls='',attrs=''){return '<button type="button" class="'+cls+'" data-action="'+action+'" '+attrs+'>'+text+'</button>'}
function circle(name,action,title,attrs='',extra=''){return act(action,icon(name,16),'round-btn '+extra,'title="'+esc(title)+'" aria-label="'+esc(title)+'" '+attrs)}
function meter(pct){return '<div class="meter" aria-hidden="true"><i style="width:'+Math.min(100,pct)+'%"></i></div>'}
function completed(lang){return lessons[lang].filter(l=>state.done[l.id]).length}
function nextLesson(lang){return lessons[lang].find(l=>!state.done[l.id]) || lessons[lang][0]}
function language(id){return '<span class="lang-tag '+id+'">'+courseInfo[id].title+'</span>'}
function tag(text){return '<span class="tag">'+esc(text)+'</span>'}
function back(path,title){return link(path,icon('back',15)+title,'backlink')}
function head(title,sub){return '<div class="page-intro"><h1>'+esc(title)+'</h1><p>'+esc(sub)+'</p></div>'}
function section(title,body,extra=''){return '<section class="section"><div class="row section-head"><h2>'+esc(title)+'</h2>'+extra+'</div>'+body+'</section>'}
function noteEmpty(symbol,title,desc,button=''){return '<div class="panel empty"><span class="icon-tile">'+icon(symbol)+'</span><h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p>'+button+'</div>'}
function activeNav(r){return ({corso:'corsi',lezione:'corsi',scheda:r[1],sessione:'esercizi',suoni:'grammatica'})[r[0]]||r[0]}
function header(){
  const active=activeNav(currentRoute), count=state.days[today()]||0, goal=state.dailyGoal;
  $('#sidebar').innerHTML=act('close-menu',icon('close',18),'close-sidebar','aria-label="Chiudi menu"')+link('aula','<img src="assets/mark.svg" alt="">Lingora','brand')+
    '<nav aria-label="Navigazione">'+navGroups.map(([title,items])=>'<div class="nav-group"><p class="nav-label">'+title+'</p>'+items.map(([id,text,sym])=>'<a class="nav-link '+(active===id?'active':'')+'" '+(active===id?'aria-current="page"':'')+' href="#'+id+'">'+icon(sym)+text+'</a>').join('')+'</div>').join('')+'</nav>'+
    '<div class="side-bottom">'+act('settings','<span class="goal-head">'+icon('target',16)+'Obiettivo giornaliero'+icon('settings',14)+'</span>'+meter(count*100/goal)+'<span class="goal-foot">'+Math.min(count,goal)+' di '+goal+' '+(goal===1?'sessione':'sessioni')+' oggi</span>','goal-tile','aria-label="Modifica obiettivo giornaliero"')+'</div>';
  $('#topbar').innerHTML='<div class="mobile-top">'+act('menu',icon('menu'),'menu-toggle','aria-label="Apri menu" aria-controls="sidebar" aria-expanded="false"')+link('aula','<img src="assets/mark.svg" alt="">Lingora','mobile-brand')+'</div><div class="crumb">'+icon('cap',17)+'<span>Area studio</span>'+icon('chevron',12)+'<strong>'+esc(navTitles[active]||'Panoramica')+'</strong></div><div class="top-actions">'+link('progressi',icon('fire',17)+'<span>'+streak()+' '+(streak()===1?'giorno':'giorni')+'</span>','streak')+'<span class="top-divider"></span>'+act('settings',esc((state.name||'S').charAt(0).toUpperCase()),'avatar','aria-label="Impostazioni del profilo" title="'+esc(state.name)+' · Impostazioni"')+'</div>';
}
function duration(l){return [6,9,12][l.year<5?0:l.year<8?1:2]}
function courseCard(lang){
  const c=courseInfo[lang],n=completed(lang),pct=Math.round(n/lessons[lang].length*100);
  return link('corso/'+lang,'<div class="course-art"><img src="assets/'+c.image+'.webp" alt="Illustrazione panoramica di '+c.city+'"><span class="level"><i class="level-dot"></i>Dalle basi</span></div><div class="course-copy"><div class="row"><div><h3 class="card-title">'+c.title+'</h3><div class="meta">'+icon('layers',13)+'13 anni <span>·</span> 78 lezioni</div></div><span class="course-arrow">'+icon('arrow',16)+'</span></div><div class="row progress-line"><span>Progresso del corso</span><strong>'+pct+'%</strong></div>'+meter(pct)+'</div>','course-card')
}
const practiceLinks=[['grammatica','book','Grammatica','Regole ed esempi',''],['dialoghi','chat','Dialoghi','Ascolta e comprendi','peach'],['esercizi','pencil','Esercizi','Mettiti alla prova','yellow']];
function practiceCards(){return '<div class="practice-grid">'+practiceLinks.map(([path,sym,title,sub,color])=>link(path,'<span class="icon-tile '+color+'">'+icon(sym,21)+'</span><span class="text"><strong>'+title+'</strong><small>'+sub+'</small></span>'+icon('chevron',15),'practice-card')).join('')+'</div>'}
function dashboard(){
  const recent=byId[state.last]||lessons.en[0];
  const l=state.done[recent.id]?(lessons[recent.lang].slice(recent.index+1).find(item=>!state.done[item.id])||nextLesson(recent.lang)):recent;
  const started=!!state.drafts[l.id],first=l.index===0,d=new Date(),date=d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
  return '<div class="row page-head"><h1>La tua aula</h1><span class="date">'+icon('calendar',15)+esc(date.charAt(0).toUpperCase()+date.slice(1))+'</span></div>'+
    '<section class="hero"><div class="hero-copy"><span class="hero-badge">'+icon('spark',15)+(started?'Continua la lezione':'Lezione consigliata')+'<span class="hero-year">'+esc(yearNames[l.year])+'</span></span><h2 class="hero-title">'+(first?'Le prime lettere,<br><em>i primi suoni.</em>':esc(l.title))+'</h2><p>'+(first?'Ascolta e riconosci le prime lettere in '+courseInfo[l.lang].title.toLowerCase()+'.':esc(l.goal))+'</p><div class="buttons">'+link('lezione/'+l.id,(started?'Riprendi lezione':state.done[l.id]?'Ripassa lezione':'Inizia lezione')+icon('arrow',16),'btn')+'<span class="meta">'+icon('clock',14)+' '+duration(l)+' min</span></div></div><img class="hero-image" src="assets/hero.webp" alt=""></section>'+
    section('I tuoi corsi','<div class="course-grid">'+courseCard('en')+courseCard('es')+'</div>',link('corsi','Vedi tutti '+icon('arrow',14),'text-link'))+
    section('Allenamento rapido',practiceCards())
}
function getYear(lang){const n=Number(state.year?.[lang]??0);return Number.isInteger(n)&&n>=0&&n<13?n:0}
function yearSelect(lang,year){return '<label class="year-select"><span>Classe</span><select data-year-select="'+lang+'" aria-label="Scegli la classe">'+stages.map(st=>'<optgroup label="'+st.title+'">'+yearNames.map((name,i)=>i>=st.start&&i<st.end?'<option value="'+i+'" '+(i===year?'selected':'')+'>'+name+'</option>':'').join('')+'</optgroup>').join('')+'</select></label>'}
function coursesPage(){return head('I miei corsi','Due percorsi di 13 anni, dai primi suoni alla lettura e alla scrittura di testi articolati.')+'<div class="course-grid">'+courseCard('en')+courseCard('es')+'</div>'+section('I cicli scolastici','<div class="panel stack">'+stages.map((st,i)=>'<div class="example"><span class="icon-tile '+['','peach','yellow'][i]+'">'+icon(['book','chat','cap'][i])+'</span><div><strong>'+st.title+'</strong><small>'+st.desc+'</small></div></div>').join('')+'</div>')}
function coursePage(lang){
  const c=courseInfo[lang],n=completed(lang),year=getYear(lang),selected=lessons[lang].filter(l=>l.year===year),next=selected.find(l=>!state.done[l.id])||selected[0];
  return back('corsi','I miei corsi')+'<section class="course-banner '+lang+'"><div class="content"><div class="tags">'+tag('13 anni di studio')+tag(n+' / '+lessons[lang].length+' lezioni')+'</div><h1>'+c.title+'</h1><p>'+c.description+'</p>'+link('lezione/'+next.id,(state.done[next.id]?'Ripassa la classe':state.drafts[next.id]?'Continua la lezione':'Inizia la classe')+icon('arrow',16),'btn')+'</div><img src="assets/'+c.image+'.webp" alt="'+c.city+'"></section>'+
    section('Programma del corso','<div class="stage-tabs">'+stages.map((st,i)=>act('stage','<span class="icon-tile '+['','peach','yellow'][i]+'">'+icon(['book','chat','cap'][i],17)+'</span><span><b>'+st.title+'</b><small>'+((st.end-st.start)*6)+' lezioni</small></span>','stage-tab '+(year>=st.start&&year<st.end?'on':''),'data-lang="'+lang+'" data-start="'+st.start+'" aria-pressed="'+(year>=st.start&&year<st.end)+'"')).join('')+'</div><div class="filter-bar">'+yearSelect(lang,year)+'<span class="small">'+selected.filter(l=>state.done[l.id]).length+' di 6 lezioni completate</span></div><div class="stack">'+selected.map((l,i)=>item('lezione/'+l.id,state.done[l.id]?'check':'book',l.title,'Lezione '+(i+1)+' · '+l.goal)).join('')+'</div><div class="lesson-actions">'+act('drill',icon('cap',17)+'Verifica di fine anno','outline-btn','data-mode="exam" data-lang="'+lang+'" data-year="'+year+'"')+'</div>')
}
function segments(page){const opts=page==='quaderno'?['all','en','es']:['en','es'];return '<div class="segments" aria-label="Filtra per lingua">'+opts.map(s=>act('filter',s==='all'?'Tutte':courseInfo[s].title,filters[page]===s?'selected':'','data-lang="'+s+'" aria-pressed="'+(filters[page]===s)+'"')).join('')+'</div>'}
function item(path,sym,title,sub,color=''){return link(path,'<span class="icon-tile '+color+'">'+icon(sym,19)+'</span><span class="body"><strong>'+esc(title)+'</strong><small>'+esc(sub)+'</small></span>'+icon('chevron',16),'stack-item')}
function resourcesPage(page){const dialog=page==='dialoghi',lang=filters[page],year=getYear(lang);return head(dialog?'Dialoghi':'Grammatica',dialog?'Ascolta le conversazioni della tua classe, segui le battute e controlla la traduzione in italiano.':'Dai suoni alle strutture complesse, consulta le spiegazioni della tua classe e ascolta gli esempi.')+'<div class="filter-bar">'+segments(page)+yearSelect(lang,year)+'</div>'+
  (!dialog?item('suoni/'+lang,'sound','Alfabeto e numeri','Ascolta lettere e numeri da 0 a 20'):'')+
  section(yearNames[year],'<div class="list-pair">'+lessons[lang].filter(l=>l.year===year).map(l=>item('scheda/'+page+'/'+l.id,dialog?'chat':'book',dialog?l.title:l.grammar,'Lezione '+(l.inYear+1)+' · '+(dialog?'4 battute':l.title),dialog?'peach':'')).join('')+'</div>')}
const numbers={en:'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' '),es:'cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve veinte'.split(' ')};
const letterNames={en:['ay','bee','cee','dee','ee','ef','gee','aitch','eye','jay','kay','el','em','en','oh','pee','cue','ar','ess','tee','you','vee','double u','ex','why','zed'],es:[...'a be ce de e efe ge hache i jota ka ele eme ene eñe o pe cu erre ese te u uve'.split(' '),'uve doble','equis','i griega','zeta']};
function soundsPage(lang){const alphabet=Array.from(lang==='en'?'ABCDEFGHIJKLMNOPQRSTUVWXYZ':'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ');
  const keys=(items)=>'<div class="study-grid">'+items.map(([name,audio])=>act('speak','<span>'+esc(name)+'</span>'+icon('sound',13),'sound-key','aria-label="Ascolta '+esc(name)+'" data-lang="'+lang+'" data-text="'+esc(audio)+'"')).join('')+'</div>';
  return back('grammatica','Grammatica')+head('Alfabeto e numeri','Seleziona una lettera o un numero per sentirne la pronuncia in '+courseInfo[lang].title.toLowerCase()+'.')+section('Alfabeto',keys(alphabet.map((s,i)=>[s,letterNames[lang][i]])))+section('Numeri da 0 a 20',keys(numbers[lang].map((s,i)=>[i+' · '+s,s])))}
function getDraft(l){if(!state.drafts[l.id])state.drafts[l.id]={step:0,run:null};return state.drafts[l.id]}
function saveButton(l,i){const id=l.id+':'+i,saved=state.saved.includes(id);return circle('bookmark','bookmark',saved?'Rimuovi dal quaderno':'Salva nel quaderno','data-example="'+id+'" aria-pressed="'+saved+'"',saved?'saved':'')}
function audioButton(l,t){return circle('sound','speak','Ascolta '+t,'data-lang="'+l.lang+'" data-text="'+esc(t)+'"')}
function beginnerBoard(l){
  let tokens=[],kind='letters';
  if(l.index===0)tokens=(l.lang==='en'?['A','B','C']:['A','E','I','O','U']).map((letter,i)=>[letter,l.lang==='en'?['ay','bee','cee'][i]:letter.toLowerCase()]);
  else if(l.title.toLowerCase().includes('colori')){kind='colors';tokens=(l.lang==='en'?['red','blue','yellow','green','black','white']:['rojo','azul','amarillo','verde','negro','blanco']).map((word,i)=>[word,word,['#d96153','#5185ad','#e8bb39','#609367','#3c4540','#ffffff'][i]])}
  else if(l.index===2||l.lang==='es'&&l.index===3){kind='numbers';const from=l.lang==='es'&&l.index===3?6:0,to=l.lang==='es'&&l.index===2?5:10;tokens=numbers[l.lang].slice(from,to+1).map((name,i)=>[String(i+from),name])}
  if(!tokens.length||l.year!==0)return '';
  return '<div class="primer"><p class="field-label">'+(kind==='colors'?'Ascolta i colori':kind==='numbers'?'Ascolta e conta':'Tocca una lettera e ripeti')+'</p><div class="primer-board '+kind+'">'+tokens.map(([label,word,color])=>act('speak',(color?'<i style="background:'+color+'"></i>':'')+'<b>'+esc(label)+'</b>'+icon('sound',14),'primer-key','data-lang="'+l.lang+'" data-text="'+esc(word)+'" aria-label="Ascolta '+esc(label)+'"')).join('')+'</div></div>'
}
function grammarBody(l){return '<h2>'+esc(l.grammar)+'</h2><p class="rule">'+esc(l.rule)+'</p>'+beginnerBoard(l)+'<div class="examples">'+l.examples.map(([phrase,it],i)=>'<div class="example">'+audioButton(l,phrase)+'<div class="grow"><strong lang="'+l.lang+'">'+esc(phrase)+'</strong><small>'+esc(it)+'</small></div>'+saveButton(l,i)+'</div>').join('')+'</div>'}
function dialogueBody(l){
  return '<div class="row"><h2>Il dialogo</h2>'+act('play-dialogue',icon('headphones',16)+'<span>Ascolta tutto</span>','soft-btn','data-id="'+l.id+'"')+'</div><div class="dialogue">'+l.dialogue.map(([phrase,it],i)=>{const name=['Voce A','Voce B'][i%2];return '<div class="dialogue-line"><span class="speaker">'+name.slice(-1)+'</span><div class="bubble"><span class="speaker-name">'+name+'</span><strong lang="'+l.lang+'">'+esc(phrase)+'</strong>'+(showTranslation?'<small>'+esc(it)+'</small>':'')+'</div>'+audioButton(l,phrase)+'</div>'}).join('')+'</div><div style="margin-top:14px">'+act('translation',showTranslation?'Nascondi traduzione':'Mostra traduzione','text-link','aria-pressed="'+showTranslation+'"')+'</div>'
}
function sheetPage(page,l){return '<div class="lesson-shell">'+back(page,navTitles[page])+'<div class="tags">'+language(l.lang)+tag(yearNames[l.year])+'</div><h1 class="lesson-heading">'+esc(l.title)+'</h1><div class="lesson-panel">'+(page==='dialoghi'?dialogueBody(l):grammarBody(l))+'<div class="lesson-actions">'+link('lezione/'+l.id,'Vai alla lezione '+icon('arrow',16),'btn')+'</div></div></div>'}
function lessonPage(l){
  const draft=getDraft(l);if(!draft.run?.finished)state.last=l.id;state.year=state.year||{};state.year[l.lang]=l.year;storeState();const names=['Regola','Dialogo','Esercizi'];
  if(draft.step===2&&!draft.run)draft.run=createRun(l.tasks.map((_,i)=>l.id+':'+i),'lesson',l.lang);
  return '<div class="lesson-shell">'+back('corso/'+l.lang,'Corso di '+courseInfo[l.lang].title.toLowerCase())+'<div class="tags">'+language(l.lang)+tag(yearNames[l.year])+tag('Lezione '+(l.inYear+1)+' di 6')+'</div><h1 class="lesson-heading">'+esc(l.title)+'</h1><p class="intro-text">'+esc(l.goal)+'</p><div class="steps" aria-label="Fasi della lezione">'+names.map((name,i)=>act('step',icon(['book','chat','pencil'][i],16)+name,i===draft.step?'active':'','data-step="'+i+'" aria-pressed="'+(i===draft.step)+'"')).join('')+'</div>'+
  (draft.step===2?runBody(draft.run,l):'<article class="lesson-panel">'+(draft.step===0?grammarBody(l):dialogueBody(l))+'<div class="lesson-actions">'+(draft.step===1?act('step',icon('back',15)+'Regola','outline-btn','data-step="0"'):'<span class="small">1 di 3 · Regola</span>')+act('step',(draft.step===0?'Vai al dialogo':'Vai agli esercizi')+icon('arrow',16),'btn','data-step="'+(draft.step+1)+'"')+'</div></article>')+'</div>'
}
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function taskByKey(key){const [id,i]=key.split(':');return byId[id]?.tasks[i]}
function createRun(ids,mode,lang,year=0){return {ids:[...ids],mode,lang,year,at:0,score:0,missed:[],choices:{},checked:false,ok:false,value:'',finished:false}}
function currentRun(){return currentRoute[0]==='lezione'?getDraft(byId[currentRoute[1]]).run:state.run}
function normalize(v){return String(v).normalize('NFC').toLocaleLowerCase().replace(/[’‘`´]/g,"'").replace(/[.,¿?¡!;:“”"…]/g,' ').replace(/\s+/g,' ').trim()}
function grade(q,val){return [q.answer,...(q.alternatives||[])].some(a=>normalize(a)===normalize(val))}
const modeNames={mixed:'Allenamento misto',choice:'Scelta multipla',gap:'Completa le frasi',write:'Traduzione e scrittura',review:'Ripasso degli errori',exam:'Verifica di fine anno',lesson:'Esercizi della lezione'};
function runBody(run,l){
  if(!run)return noteEmpty('pencil','Scegli un allenamento','Puoi scegliere la lingua e il tipo di esercizio.',link('esercizi','Vai agli esercizi','btn'));
  if(run.finished){
    const good=run.mode==='exam'?run.score/run.ids.length>=.75:run.score===run.ids.length;
    const title=run.mode==='lesson'?(good?'Lezione completata!':'Riprendiamo gli errori'):run.mode==='exam'?(good?'Verifica superata!':'Verifica da ripassare'):'Allenamento concluso';
    const next=l?lessons[l.lang][l.index+1]:null;
    return '<div class="lesson-panel result"><span class="icon-tile">'+icon(good?'cap':'pencil',30)+'</span><h2>'+title+'</h2><p>Hai risposto correttamente a <strong>'+run.score+' domande su '+run.ids.length+'</strong>. '+(run.missed.length?'Puoi rivedere ogni errore con la sua spiegazione.':l?'Il tuo progresso è stato salvato.':'Il risultato è nei tuoi progressi.')+'</p><div class="buttons">'+(run.mode==='lesson'&&!good?act('retry','Correggi gli errori '+icon('arrow',16),'btn'):run.mode==='exam'&&!good?act('retry','Ripeti la verifica','btn'):l&&next?link('lezione/'+next.id,'Lezione successiva '+icon('arrow',16),'btn'):link('esercizi','Torna agli esercizi','btn'))+(l&&good?act('restart-lesson','Ripeti la lezione','outline-btn'):'')+(l?link('corso/'+l.lang,'Programma del corso','outline-btn'):link('progressi','Vedi progressi','outline-btn'))+'</div></div>'
  }
  const key=run.ids[run.at],q=taskByKey(key);
  if(!q)return noteEmpty('repeat','Sessione da riavviare','Apri un nuovo allenamento.',link('esercizi','Esercizi','btn'));
  const ix=run.at+1,why=run.checked?'<div class="feedback '+(!run.ok?'wrong':'')+'" role="status"><strong>'+(run.ok?'Risposta corretta':'Da rivedere')+'</strong><p>'+(!run.ok?'Risposta attesa: <b>'+esc(q.answer)+'</b>. ':'')+esc(q.why)+'</p></div>':'';
  let input;
  if(q.type==='choice'){
    if(!run.choices[key])run.choices[key]=shuffle(q.options);
    input='<div class="choices" role="group" aria-label="Scegli una risposta">'+run.choices[key].map(opt=>act('choice','<span class="choice-ring"></span>'+esc(opt),'choice '+(run.value===opt?'on ':'')+(run.checked?(opt===q.answer?'correct':run.value===opt?'wrong':''):''),'data-value="'+esc(opt)+'" aria-pressed="'+(run.value===opt)+'" '+(run.checked?'disabled':''))).join('')+'</div>'
  }else{
    input='<label class="field-label" for="answer">La tua risposta in '+courseInfo[run.lang].title.toLowerCase()+'</label><input class="field" id="answer" name="answer" lang="'+run.lang+'" autocomplete="off" spellcheck="false" value="'+esc(run.value)+'" '+(run.checked?'readonly':'')+' placeholder="Scrivi qui…">'+(run.lang==='es'&&!run.checked?'<div class="accent-keys">'+[...'áéíóúüñ¿¡'].map(k=>act('accent',k,'','data-key="'+k+'" aria-label="Inserisci '+k+'"')).join('')+'</div>':'')
  }
  return '<div class="lesson-panel"><div class="row"><span class="tag">'+({choice:'Scelta multipla',gap:'Completamento',write:'Scrittura'})[q.type]+'</span><span class="small">Domanda '+ix+' di '+run.ids.length+'</span></div><div style="margin-top:15px">'+meter((ix-1)*100/run.ids.length)+'</div><h2 class="question-title">'+esc(q.prompt)+'</h2>'+input+why+'<div class="lesson-actions"><span class="small">'+esc(l?l.grammar:courseInfo[run.lang].title)+'</span>'+(run.checked?act('next',(ix===run.ids.length?'Vedi risultato':'Prossima domanda')+icon('arrow',15),'btn'):act('verify','Verifica risposta '+icon('check',15),'btn','id="verify" '+(!String(run.value).trim()?'disabled':'')))+'</div></div>'
}
function verify(){
  const run=currentRun();if(!run||run.finished||run.checked||!run.value.trim())return;
  const key=run.ids[run.at],q=taskByKey(key);run.ok=grade(q,run.value);run.checked=true;
  state.attempts++;if(run.ok){run.score++;state.correct++;state.mistakes=state.mistakes.filter(k=>k!==key)}else{run.missed.push(key);if(!state.mistakes.includes(key))state.mistakes.push(key)}
  storeState();paint()
}
function nextQuestion(){const run=currentRun();if(!run||run.finished||!run.checked)return;
  if(run.at<run.ids.length-1){run.at++;run.checked=false;run.value='';run.ok=false}
  else{run.finished=true;const l=currentRoute[0]==='lezione'?byId[currentRoute[1]]:null;
    if(l&&run.score===run.ids.length)state.done[l.id]=true;
    if(l&&run.score===run.ids.length){const next=lessons[l.lang][l.index+1];if(next)state.last=next.id}
    if(run.mode==='exam'){state.exams=state.exams||{};const k=run.lang+':'+run.year;state.exams[k]=Math.max(state.exams[k]||0,Math.round(run.score*100/run.ids.length))}
    if(!l||run.score===run.ids.length)state.days[today()]=(state.days[today()]||0)+1;
  }storeState();paint()}
function retry(){const r=currentRun();if(!r?.finished)return;const l=currentRoute[0]==='lezione'?byId[currentRoute[1]]:null;
  if(l){getDraft(l).run=createRun(r.missed.length?r.missed:l.tasks.map((_,i)=>l.id+':'+i),'lesson',l.lang)}
  else{state.run=createRun(r.ids,r.mode,r.lang,r.year)}storeState();paint()}
function lessonKeys(lang,year){return lessons[lang].filter(l=>l.year===year).flatMap(l=>l.tasks.map((_,i)=>l.id+':'+i))}
function startPractice(mode,lang,year){
  const scope=lessonKeys(lang,year), pool=mode==='review'?state.mistakes.filter(k=>k.startsWith(lang+'-')&&taskByKey(k)):mode==='mixed'||mode==='exam'?scope:scope.filter(k=>taskByKey(k).type===mode);
  const ids=mode==='exam'?[...['choice','gap','write'].flatMap(t=>shuffle(pool.filter(k=>taskByKey(k).type===t)).slice(0,3))]:shuffle(pool).slice(0,6);
  if(!ids.length){toast('Non ci sono errori da ripassare per questa lingua.');return}
  state.run=createRun(mode==='exam'?shuffle(ids):ids,mode,lang,year);storeState();if(location.hash==='#sessione')paint();else location.hash='sessione'
}
function exercisesPage(){const lang=filters.esercizi,year=getYear(lang),errCount=state.mistakes.filter(k=>k.startsWith(lang+'-')).length;
  return head('Esercizi','Scegli una classe e allenati con domande tratte dalle sue lezioni.')+'<div class="filter-bar">'+segments('esercizi')+yearSelect(lang,year)+'</div>'+
    (state.run&&!state.run.finished?'<div class="panel row" style="margin-bottom:16px"><span><strong>Sessione in corso</strong><br><small>'+esc(modeNames[state.run.mode])+' · '+courseInfo[state.run.lang].title+'</small></span>'+link('sessione','Riprendi '+icon('arrow',15),'btn')+'</div>':'')+
    '<div class="drills">'+[['mixed','layers','Allenamento misto','Alterna riconoscimento, completamento e scrittura.',''],['choice','grid','Scelta multipla','Riconosci la forma o il significato corretto.','peach'],['gap','pencil','Completa le frasi','Inserisci la parola che manca nella frase.','yellow'],['write','keyboard','Traduzione e scrittura','Scrivi una parola o costruisci una frase.','lavender'],['exam','cap','Verifica di fine anno','Nove domande sulla classe scelta. Per superarla servono sette risposte corrette.',''],['review','repeat','Ripasso degli errori',errCount?errCount+' risposte da rivedere in '+courseInfo[lang].title.toLowerCase()+'.':'Qui ritroverai le risposte da correggere in '+courseInfo[lang].title.toLowerCase()+'.','peach']].map(([mode,sym,title,desc,clr])=>'<div class="panel drill-card"><span class="icon-tile '+clr+'">'+icon(sym)+'</span><h2>'+title+'</h2><p>'+desc+'</p>'+act('drill',(mode==='review'?'Ripassa':mode==='exam'?'Inizia verifica':'Inizia')+icon('arrow',14),'btn','data-mode="'+mode+'" data-lang="'+lang+'" data-year="'+year+'" '+(mode==='review'&&!errCount?'disabled':''))+'</div>').join('')+'</div>'
}
function notebook(){
  const lang=filters.quaderno,keys=state.saved.filter(k=>lang==='all'||k.startsWith(lang+'-')),mistakes=state.mistakes.filter(k=>lang==='all'||k.startsWith(lang+'-'));
  return head('Il mio quaderno','Ritrova gli esempi che hai salvato e le risposte da ripassare.')+'<div class="filter-bar">'+segments('quaderno')+'</div>'+
  section('Esempi salvati',keys.length?'<div class="panel">'+keys.map(k=>{const [id,i]=k.split(':'),l=byId[id],[t,it]=l.examples[i];return '<div class="example">'+audioButton(l,t)+'<div class="grow">'+language(l.lang)+'<strong>'+esc(t)+'</strong><small>'+esc(it)+'</small></div>'+saveButton(l,i)+'</div>'}).join('')+'</div>':noteEmpty('bookmark','Il tuo quaderno è pronto','Nelle schede di grammatica, tocca il segnalibro accanto a un esempio per conservarlo.',link('grammatica','Apri la grammatica','soft-btn')))+
  section('Da ripassare',mistakes.length?'<div class="stack">'+mistakes.map(k=>{const l=byId[k.split(':')[0]],q=taskByKey(k);return '<div class="panel">'+language(l.lang)+'<p class="review-prompt">'+esc(q.prompt)+'</p><strong>'+esc(q.answer)+'</strong><p class="section-sub">'+esc(q.why)+'</p></div>'}).join('')+'</div>':'<div class="panel section-sub">Le correzioni degli esercizi compariranno qui.</div>')
}
function progressPage(){const n=Object.keys(state.done).length,daily=state.days[today()]||0,pct=state.attempts?Math.round(state.correct/state.attempts*100):0;
  return head('I tuoi progressi','Segui lo studio delle due lingue e ritrova i risultati delle verifiche.')+'<div class="progress-stats">'+[[n,'Lezioni completate'],[state.attempts?pct+'%':'—','Risposte corrette'],[streak(),'Giorni di fila']].map(([a,b])=>'<div class="stat"><strong>'+a+'</strong><small>'+b+'</small></div>').join('')+'</div>'+
  section('Ultimi sette giorni','<div class="panel"><div class="row"><strong>Sessioni di studio</strong>'+act('settings',icon('target',15)+' Obiettivo','text-link')+'</div><div class="week">'+Array.from({length:7},(_,i)=>{const k=today(i-6),v=state.days[k]||0;return '<div class="day '+(i===6?'today':'')+'"><b>'+v+'</b><div class="day-bar"><span style="height:'+Math.min(100,v*100/Math.max(state.dailyGoal,...Array.from({length:7},(_,j)=>state.days[today(-j)]||0)))+'%"></span></div><span>'+new Date(k+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short'})+'</span></div>'}).join('')+'</div><p class="section-note">Oggi hai completato '+daily+' '+(daily===1?'sessione':'sessioni')+'. Obiettivo giornaliero: '+state.dailyGoal+'.</p></div>')+
    section('I tuoi corsi','<div class="course-grid">'+courseCard('en')+courseCard('es')+'</div>')+
    section('Verifiche di fine anno',Object.keys(state.exams||{}).length?'<div class="stack">'+Object.entries(state.exams).map(([k,v])=>{const [lang,y]=k.split(':');return '<div class="panel row"><strong>'+courseInfo[lang].title+' · '+yearNames[y]+'</strong>'+tag(v+'% · '+(v>=75?'Superata':'Da ripassare'))+'</div>'}).join('')+'</div>':noteEmpty('cap','La tua prima verifica','Dopo le lezioni di una classe, mettiti alla prova con nove domande.',link('esercizi','Apri gli esercizi','soft-btn')))
}
function settings(){modal.innerHTML='<form id="settings-form"><div class="row"><h2>Il tuo profilo</h2>'+circle('close','close-modal','Chiudi')+'</div><label for="profile-name" class="field-label">Il tuo nome</label><input id="profile-name" class="field" maxlength="40" required value="'+esc(state.name)+'"><label class="field-label" for="daily-goal">Obiettivo giornaliero</label><select class="field" id="daily-goal">'+[1,2,3,4,5].map(n=>'<option value="'+n+'" '+(state.dailyGoal===n?'selected':'')+'>'+n+' '+(n===1?'sessione':'sessioni')+' al giorno</option>').join('')+'</select><p class="section-note">Ogni lezione o allenamento concluso conta come una sessione. I dati di studio sono associati al tuo profilo.</p><button class="btn" type="submit">Salva modifiche</button></form><div class="profile-account"><strong>@'+esc(accountStore.user)+'</strong><p id="sync-status">'+esc(accountStore.status)+'</p><div class="buttons">'+act('account-sync',icon('repeat',14)+'Sincronizza','outline-btn')+act('account-exit','Esci dal profilo','outline-btn')+'</div></div>';modal.showModal()}
function stopSpeech(){
  speechRun++;mobileHost.stop();
  const label=$('[data-action="play-dialogue"] span');if(label)label.textContent='Ascolta tutto';
}
function speakLines(lang,lines,all=false){
  const label=$('[data-action="play-dialogue"] span');
  const alreadyPlaying=all&&label?.textContent==='Ferma ascolto';
  stopSpeech();if(alreadyPlaying)return;
  if(all&&label)label.textContent='Ferma ascolto';
  const token=speechRun;
  mobileHost.speak(courseInfo[lang].locale,lines,token,(error)=>{
    if(token!==speechRun)return;
    if(label)label.textContent='Ascolta tutto';
    if(error)toast('La voce non è disponibile. Controlla le voci di '+courseInfo[lang].title.toLowerCase()+' nelle impostazioni del telefono.');
  });
}
function paint(){
  const [page,arg,id]=currentRoute;let html='';
  switch(page){
    case 'corsi':html=coursesPage();break;
    case 'corso':html=coursePage(courseInfo[arg]?arg:'en');break;
    case 'grammatica':case 'dialoghi':html=resourcesPage(page);break;
    case 'esercizi':html=exercisesPage();break;
    case 'quaderno':html=notebook();break;
    case 'progressi':html=progressPage();break;
    case 'lezione':html=byId[arg]?lessonPage(byId[arg]):coursesPage();break;
    case 'scheda':html=byId[id]&&['dialoghi','grammatica'].includes(arg)?sheetPage(arg,byId[id]):coursesPage();break;
    case 'suoni':html=soundsPage(courseInfo[arg]?arg:'en');break;
    case 'sessione':html='<div class="lesson-shell">'+back('esercizi','Esercizi')+head(modeNames[state.run?.mode]||'Allenamento',state.run?courseInfo[state.run.lang].title+' · '+(state.run.mode==='review'?'Errori da rivedere':yearNames[state.run.year]):'Seleziona un tipo di esercizio.')+runBody(state.run)+'</div>';break;
    default:html=dashboard();
  }
  main.innerHTML=html;header();
  const selected=activeNav(currentRoute);
  $('#phone-nav').innerHTML=[['aula','Aula','grid'],['corsi','Corsi','book'],['esercizi','Esercizi','pencil'],['quaderno','Quaderno','notebook']].map(([path,label,symbol])=>'<a href="#'+path+'" '+(selected===path?'class="active" aria-current="page"':'')+'>'+icon(symbol,21)+'<span>'+label+'</span></a>').join('');
  document.title='Lingora · '+(main.querySelector('h1')?.textContent||'La tua aula')
}
function closeMenu(){document.body.classList.remove('menu-open');$('#sidebar').removeAttribute('data-open');const b=$('.menu-toggle');if(b)b.setAttribute('aria-expanded','false');updateInert()}
function updateInert(){const mobile=window.matchMedia('(max-width: 800px)').matches;$('#sidebar').inert=mobile&&!document.body.classList.contains('menu-open');$('.workspace').inert=mobile&&document.body.classList.contains('menu-open');$('#phone-nav').inert=document.body.classList.contains('menu-open')}
function route(){stopSpeech();currentRoute=location.hash.replace(/^#\/?/,'').split('/');if(!currentRoute[0])currentRoute[0]='aula';const path=currentRoute.join('/');if(state.lastRoute!==path){state.lastRoute=path;storeState()}closeMenu();showTranslation=true;paint();window.scrollTo(0,0);main.focus({preventScroll:true})}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b){if(e.target.id==='overlay')closeMenu();if(e.target.closest('#sidebar a'))closeMenu();return}
  const action=b.dataset.action,lang=b.dataset.lang,l=byId[currentRoute[1]],r=()=>currentRun();
  switch(action){
    case 'menu':document.body.classList.add('menu-open');b.setAttribute('aria-expanded','true');updateInert();$('#sidebar .nav-link')?.focus();break;
    case 'close-menu':closeMenu();$('.menu-toggle')?.focus();break;
    case 'account-sync': b.disabled=true;accountStore.checkService().then(()=>accountStore.sync()).finally(()=>{b.disabled=false});break;
    case 'account-exit':b.disabled=true;accountStore.logout().then(()=>{stopSpeech();history.replaceState(null,'',location.href.split('#')[0]);location.reload()}).catch(()=>{b.disabled=false;toast('Salva i progressi prima di uscire. Controlla lo spazio libero.');});break;
    case 'settings':settings();break;case 'close-modal':modal.close();break;
    case 'stage':state.year=state.year||{};state.year[lang]=+b.dataset.start;storeState();paint();break;
    case 'filter':filters[currentRoute[0]]=lang;state.sectionFilters={...filters};storeState();paint();break;
    case 'step':stopSpeech();getDraft(l).step=Number(b.dataset.step);storeState();paint();break;
    case 'bookmark':{const k=b.dataset.example,s=state.saved.includes(k);state.saved=s?state.saved.filter(x=>x!==k):[...state.saved,k];storeState();paint();toast(s?'Esempio rimosso dal quaderno.':'Esempio salvato nel quaderno.');break}
    case 'speak':speakLines(lang,[b.dataset.text]);break;case 'play-dialogue':{const dl=byId[b.dataset.id];speakLines(dl.lang,dl.dialogue.map(p=>p[0]),true);break}
    case 'translation':stopSpeech();showTranslation=!showTranslation;paint();break;
    case 'choice':if(!r().checked){r().value=b.dataset.value;storeState();paint()}break;
    case 'accent':{const input=$('#answer'),at=input.selectionStart;input.setRangeText(b.dataset.key,at,input.selectionEnd,'end');input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();break}
    case 'verify':verify();break;case 'next':nextQuestion();break;case 'retry':retry();break;
    case 'drill':startPractice(b.dataset.mode,lang,+b.dataset.year);break;
    case 'restart-lesson':getDraft(l).step=0;getDraft(l).run=null;storeState();paint();break;
  }
});
document.addEventListener('input',e=>{if(e.target.id==='answer'){const run=currentRun();if(run&&!run.checked){run.value=e.target.value;$('#verify').disabled=!run.value.trim();storeState()}}});
document.addEventListener('change',e=>{if(e.target.matches('[data-year-select]')){state.year=state.year||{};state.year[e.target.dataset.yearSelect]=Number(e.target.value);storeState();paint()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('menu-open')){closeMenu();$('.menu-toggle')?.focus()}if(e.key==='Enter'&&e.target.id==='answer'){e.preventDefault();if(currentRun()?.checked)nextQuestion();else verify()}});
document.addEventListener('submit',e=>{if(e.target.id==='settings-form'){e.preventDefault();const name=$('#profile-name').value.trim();if(!name)return;state.name=name;state.dailyGoal=Number($('#daily-goal').value);storeState();modal.close();paint();toast('Profilo aggiornato.')}});
window.addEventListener('hashchange',route);window.matchMedia('(max-width: 800px)').addEventListener('change',updateInert);

window.lingoraBack=()=>{
  if(modal.open){modal.close();return true}
  if(document.body.classList.contains('menu-open')){closeMenu();return true}
  if(currentRoute[0]==='aula')return false;
  if(window.history.length>1)window.history.back();else location.hash='aula';
  return true;
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSpeech()});
accountStore.bind(merged=>{state=merged;const focused=document.activeElement;if(!modal.open&&focused?.tagName!=='INPUT')paint()},msg=>{const label=$('#sync-status');if(label)label.textContent=msg});
window.addEventListener('online',()=>accountStore.sync());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)accountStore.sync()});
route();
}
curriculumReady.then(accountsUI.begin).catch(()=>{
  document.getElementById('main').innerHTML='<h1>Caricamento interrotto</h1><p>Riapri le lezioni per riprovare.</p><button class="btn" id="reload">Ricarica</button>';
  document.getElementById('reload').addEventListener('click',()=>location.reload());
});
