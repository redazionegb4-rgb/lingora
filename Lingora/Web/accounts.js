'use strict';
const accountsUI=(()=>{
  let mode='login',busy=false,legacy=null,viewRevision=0;
  function readLegacy(){
    try {
      const value=JSON.parse(mobileHost.read('lingora.school.1')||'null');
      if(value&&typeof value==='object'&&(value.last||value.done||value.attempts||value.saved))return value;
    }catch{}
    return null;
  }
  function el(id){return document.getElementById(id)}
  function render(){
    const create=mode==='register';viewRevision++;
    const panel=el('account-gate');
    panel.innerHTML='<div class="account-wrap"><div class="account-brand"><img src="assets/mark.svg" alt="">Lingora</div>'+
      '<main class="account-card"><div class="account-intro"><div><p class="account-overline">AREA STUDENTI</p><h1>'+ (create?'Crea il tuo profilo':'Bentornato in aula')+'</h1><p>'+(create?'Uno spazio tutto tuo per inglese e spagnolo.':'Accedi per riprendere la lezione da dove eri arrivato.')+'</p></div><img src="assets/hero.webp" alt=""></div>'+
      '<div class="account-tabs" aria-label="Accesso al profilo"><button type="button" data-mode="login" aria-pressed="'+!create+'">Accedi</button><button type="button" data-mode="register" aria-pressed="'+create+'">Iscriviti</button></div>'+
      '<form id="account-form">'+(create?'<label>Il tuo nome<input id="account-name" autocomplete="given-name" maxlength="40" required placeholder="Come vuoi essere chiamato?"></label>':'')+
      '<label>Nome utente<input id="account-user" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" maxlength="32" required placeholder="Il tuo nome utente"></label>'+
      '<label for="account-pass">Password</label><div class="secret-field"><input id="account-pass" type="password" autocomplete="'+(create?'new-password':'current-password')+'" maxlength="256" required placeholder="'+(create?'Almeno 10 caratteri':'La tua password')+'"><button id="show-pass" type="button" aria-label="Mostra password" aria-pressed="false">Mostra</button></div>'+
      (create?'<label>Conferma password<input id="account-confirm" type="password" autocomplete="new-password" maxlength="256" required placeholder="Ripeti la password"></label>':'')+
      (create&&legacy?'<label class="legacy-choice"><input type="checkbox" id="account-import"><span>Associa a questo profilo le lezioni e il quaderno della versione precedente presenti sul telefono.</span></label>':'')+
      '<p id="account-error" role="alert"></p><button class="btn account-submit" id="account-submit">'+(create?'Crea account':'Accedi')+' '+icon('arrow',16)+'</button></form><p id="account-service" class="account-service"></p></main></div>';
    el('account-service').textContent=accountStore.online?'Sincronizzazione online disponibile.':'Puoi creare un profilo su questo telefono o accedere a uno già salvato.';
    panel.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(!busy&&b.dataset.mode!==mode){mode=b.dataset.mode;render()}});
    el('show-pass').onclick=e=>{const f=el('account-pass'),show=f.type==='password';f.type=show?'text':'password';e.currentTarget.textContent=show?'Nascondi':'Mostra';e.currentTarget.setAttribute('aria-label',show?'Nascondi password':'Mostra password');e.currentTarget.setAttribute('aria-pressed',String(show))};
    el('account-form').onsubmit=async e=>{
      e.preventDefault();if(busy)return;
      const error=el('account-error'),button=el('account-submit'),username=el('account-user').value,password=el('account-pass').value;
      const name=create?el('account-name').value.trim():'',claim=create&&el('account-import')?.checked;
      if(create&&!name){error.textContent='Inserisci il nome da mostrare nel tuo profilo.';return}
      if(create&&password!==el('account-confirm').value){error.textContent='Le due password non coincidono.';return}
      busy=true;error.textContent='';button.disabled=true;button.textContent=create?'Creazione in corso…':'Accesso in corso…';
      try{
        const state=create?await accountStore.register(username,password,name,claim?legacy:null):await accountStore.login(username,password);
        if(claim){mobileHost.write('lingora.school.1','');legacy=null}
        panel.replaceChildren();document.body.classList.remove('locked');
        const route=typeof state.lastRoute==='string'&&/^(aula|corsi|grammatica|dialoghi|esercizi|quaderno|progressi|sessione|corso\/(en|es)|suoni\/(en|es)|lezione\/(en|es)-[1-9][0-9]?|scheda\/(grammatica|dialoghi)\/(en|es)-[1-9][0-9]?)$/.test(state.lastRoute)?state.lastRoute:'aula';
        history.replaceState(null,'',location.href.split('#')[0]+'#'+route);
        startApp(state);
      }catch(err){error.textContent=err.message||'Operazione non riuscita. Riprova.';button.disabled=false;button.textContent=create?'Crea account':'Accedi'}
      finally{busy=false}
    };
  }
  function begin(){
    document.body.classList.add('locked');
    legacy=readLegacy();render();
    accountStore.checkService().then(ready=>{const note=el('account-service');if(note&&ready)note.textContent='Sincronizzazione online disponibile.'});
  }
  return {begin};
})();
