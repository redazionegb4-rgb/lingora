'use strict';
const accountStore = (() => {
  const text = new TextEncoder(), decoder = new TextDecoder();
  const clone = value => JSON.parse(JSON.stringify(value));
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const idPattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;
  const mapKeys = ['days','done','exams','year','drafts'];
  const setKeys = ['mistakes','saved'];
  const simpleKeys = ['name','dailyGoal','last','run','lastRoute','sectionFilters'];
  let session=null, timer=0, online=false, changed=()=>{}, onStatus=()=>{};
  const initState = name => ({name,dailyGoal:1,done:{},days:{},attempts:0,correct:0,mistakes:[],saved:[],drafts:{},last:'en-1',run:null});
  const hex = buf => Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('');
  function to64(buf){
    const a=new Uint8Array(buf);let raw='';
    for(let i=0;i<a.length;i+=8192)raw+=String.fromCharCode(...a.subarray(i,i+8192));
    return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function from64(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}
  function checkName(value){
    const name=value.trim().toLowerCase();
    if(!idPattern.test(name))throw Error('Usa da 3 a 32 caratteri per il nome utente: lettere, numeri, punto, trattino o trattino basso.');
    return name;
  }
  async function credentials(username,password){
    if(!crypto.subtle)throw Error('Aggiorna il componente WebView del telefono per aprire i profili protetti.');
    const user=checkName(username);
    const digest=await crypto.subtle.digest('SHA-256',text.encode('Lingora/utente/v1/'+user));
    const base=await crypto.subtle.importKey('raw',text.encode(password),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:digest,iterations:600000,hash:'SHA-256'},base,256);
    const root=await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveBits']);
    const parts=new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt:digest,info:text.encode('Lingora/profilo/v1')},root,512));
    const key=await crypto.subtle.importKey('raw',parts.subarray(0,32),'AES-GCM',false,['encrypt','decrypt']);
    return {user,id:hex(digest),key,proof:hex(parts.subarray(32))};
  }
  async function seal(s,data,scope){
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:text.encode(s.id+'/'+scope)},s.key,text.encode(JSON.stringify(data)));
    const box=new Uint8Array(12+cipher.byteLength);box.set(iv);box.set(new Uint8Array(cipher),12);return to64(box);
  }
  async function open(s,box,scope){
    const a=from64(box);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:a.slice(0,12),additionalData:text.encode(s.id+'/'+scope)},s.key,a.slice(12));
    return JSON.parse(decoder.decode(plain));
  }
  function start(c,data){
    const s={...c,data,writing:Promise.resolve(),syncing:null,leaving:false,status:'Salvato su questo telefono'};
    session=s;return s;
  }
  function pack(s){
    const snapshot=JSON.stringify(s.data);
    s.writing=s.writing.catch(()=>{}).then(async()=>{
      const encrypted=await seal(s,JSON.parse(snapshot),'local');
      await accountIO.save(s.id,encrypted);
    });
    return s.writing;
  }
  function status(s,message){if(session===s){s.status=message;onStatus(message)}}
  function initial(state,linked=false){
    return {v:1,device:hex(crypto.getRandomValues(new Uint8Array(16))),seq:0,base:clone(state),work:clone(state),pending:null,linked};
  }
  function applyDelta(target,before,after){
    const result=clone(target);
    for(const k of simpleKeys)if(!equal(before[k],after[k])&&after[k]!==undefined)result[k]=clone(after[k]);
    for(const k of ['attempts','correct'])result[k]=(target[k]||0)+Math.max(0,(after[k]||0)-(before[k]||0));
    for(const k of setKeys){
      const old=new Set(before[k]||[]), now=new Set(after[k]||[]), joined=new Set(target[k]||[]);
      for(const id of old)if(!now.has(id))joined.delete(id);
      for(const id of now)if(!old.has(id))joined.add(id);
      result[k]=Array.from(joined);
    }
    for(const k of mapKeys){
      const old=before[k]||{},now=after[k]||{},merged={...(target[k]||{})};
      for(const id of new Set([...Object.keys(old),...Object.keys(now)])){
        if(equal(old[id],now[id])||['__proto__','constructor','prototype'].includes(id))continue;
        if(k==='days')merged[id]=(merged[id]||0)+Math.max(0,(now[id]||0)-(old[id]||0));
        else if(k==='exams')merged[id]=Math.max(merged[id]||0,now[id]||0);
        else if(k==='done')merged[id]=Boolean(merged[id]||now[id]);
        else if(now[id]!==undefined)merged[id]=clone(now[id]);
        else delete merged[id];
      }
      if(Object.keys(merged).length || k in target || k in after)result[k]=merged;
    }
    return result;
  }
  async function api(s,method,body){return accountIO.api(method,'/v1/profile/'+s.id,s.proof,body)}
  function stamp(s){return {state:clone(s.data.base),clocks:{[s.data.device]:s.data.seq}}}
  async function remoteState(s,r){
    if(r.status!==200)throw Error(r.status===401?'Credenziali online non riconosciute.':'Servizio online non raggiungibile.');
    return open(s,r.data.box,'cloud');
  }
  async function checkService(){
    try {const response=await accountIO.api('GET','/v1/status','');online=response.status===200&&response.data.service==='lingora'}
    catch{online=false}
    return online;
  }
  async function register(user,password,name,legacy){
    if(password.length<10||password.length>256)throw Error('Scegli una password tra 10 e 256 caratteri.');
    const c=await credentials(user,password);
    if(await accountIO.load(c.id))throw Error('Su questo telefono esiste già un profilo con questo nome utente.');
    const state={...initState(name),...(legacy||{}),name};
    const data=initial(state),s=start(c,data);
    try{
      if(online){
        const result=await api(s,'POST',{box:await seal(s,stamp(s),'cloud')});
        if(result.status===409)throw Error('Nome utente già in uso. Scegline un altro oppure accedi.');
        if(result.status!==201)throw Error('Iscrizione online non riuscita. Riprova tra poco.');
        data.linked=true;
      }
      await pack(s);return clone(state);
    }catch(e){session=null;throw e}
  }
  async function login(user,password){
    const c=await credentials(user,password),record=await accountIO.load(c.id);
    if(record){
      let data;try{data=await open(c,record,'local')}catch{throw Error('Nome utente o password non corretti.')}
      const s=start(c,data);return clone(s.data.work);
    }
    if(!online&&!await checkService())throw Error('Questo profilo non è salvato sul telefono. Per il primo accesso serve il servizio online.');
    const result=await api(c,'GET');
    if(result.status===401)throw Error('Nome utente o password non corretti.');
    const cloud=await remoteState(c,result),s=start(c,initial(cloud.state,true));
    try{await pack(s)}catch(e){session=null;throw e}return clone(s.data.work);
  }
  async function syncNow(s){
    if(!online&&!await checkService()){status(s,'Salvato su questo telefono');return}
    if(session!==s||s.leaving)return;
    let result=await api(s,'GET');
    if(result.status===401&&!s.data.linked){
      const created=await api(s,'POST',{box:await seal(s,stamp(s),'cloud')});
      if(created.status===409){status(s,'Nome utente già utilizzato online. Il profilo resta su questo telefono.');return}
      if(created.status!==201)throw Error('Servizio online non raggiungibile.');
      s.data.linked=true;await pack(s);result=await api(s,'GET');
    }
    for(let n=0;n<4;n++){
      const cloud=await remoteState(s,result);
      if(session!==s||s.leaving)return;
      const d=s.data;
      if(!d.pending&&!equal(d.base,d.work)){
        d.pending={seq:d.seq+1,at:clone(d.work)};
        await pack(s);
      }
      const p=d.pending;
      if(p&&(cloud.clocks[d.device]||0)<p.seq){
        cloud.state=applyDelta(cloud.state,d.base,p.at);
        cloud.clocks[d.device]=p.seq;
        const out=await api(s,'PUT',{rev:result.data.rev,box:await seal(s,cloud,'cloud')});
        if(out.status===409){result=await api(s,'GET');continue}
        if(out.status!==200)throw Error('Sincronizzazione in attesa.');
      }
      if(session!==s||s.leaving)return;
      const previous=d.work;
      d.work=applyDelta(cloud.state,p?p.at:d.base,d.work);
      d.base=clone(cloud.state);d.linked=true;
      if(p){d.seq=p.seq;d.pending=null}
      await pack(s);
      if(session!==s||s.leaving)return;
      if(!equal(previous,d.work))changed(clone(d.work));
      status(s,'Sincronizzato');if(!equal(d.work,d.base))schedule();
      return;
    }
    status(s,'Aggiornamenti in attesa');schedule();
  }
  function sync(){
    const s=session;if(!s||s.leaving)return Promise.resolve();
    if(!s.syncing)s.syncing=syncNow(s).catch(()=>{online=false;status(s,'Salvato sul telefono · sincronizzazione in attesa')}).finally(()=>{s.syncing=null});
    return s.syncing;
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(sync,1000)}
  function save(state){
    const s=session;if(!s||s.leaving||equal(s.data.work,state))return;
    s.data.work=clone(state);status(s,'Salvataggio in corso…');
    pack(s).then(()=>{if(session===s&&!s.leaving)status(s,'Salvato su questo telefono')}).catch(()=>status(s,'Salvataggio non riuscito. Controlla lo spazio libero.'));
    schedule();
  }
  async function logout(){
    const s=session;if(!s)return;
    clearTimeout(timer);
    if(online&&(s.syncing||s.data.pending||!equal(s.data.work,s.data.base))){
      await sync();
      if(online&&(s.data.pending||!equal(s.data.work,s.data.base)))await sync();
    }
    s.leaving=true;clearTimeout(timer);
    try{await pack(s)}catch(e){s.leaving=false;throw e}
    session=null;changed=()=>{};onStatus=()=>{};
  }
  return {login,register,save,sync,logout,checkService,
    get user(){return session?.user||''},get status(){return session?.status||''},get online(){return online},
    bind(onChanged,onMessage){changed=onChanged;onStatus=onMessage;schedule()}
  };
})();
