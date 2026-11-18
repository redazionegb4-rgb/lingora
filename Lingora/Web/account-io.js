'use strict';
const accountIO=(()=>{
  const base='https://lingora-account.demetrio-barreca1987.chatgpt.site';
  const android=window.LingoraAndroid, apple=window.webkit?.messageHandlers?.lingoraAccount;
  let serial=0;const requests=new Map();
  window.lingoraAccountResult=(id,status,body)=>{
    const done=requests.get(id);if(!done)return;
    requests.delete(id);let data={};try{data=JSON.parse(body)}catch{}
    done({status,data});
  };
  async function api(method,path,proof='',payload){
    const body=payload===undefined?'':JSON.stringify(payload);
    if(android || apple){
      return new Promise((resolve,reject)=>{
        const id=++serial;
        const timeout=setTimeout(()=>{requests.delete(id);reject(Error('Servizio non raggiungibile.'))},14000);
        requests.set(id,response=>{clearTimeout(timeout);resolve(response)});
        try{
          if(android)android.accountRequest(id,method,path,proof,body);
          else apple.postMessage({action:'request',id,method,path,proof,body})
            .then(response=>window.lingoraAccountResult(id,response.status,response.text))
            .catch(()=>window.lingoraAccountResult(id,0,''));
        }catch{window.lingoraAccountResult(id,0,'')}
      });
    }
    const r=await fetch(base+path,{method,headers:{...(proof?{Authorization:'Bearer '+proof}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body||undefined,credentials:'omit',redirect:'error',cache:'no-store'});
    return {status:r.status,data:await r.json()};
  }
  async function load(id){
    if(android)return android.readProfile(id);
    if(apple)return apple.postMessage({action:'read',key:id});
    return localStorage.getItem('lingora.profile.'+id)||'';
  }
  async function save(id,value){
    if(android){if(!android.writeProfile(id,value))throw Error('Il salvataggio sul telefono non è riuscito.');return}
    if(apple){await apple.postMessage({action:'write',key:id,value});return}
    localStorage.setItem('lingora.profile.'+id,value);
  }
  return {api,load,save};
})();
