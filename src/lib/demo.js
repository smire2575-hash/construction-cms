import {ALL_MODULES,MONTHLY_PRICES} from './catalog';
// CMS v0.2 intentionally starts with NO customer data, numbers, emails or fictitious businesses.
// This store is browser-only and is not a substitute for production storage.
const KEY='cms_v2_blank_demo';
const blankContact=()=>({name:'',email:'',phone:'',whatsapp:'',website:'',address:'',city:'',country:'',tax_id:''});
export function demoInit(){return {
 meta:{companyId:'',user:'',branch:'',lastId:0},
 platformSettings:{name:'Construction Management System',short_name:'CMS',tagline:'Plan • Build • Manage • Succeed',...blankContact(),invoice_footer:''},
 companyProfile:{...blankContact(),base_currency:'USD'},
 companies:[],products:[],contacts:[],sales:[],purchases:[],expenses:[],tasks:[],employees:[],audit:[],
 platformInvoices:[],platformPayments:[],payments:[],branches:[],warehouses:[],
 moduleRecords:{},enabledModules:ALL_MODULES,limits:{branches:1,warehouses:1,employees:5},isDemo:true
}}
export function readDemo(){try{const raw=localStorage.getItem(KEY);if(raw)return {...demoInit(),...JSON.parse(raw)}}catch{}return demoInit()}
export function writeDemo(data){localStorage.setItem(KEY,JSON.stringify(data))}
export function resetDemo(){localStorage.removeItem(KEY);return demoInit()}
export const modulePrice = (name)=>MONTHLY_PRICES[name]||0;
