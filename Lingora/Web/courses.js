const courseInfo={
  en:{title:'Inglese',native:'English',locale:'en-GB',city:'Londra',image:'london',people:['A','B'],description:'Dall’alfabeto inglese alla conversazione e alla scrittura argomentativa.'},
  es:{title:'Spagnolo',native:'Español',locale:'es-ES',city:'Madrid',image:'madrid',people:['A','B'],description:'Dalle prime vocali spagnole alla comprensione e alla produzione di testi.'}
};
const stages=[
  {title:'Elementari',start:0,end:5,desc:'Cinque anni per imparare suoni, parole e frasi della vita quotidiana.'},
  {title:'Medie',start:5,end:8,desc:'Tre anni per raccontare esperienze, fare domande e confrontare idee.'},
  {title:'Superiori',start:8,end:13,desc:'Cinque anni di lettura, scrittura, analisi e argomentazione.'}
];
const yearNames=['Prima elementare','Seconda elementare','Terza elementare','Quarta elementare','Quinta elementare','Prima media','Seconda media','Terza media','Prima superiore','Seconda superiore','Terza superiore','Quarta superiore','Quinta superiore'];
const lessons={en:[],es:[]};
function makeLesson(lang,index,record){
  return {...record,lang,index,id:lang+'-'+(index+1),year:Math.floor(index/6),inYear:index%6,
    tasks:[
      {type:'choice',prompt:record.quiz[0],answer:record.quiz[1],options:record.quiz.slice(1,4),why:record.quiz[4]},
      {type:'gap',prompt:record.gap[0],answer:record.gap[1],why:record.gap[2]},
      {type:'write',prompt:record.writing[0],answer:record.writing[1],alternatives:record.writing[2],why:record.writing[3]}
    ]};
}
for (const lang of ['en','es']) lessons[lang]=bundledLessons[lang].map((row,i)=>makeLesson(lang,i,row));
const curriculumReady=Promise.resolve();
