const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../preview/app.js'),'utf8');
const store={};const app={innerHTML:''};
const document={getElementById(id){return id==='app'?app:null},querySelectorAll(){return[]}};
const context={console,document,Intl,Date,Math,crypto:require('node:crypto').webcrypto,
 localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v}},
 alert(){},confirm(){return true},window:{},URL,Blob};
vm.createContext(context);vm.runInContext(html+'\nthis.__cms={db,render,handleAction,MODULES,blank,mode};',context);
const {db,render,MODULES,blank}=context.__cms;
assert.equal(MODULES.length,24,'CMS must list all 24 modules');
assert.equal(db.companies.length,0,'No fictitious SaaS customers');
assert.equal(db.contacts.length,0,'No fictitious end customers');
assert.equal(db.products.length,0,'No fictitious products');
assert.equal(db.platform.email,'','CMS seller email blank');
assert.equal(db.platform.phone,'','CMS seller phone blank');
assert.equal(db.tenant.email,'','company email blank');
assert.equal(db.tenant.phone,'','company phone blank');
assert.ok(app.innerHTML.includes('Dashboard'));
assert.ok(app.innerHTML.includes('Super Admin'));
assert.ok(!app.innerHTML.includes('Bilan Construction Ltd'),'no old seeded accounts');
const sku={id:'p1',sku:'T-1',name:'Test product',category:'Test',unit:'PCS',cost:5,price:8,stock:3,low:1};
db.products.unshift(sku);context.__cms.render();assert.ok(app.innerHTML.includes('Test product'));
db.products.length=0;context.__cms.render();
console.log('PASS: 24 modules, blank contact fields, no fabricated customers, UI render and empty state');
