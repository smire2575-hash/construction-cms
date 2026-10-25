import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
import crypto from 'node:crypto';

const app=express();app.disable('x-powered-by');app.use(helmet());
app.use(cors({origin:(process.env.FRONTEND_URL||'http://localhost:5173').split(','),allowedHeaders:['Authorization','Content-Type','X-Company-Id'],methods:['GET','POST','PATCH','PUT','DELETE','OPTIONS']}));
app.use(express.json({limit:'256kb'}));
app.use('/api',rateLimit({windowMs:60_000,limit:150,standardHeaders:'draft-7',legacyHeaders:false}));
const url=process.env.SUPABASE_URL;
const publishable=process.env.SUPABASE_PUBLISHABLE_KEY;
const secret=process.env.SUPABASE_SECRET_KEY;
const authRedirectTo=process.env.SUPABASE_AUTH_REDIRECT_URL||((process.env.FRONTEND_URL||'http://localhost:5173').split(',')[0].trim());
if(!url||!publishable||!secret) console.warn('CMS API: Supabase env not configured. Set backend/.env before using live API.');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const authClient=url&&publishable?createClient(url,publishable,options):null;
const admin=url&&secret?createClient(url,secret,options):null;
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const fail=(code,message)=>{const err=new Error(message);err.status=code;throw err};
async function check(result){const r=await result;if(r.error)fail(400,r.error.message);return r.data;}
const safeText=z.string().trim().min(1).max(200);
const productShape=z.object({name:safeText,sku:safeText.max(40),category:z.string().trim().default('General'),unit:z.string().trim().default('Piece'),cost:z.coerce.number().nonnegative(),price:z.coerce.number().nonnegative(),stock:z.coerce.number().nonnegative().default(0),low:z.coerce.number().nonnegative().default(0)});
const contactShape=z.object({name:safeText,kind:z.enum(['Customer','Supplier']).default('Customer'),
 email:z.union([z.string().trim().email().max(190),z.literal('')]).default(''),
 phone:z.string().trim().max(45).default(''),whatsapp:z.string().trim().max(45).default(''),
 address:z.string().trim().max(1000).default(''),company_name:z.string().trim().max(200).default(''),
 tax_id:z.string().trim().max(90).default(''),notes:z.string().trim().max(3000).default(''),
 balance:z.coerce.number().default(0)});
const expenseShape=z.object({name:safeText,category:z.string().trim().max(70),amount:z.coerce.number().positive(),date:z.string().regex(/^\d{4}-\d\d-\d\d$/)});
const taskShape=z.object({title:safeText,owner:z.string().trim().max(120).default(''),due:z.string().regex(/^\d{4}-\d\d-\d\d$/)});
const purchaseShape=z.object({supplier:safeText,product:safeText,qty:z.coerce.number().positive(),total:z.coerce.number().nonnegative()});
async function requireAuth(req,res,next){if(!authClient||!admin)return res.status(503).json({error:'Supabase server not configured'});
  try{const header=req.get('Authorization')||'';if(!header.startsWith('Bearer '))fail(401,'Authorization Bearer token required');
   // getUser verifies the provided access token with Supabase Auth server.
   const {data,error}=await authClient.auth.getUser(header.slice(7));if(error||!data?.user)fail(401,'Invalid or expired Supabase token');
   req.authUser=data.user;let {data:profile,error:pe}=await admin.from('profiles').select('*').eq('id',data.user.id).maybeSingle();if(pe)fail(500,pe.message);
   req.profile=profile||{id:data.user.id,full_name:data.user.email,is_platform_admin:false};next();
  }catch(e){next(e)}}
app.get('/api/v1/health',(req,res)=>res.json({status:'ok',application:'CMS API',database:url?'supabase configured':'not configured',timestamp:new Date().toISOString()}));
app.use('/api/v1',requireAuth);
async function loadMembership(req,res,next){if(req.profile.is_platform_admin){req.isPlatformAdmin=true;return next();}
 try{const {data,error}=await admin.from('company_memberships').select('*,companies:company_id(id,name,status,base_currency)').eq('user_id',req.authUser.id).eq('status','Active');if(error)fail(500,error.message);
  const requested=req.get('X-Company-Id');const membership=(data||[]).find(m=>!requested||m.company_id===requested);if(!membership)fail(403,'No active company membership');
  req.membership=membership;req.companyId=membership.company_id;
  const [{data:subscription,error:se},{data:entitlements,error:ee}]=await Promise.all([
   admin.from('subscriptions').select('status,ends_at,starts_at').eq('company_id',req.companyId).in('status',['Active','Trial']).order('ends_at',{ascending:false}).limit(1).maybeSingle(),
   admin.from('company_modules').select('module_code,enabled').eq('company_id',req.companyId)
  ]);
  if(se||ee)fail(500,se?.message||ee?.message);
  req.subscriptionActive=!!subscription&&new Date(subscription.ends_at).getTime()>Date.now()&&new Date(subscription.starts_at).getTime()<=Date.now()&&membership.companies?.status==='Active';
  req.enabledModules=(entitlements||[]).filter(e=>e.enabled).map(e=>e.module_code);
  next();
 }catch(e){next(e)}}
// Accept a pending company invitation after Supabase email link sign-in.
app.post('/api/v1/accept-invitation',wrap(async(req,res)=>{
 const input=z.object({company_id:z.string().uuid().optional()}).parse(req.body||{});
 let companyId=input.company_id;
 if(!companyId){const rows=await check(admin.from('company_invitations').select('company_id').eq('invited_user_id',req.authUser.id).eq('status','Pending').gt('expires_at',new Date().toISOString()));
  if(rows.length!==1)fail(409,'Choose company_id; there must be exactly one current invitation for automatic acceptance');
  companyId=rows[0].company_id;}
 const {data,error}=await admin.rpc('cms_accept_company_invitation',{p_user:req.authUser.id,p_company:companyId});
 if(error)fail(409,error.message);res.json({activated:true,company_id:companyId,membership_id:data});
}));
app.use('/api/v1',loadMembership);
function tenant(module,action='view'){
 return (req,res,next)=>{try{
  if(req.isPlatformAdmin)fail(403,'Platform Super Admin cannot access tenant business data by default');
  if(!req.subscriptionActive)fail(403,'Company subscription is expired/inactive. Renewal required.');
  if(module&&!req.enabledModules.includes(module)&&!['Settings','Dashboards','Apps'].includes(module))fail(403,`Module unavailable: ${module}`);
  const role=req.membership.role;
  // v0.1 safety gate: branch-specific employee authorization is not complete.
  // Deny all non-owner business operations until proper branch/role scoping ships.
  if(role!=='Primary Owner')fail(403,'v0.1 live API currently allows only Primary Owner for tenant business operations. Employee branch permissions are not production-ready.');
  next();}catch(err){next(err)}};
}
function companyScope(req,q){return q.eq('company_id',req.companyId)}
app.get('/api/v1/session',wrap(async(req,res)=>{
 if(req.isPlatformAdmin)return res.json({isPlatformAdmin:true,profile:req.profile,modules:[],companyId:null});
 res.json({isPlatformAdmin:false,profile:req.profile,company:req.membership.companies,companyId:req.companyId,membership:req.membership,modules:req.enabledModules,subscriptionActive:req.subscriptionActive});
}));
app.get('/api/v1/modules',wrap(async(req,res)=>{const data=await check(admin.from('module_catalog').select('*').order('sort_order'));res.json({data})}));
app.get('/api/v1/products',tenant('Inventory'),wrap(async(req,res)=>{
 const products=await check(companyScope(req,admin.from('products').select('*').order('created_at',{ascending:false}).limit(400)));
 const stock=await check(companyScope(req,admin.from('stock_balances').select('product_id,quantity_on_hand')));
 const byProduct=new Map();for(const s of stock)byProduct.set(s.product_id,(byProduct.get(s.product_id)||0)+Number(s.quantity_on_hand));
 res.json({data:products.map(p=>({...p,stock:byProduct.get(p.id)||0}))});
}));
app.post('/api/v1/products',tenant('Inventory','create'),wrap(async(req,res)=>{
 const p=productShape.parse(req.body);
 const {data,error}=await admin.rpc('cms_create_product',{p_company:req.companyId,p_created_by:req.authUser.id,p_sku:p.sku,p_name:p.name,p_category:p.category,p_unit:p.unit,p_cost:p.cost,p_price:p.price,p_initial_stock:p.stock,p_low_stock:p.low});
 if(error)fail(400,error.message);res.status(201).json({id:data,message:'Product created and initial stock recorded'});
}));
for(const [path,table,module,shape,fields] of [
  ['contacts','contacts','Contacts',contactShape,['name','kind','email','phone','whatsapp','address','company_name','tax_id','notes','balance']],
  ['expenses','expenses','Expenses',expenseShape,['name','category','amount','date']],
  ['tasks','tasks','To-do',taskShape,['title','owner','due']],
  ['purchases','purchases','Purchase',purchaseShape,['supplier','product','qty','total']]
]){
 app.get(`/api/v1/${path}`,tenant(module),wrap(async(req,res)=>{const data=await check(companyScope(req,admin.from(table).select('*').order('created_at',{ascending:false}).limit(300)));res.json({data})}));
 app.post(`/api/v1/${path}`,tenant(module,'create'),wrap(async(req,res)=>{
  const valid=shape.parse(req.body);const insert={company_id:req.companyId,created_by:req.authUser.id,...Object.fromEntries(fields.map(k=>[k,valid[k]]))};
  if(path==='expenses'||path==='tasks'||path==='purchases')insert.status='Pending';
  const data=await check(admin.from(table).insert(insert).select().single());res.status(201).json({data});
 }));
}
app.get('/api/v1/employees',tenant('Employees'),wrap(async(req,res)=>{
 const data=await check(companyScope(req,admin.from('company_memberships').select('id,role,status,profile:user_id(full_name,email)').order('created_at',{ascending:false})));res.json({data:data.map(m=>({id:m.id,name:m.profile?.full_name||m.profile?.email,email:m.profile?.email||'',role:m.role,branch:'Assigned branches',status:m.status}))});
}));
app.get('/api/v1/sales',tenant('Sales'),wrap(async(req,res)=>{
 const data=await check(companyScope(req,admin.from('sales').select('*').order('created_at',{ascending:false}).limit(300)));res.json({data});
}));
app.post('/api/v1/sales',tenant('Sales','create'),wrap(async(req,res)=>{
 const payload=z.object({product_id:z.string().uuid(),quantity:z.coerce.number().positive(),payment_type:z.enum(['Cash','Credit','Installment'])}).parse(req.body);
 const {data,error}=await admin.rpc('cms_post_sale',{p_company:req.companyId,p_actor:req.authUser.id,p_product:payload.product_id,p_qty:payload.quantity,p_payment_type:payload.payment_type});
 if(error)fail(400,error.message);res.status(201).json({id:data,message:'Sale, stock movement and double-entry journal posted atomically'});
}));
const allowedGeneric=new Set(['Discuss','Calendar','Appointments','Knowledge','CRM','Project','Planning','Surveys','Barcode','Sign','WhatsApp','Documents','To-do']);
app.get('/api/v1/module-records/:module',wrap(async(req,res)=>{const m=req.params.module;if(!allowedGeneric.has(m))fail(400,'Unsupported module record');tenant(m)(req,res,async()=>{try{const data=await check(companyScope(req,admin.from('module_records').select('*').eq('module_code',m).order('created_at',{ascending:false}).limit(300)));res.json({data})}catch(e){res.status(e.status||500).json({error:e.message})}})}));
app.post('/api/v1/module-records/:module',wrap(async(req,res)=>{const m=req.params.module;if(!allowedGeneric.has(m))fail(400,'Unsupported module record');tenant(m,'create')(req,res,async()=>{try{const v=z.object({name:safeText,description:z.string().max(2000).default(''),payload:z.record(z.unknown()).default({})}).parse(req.body);const data=await check(admin.from('module_records').insert({company_id:req.companyId,module_code:m,name:v.name,description:v.description,payload:v.payload,status:'Active',created_by:req.authUser.id}).select().single());res.status(201).json({data})}catch(e){res.status(e.status||400).json({error:e.message})}})}));
const storage=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1},fileFilter:(_req,file,cb)=>{
 const allowed=['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];cb(null,allowed.includes(file.mimetype));
 }});
app.post('/api/v1/files',tenant('Documents','create'),storage.single('file'),wrap(async(req,res)=>{
 if(!req.file)fail(400,'File missing or unsupported. Max 8MB (PDF, PNG/JPG/WEBP, TXT, XLSX).');
 const ext=(req.file.originalname.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'').slice(0,8).toLowerCase();
 const objectPath=`${req.companyId}/${crypto.randomUUID()}.${ext}`;
 const {error:uploadError}=await admin.storage.from('cms-private').upload(objectPath,req.file.buffer,{contentType:req.file.mimetype,upsert:false});if(uploadError)fail(400,uploadError.message);
 const {data,error}=await admin.from('documents').insert({company_id:req.companyId,name:req.file.originalname,storage_path:objectPath,mime_type:req.file.mimetype,size_bytes:req.file.size,uploaded_by:req.authUser.id}).select().single();
 if(error){await admin.storage.from('cms-private').remove([objectPath]);fail(500,error.message)}
 res.status(201).json({data});
}));
app.get('/api/v1/files/:id/signed-url',tenant('Documents'),wrap(async(req,res)=>{
 const doc=await check(companyScope(req,admin.from('documents').select('*').eq('id',req.params.id)).single());
 const {data,error}=await admin.storage.from('cms-private').createSignedUrl(doc.storage_path,60);if(error)fail(400,error.message);res.json({url:data.signedUrl,expiresIn:60});
}));
function platformOnly(req,res,next){return req.isPlatformAdmin?next():res.status(403).json({error:'Super Admin only'})}
app.get('/api/v1/platform/companies',platformOnly,wrap(async(req,res)=>{const data=await check(admin.from('companies').select('id,name,status,base_currency,created_at').order('created_at',{ascending:false}));res.json({data})}));
app.post('/api/v1/platform/companies',platformOnly,wrap(async(req,res)=>{
 const body=z.object({name:safeText,owner_email:z.union([z.string().email(),z.literal('')]).default(''),
  email:z.union([z.string().email(),z.literal('')]).default(''),phone:z.string().max(45).default(''),
  whatsapp:z.string().max(45).default(''),website:z.string().max(250).default(''),
  address:z.string().max(1500).default(''),trial_days:z.coerce.number().int().min(1).max(365).default(14),
  employee_seats:z.coerce.number().int().min(0).max(100000).default(5),
  max_branches:z.coerce.number().int().min(0).max(10000).default(1),
  max_warehouses:z.coerce.number().int().min(0).max(10000).default(1)}).parse(req.body);
 // Company can be saved as a Draft while the client has not provided an email or phone.
 // No Supabase user invitation is sent without an actual owner email.
 const company=await check(admin.from('companies').insert({name:body.name,status:'Pending',base_currency:'USD',
  email:body.email,phone:body.phone,whatsapp:body.whatsapp,website:body.website,address:body.address}).select().single());
 await check(admin.from('company_limits').insert({company_id:company.id,max_branches:body.max_branches,
   max_warehouses:body.max_warehouses,max_employee_seats:body.employee_seats}));
 if(!body.owner_email)return res.status(201).json({company_id:company.id,status:'Pending',invitation:'Not sent; owner email can be added later'});
 // Owner invited explicitly when actual email is known. This may fail; pending company remains safely inactive.
 try{
  const {data:inv,error:ie}=await admin.auth.admin.inviteUserByEmail(body.owner_email,{redirectTo:authRedirectTo});
  if(ie)throw ie;
  await check(admin.from('profiles').upsert({id:inv.user.id,email:body.owner_email,full_name:''}));
  await check(admin.from('company_memberships').insert({company_id:company.id,user_id:inv.user.id,role:'Primary Owner',status:'Invited'}));
  await check(admin.from('companies').update({primary_owner_id:inv.user.id}).eq('id',company.id));
  await check(admin.from('company_invitations').insert({company_id:company.id,invited_email:body.owner_email,
     invited_user_id:inv.user.id,role:'Primary Owner',invited_by:req.authUser.id}));
  return res.status(201).json({company_id:company.id,status:'Pending',invited:body.owner_email,
    message:'Company draft created. Invite pending acceptance; subscription starts separately after approval.'});
 }catch(e){return res.status(201).json({company_id:company.id,status:'Pending',invite_error:e.message,
   message:'Company draft saved; retry invitation after checking email configuration.'})}
}));
app.get('/api/v1/platform/modules',platformOnly,wrap(async(req,res)=>res.json({data:await check(admin.from('module_catalog').select('*'))})));

// v0.2 contact/settings endpoints. Real email/phone/address values are user-supplied only.
const optionalEmail=z.union([z.string().trim().email().max(190),z.literal('')]);
const platformSettingsShape=z.object({display_name:z.string().trim().min(1).max(180).optional(),
 short_name:z.string().trim().max(30).optional(),tagline:z.string().trim().max(160).optional(),
 legal_name:z.string().trim().max(200).optional(),email:optionalEmail.optional(),
 phone:z.string().trim().max(45).optional(),whatsapp:z.string().trim().max(45).optional(),
 website:z.string().trim().max(250).optional(),address:z.string().trim().max(1500).optional(),
 city:z.string().trim().max(150).optional(),country:z.string().trim().max(100).optional(),
 tax_id:z.string().trim().max(90).optional(),invoice_footer:z.string().trim().max(1200).optional()}).strict();
const companyContactShape=z.object({name:z.string().trim().min(1).max(200).optional(),
 email:optionalEmail.optional(),phone:z.string().trim().max(45).optional(),whatsapp:z.string().trim().max(45).optional(),
 website:z.string().trim().max(250).optional(),address:z.string().trim().max(1500).optional(),
 city:z.string().trim().max(150).optional(),country:z.string().trim().max(100).optional(),
 tax_id:z.string().trim().max(90).optional(),billing_contact_name:z.string().trim().max(150).optional()}).strict();
function requirePlatform(req,res,next){if(!req.isPlatformAdmin)return next(Object.assign(new Error('Super Admin only'),{status:403}));next()}
async function auditEvent(req,action,entity_type,entity_id,metadata={}){
 const {error}=await admin.from('audit_events').insert({company_id:req.companyId||null,actor:req.authUser.id,action,entity_type,entity_id,metadata});
 if(error)console.error('Audit insert failed:',error.message);
}
app.get('/api/v1/platform/settings',requirePlatform,wrap(async(req,res)=>{
 const data=await check(admin.from('platform_settings').select('*').eq('id',1).single());res.json({data});
}));
app.put('/api/v1/platform/settings',requirePlatform,wrap(async(req,res)=>{
 const settings=platformSettingsShape.parse(req.body);
 const data=await check(admin.from('platform_settings').update({...settings,updated_by:req.authUser.id,updated_at:new Date().toISOString()}).eq('id',1).select().single());
 await auditEvent(req,'platform_settings_update','platform_settings',null,{fields:Object.keys(settings)});res.json({data});
}));
app.get('/api/v1/company/profile',tenant('Settings'),wrap(async(req,res)=>{
 const data=await check(admin.from('companies').select('id,name,email,phone,whatsapp,website,address,city,country,tax_id,billing_contact_name,base_currency,status').eq('id',req.companyId).single());res.json({data});
}));
app.put('/api/v1/company/profile',tenant('Settings','manage'),wrap(async(req,res)=>{
 const patch=companyContactShape.parse(req.body);
 const data=await check(admin.from('companies').update(patch).eq('id',req.companyId).select('id,name,email,phone,whatsapp,website,address,city,country,tax_id,billing_contact_name,base_currency,status').single());
 await auditEvent(req,'company_profile_update','company',req.companyId,{fields:Object.keys(patch)});res.json({data});
}));
app.patch('/api/v1/contacts/:id',tenant('Contacts','edit'),wrap(async(req,res)=>{
 const patch=contactShape.partial().parse(req.body);if(!Object.keys(patch).length)fail(422,'No changes supplied');
 const data=await check(admin.from('contacts').update(patch).eq('company_id',req.companyId).eq('id',req.params.id).select().single());
 await auditEvent(req,'contact_update','contact',data.id,{fields:Object.keys(patch)});res.json({data});
}));
app.delete('/api/v1/contacts/:id',tenant('Contacts','delete_draft'),wrap(async(req,res)=>{
 // Contact soft-delete requires a lifecycle/archived column; do not hard-delete data linked to finance.
 fail(409,'Delete unavailable: archive workflow must be used to preserve linked business records');
}));
app.get('/api/v1/platform/companies/:id',requirePlatform,wrap(async(req,res)=>{
 const data=await check(admin.from('companies').select('*').eq('id',req.params.id).single());res.json({data});
}));
app.patch('/api/v1/platform/companies/:id',requirePlatform,wrap(async(req,res)=>{
 const patch=companyContactShape.extend({status:z.enum(['Pending','Active','Suspended','Closed']).optional()}).parse(req.body);
 if(patch.status==='Active')fail(409,'Cannot activate a company without an accepted owner invite and verified subscription');
 const data=await check(admin.from('companies').update(patch).eq('id',req.params.id).select().single());
 await auditEvent(req,'platform_company_edit','company',data.id,{fields:Object.keys(patch)});res.json({data});
}));
app.post('/api/v1/platform/companies/:id/invite-owner',requirePlatform,wrap(async(req,res)=>{
 const {email}=z.object({email:z.string().email()}).parse(req.body);
 const company=await check(admin.from('companies').select('id,status,primary_owner_id').eq('id',req.params.id).single());
 if(company.primary_owner_id)fail(409,'Company already has primary owner. Use approved ownership transfer instead.');
 const {data:inv,error}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:authRedirectTo});if(error)fail(400,error.message);
 await check(admin.from('profiles').upsert({id:inv.user.id,email,full_name:''}));
 await check(admin.from('company_memberships').insert({company_id:company.id,user_id:inv.user.id,role:'Primary Owner',status:'Invited'}));
 await check(admin.from('companies').update({primary_owner_id:inv.user.id}).eq('id',company.id));
 await check(admin.from('company_invitations').insert({company_id:company.id,invited_email:email,invited_user_id:inv.user.id,role:'Primary Owner',invited_by:req.authUser.id}));
 await auditEvent(req,'owner_invited','company',company.id,{});res.status(201).json({company_id:company.id,invited:true});
}));
app.get('/api/v1/platform/invoices',requirePlatform,wrap(async(req,res)=>{
 res.json({data:await check(admin.from('platform_invoices').select('*').order('created_at',{ascending:false}).limit(400))});
}));
app.get('/api/v1/platform/payments',requirePlatform,wrap(async(req,res)=>{
 res.json({data:await check(admin.from('platform_payments').select('*').order('created_at',{ascending:false}).limit(400))});
}));
app.get('/api/v1/platform/audit',requirePlatform,wrap(async(req,res)=>{
 res.json({data:await check(admin.from('audit_events').select('*').order('created_at',{ascending:false}).limit(400))});
}));
app.get('/api/v1/platform/companies/:id/entitlements',requirePlatform,wrap(async(req,res)=>{
 const [modules,limits]=await Promise.all([
  check(admin.from('company_modules').select('module_code,enabled,agreed_monthly').eq('company_id',req.params.id)),
  check(admin.from('company_limits').select('*').eq('company_id',req.params.id).single())]);
 res.json({modules,limits});
}));
app.put('/api/v1/platform/companies/:id/limits',requirePlatform,wrap(async(req,res)=>{
 const body=z.object({max_branches:z.number().int().min(0).max(10000),max_warehouses:z.number().int().min(0).max(10000),max_employee_seats:z.number().int().min(0).max(100000)}).parse(req.body);
 const data=await check(admin.from('company_limits').update({...body,updated_at:new Date().toISOString()}).eq('company_id',req.params.id).select().single());
 await auditEvent(req,'resource_limits_change','company',req.params.id,body);res.json({data});
}));
app.put('/api/v1/platform/companies/:id/entitlements',requirePlatform,wrap(async(req,res)=>{
 const body=z.object({modules:z.array(z.object({code:z.string(),enabled:z.boolean(),agreed_monthly:z.number().nonnegative().default(0)})).max(24)}).parse(req.body);
 const catalog=await check(admin.from('module_catalog').select('code'));
 const valid=new Set(catalog.map(x=>x.code));if(body.modules.some(m=>!valid.has(m.code)))fail(422,'Unknown module code');
 if(new Set(body.modules.map(x=>x.code)).size!==body.modules.length)fail(422,'Duplicate module');
 if(body.modules.length){await check(admin.from('company_modules').upsert(body.modules.map(m=>({company_id:req.params.id,module_code:m.code,enabled:m.enabled,agreed_monthly:m.agreed_monthly})),{onConflict:'company_id,module_code'}));}
 await auditEvent(req,'entitlements_change','company',req.params.id,{modules:body.modules.map(m=>m.code)});
 res.json({updated:body.modules.length});
}));
app.post('/api/v1/inventory/receive',tenant('Inventory','post'),wrap(async(req,res)=>{
 const body=z.object({product_id:z.string().uuid(),quantity:z.coerce.number().positive(),unit_cost:z.coerce.number().nonnegative(),reference:z.string().max(80).default('')}).parse(req.body);
 const {data,error}=await admin.rpc('cms_receive_stock',{p_company:req.companyId,p_actor:req.authUser.id,p_product:body.product_id,p_qty:body.quantity,p_unit_cost:body.unit_cost,p_reference:body.reference});
 if(error)fail(400,error.message);res.status(201).json({id:data,message:'Stock received and moving-average unit cost updated'});
}));
app.get('/api/v1/sales/:id/payments',tenant('Sales','view'),wrap(async(req,res)=>{
 const sale=await check(admin.from('sales').select('id').eq('company_id',req.companyId).eq('id',req.params.id).single());
 const data=await check(admin.from('payments').select('*').eq('company_id',req.companyId).eq('sale_id',sale.id));res.json({data});
}));
app.post('/api/v1/sales/:id/payments',tenant('Sales','post'),wrap(async(req,res)=>{
 const body=z.object({amount:z.coerce.number().positive(),method:z.enum(['Cash','Bank','Mobile Money','Other'])}).parse(req.body);
 const {data,error}=await admin.rpc('cms_record_sale_payment',{p_company:req.companyId,p_actor:req.authUser.id,p_sale:req.params.id,p_amount:body.amount,p_method:body.method});
 if(error)fail(400,error.message);res.status(201).json({id:data,message:'Payment recorded against customer receivable'});
}));
app.get('/api/v1/payments',tenant('Sales','view'),wrap(async(req,res)=>{
 res.json({data:await check(admin.from('payments').select('id,sale_id,amount,method,created_at').eq('company_id',req.companyId).order('created_at',{ascending:false}).limit(400))});
}));
app.get('/api/v1/accounting/journal',tenant('Accounting','view'),wrap(async(req,res)=>{
 const data=await check(admin.from('journal_entries').select('id,branch_id,source_type,source_id,memo,posted_at,journal_lines(account_code,debit,credit)').eq('company_id',req.companyId).order('posted_at',{ascending:false}).limit(300));res.json({data});
}));
// Explicit activation: company contact information can remain blank; no fabricated email/phone needed.
app.post('/api/v1/platform/companies/:id/activate-trial',requirePlatform,wrap(async(req,res)=>{
 const payload=z.object({days:z.coerce.number().int().min(1).max(365),modules:z.array(z.string()).min(1).max(24)}).parse(req.body);
 if(new Set(payload.modules).size!==payload.modules.length)fail(422,'Duplicate module selected');
 const {data,error}=await admin.rpc('cms_activate_company_trial',{p_company:req.params.id,p_actor:req.authUser.id,p_days:payload.days,p_modules:payload.modules});
 if(error)fail(409,error.message);res.status(201).json({status:'Trial',expires_at:data});
}));
app.post('/api/v1/company/ownership-transfers',tenant('Settings','manage'),wrap(async(req,res)=>{
 if(req.membership.role!=='Primary Owner')fail(403,'Only current Primary Owner may request transfer');
 const payload=z.object({to_user_id:z.string().uuid(),reason:z.string().max(1000).default('')}).parse(req.body);
 if(payload.to_user_id===req.authUser.id)fail(400,'Cannot transfer ownership to yourself');
 const target=await check(admin.from('company_memberships').select('id,role,status').eq('company_id',req.companyId).eq('user_id',payload.to_user_id).maybeSingle());
 if(!target||target.status!=='Active')fail(422,'New owner must be an active company member');
 const data=await check(admin.from('ownership_transfers').insert({company_id:req.companyId,from_user_id:req.authUser.id,to_user_id:payload.to_user_id,reason:payload.reason,status:'Pending'}).select().single());
 await auditEvent(req,'owner_transfer_requested','ownership_transfer',data.id);res.status(201).json({data});
}));
app.post('/api/v1/company/ownership-transfers/:id/accept',tenant('Settings'),wrap(async(req,res)=>{
 const transfer=await check(admin.from('ownership_transfers').select('*').eq('company_id',req.companyId).eq('id',req.params.id).single());
 if(transfer.to_user_id!==req.authUser.id||transfer.status!=='Pending')fail(403,'Recipient can only accept own pending transfer');
 const data=await check(admin.from('ownership_transfers').update({status:'Accepted'}).eq('company_id',req.companyId).eq('id',transfer.id).eq('status','Pending').select().single());
 await auditEvent(req,'owner_transfer_accepted','ownership_transfer',data.id);res.json({data});
}));
app.get('/api/v1/platform/ownership-transfers',requirePlatform,wrap(async(req,res)=>{
 res.json({data:await check(admin.from('ownership_transfers').select('*').order('requested_at',{ascending:false}).limit(200))});
}));
app.post('/api/v1/platform/ownership-transfers/:id/approve',requirePlatform,wrap(async(req,res)=>{
 const body=z.object({old_owner_role:z.enum(['Archived','Additional Owner']).default('Archived')}).parse(req.body||{});
 const {data,error}=await admin.rpc('cms_finish_owner_transfer',{p_transfer:req.params.id,p_platform_admin:req.authUser.id,p_old_owner_role:body.old_owner_role});
 if(error)fail(409,error.message);res.json({transferred:true,new_owner_id:data});
}));
// SaaS billing: payments do not auto-verify; platform invoices and customer business receipts are separate.
app.post('/api/v1/platform/invoices',requirePlatform,wrap(async(req,res)=>{
 const body=z.object({company_id:z.string().uuid(),total:z.coerce.number().nonnegative(),currency:z.string().length(3).default('USD')}).parse(req.body);
 await check(admin.from('companies').select('id').eq('id',body.company_id).single());
 const reference='CMS-SUB-'+crypto.randomUUID().slice(0,12).toUpperCase();
 const data=await check(admin.from('platform_invoices').insert({company_id:body.company_id,reference,total:body.total,currency:body.currency,status:'Draft'}).select().single());
 await auditEvent(req,'saas_invoice_created','platform_invoice',data.id,{company_id:body.company_id});res.status(201).json({data});
}));
app.post('/api/v1/platform/payments',requirePlatform,wrap(async(req,res)=>{
 const body=z.object({invoice_id:z.string().uuid(),amount:z.coerce.number().positive(),method:z.string().min(1).max(70),reference:z.string().max(150).default('')}).parse(req.body);
 const invoice=await check(admin.from('platform_invoices').select('*').eq('id',body.invoice_id).single());
 const data=await check(admin.from('platform_payments').insert({company_id:invoice.company_id,invoice_id:invoice.id,amount:body.amount,method:body.method,reference:body.reference,status:'Pending'}).select().single());
 await auditEvent(req,'saas_payment_recorded','platform_payment',data.id,{invoice_id:invoice.id});res.status(201).json({data});
}));
app.post('/api/v1/platform/payments/:id/verify',requirePlatform,wrap(async(req,res)=>{
 const payment=await check(admin.from('platform_payments').select('*').eq('id',req.params.id).single());
 if(payment.status!=='Pending')fail(409,'Only pending payment can be verified');
 const data=await check(admin.from('platform_payments').update({status:'Verified',verified_by:req.authUser.id}).eq('id',payment.id).eq('status','Pending').select().single());
 await auditEvent(req,'saas_payment_verified','platform_payment',data.id);res.json({data});
}));
app.get('/api/v1/platform/subscriptions',requirePlatform,wrap(async(req,res)=>{
 const data=await check(admin.from('subscriptions').select('*').order('created_at',{ascending:false}).limit(400));res.json({data});
}));
app.post('/api/v1/platform/companies/:id/renew',requirePlatform,wrap(async(req,res)=>{
 const body=z.object({invoice_id:z.string().uuid(),billing_cycle:z.enum(['Monthly','Yearly']),
  starts_at:z.string().datetime(),ends_at:z.string().datetime(),
  modules:z.array(z.object({code:z.string(),agreed_price:z.coerce.number().nonnegative()})).min(1).max(24)}).parse(req.body);
 const company=await check(admin.from('companies').select('id,status').eq('id',req.params.id).single());
 if(new Date(body.ends_at)<=new Date(body.starts_at))fail(422,'End date must be after start date');
 const invoice=await check(admin.from('platform_invoices').select('*').eq('id',body.invoice_id).eq('company_id',company.id).single());
 const verified=await check(admin.from('platform_payments').select('amount').eq('company_id',company.id).eq('invoice_id',invoice.id).eq('status','Verified'));
 const sum=verified.reduce((s,p)=>s+Number(p.amount),0);
 if(sum+1e-7<Number(invoice.total))fail(409,'Invoice payment not yet fully verified');
 const catalog=await check(admin.from('module_catalog').select('code'));
 const allowed=new Set(catalog.map(m=>m.code));if(new Set(body.modules.map(m=>m.code)).size!==body.modules.length||body.modules.some(m=>!allowed.has(m.code)))fail(422,'Invalid subscription module list');
 const {data,error}=await admin.rpc('cms_renew_subscription',{p_company:company.id,p_admin:req.authUser.id,p_invoice:invoice.id,
  p_cycle:body.billing_cycle,p_start:body.starts_at,p_end:body.ends_at,p_modules:body.modules.map(m=>m.code),p_prices:body.modules.map(m=>m.agreed_price)});
 if(error)fail(409,error.message);res.status(201).json({subscription_id:data,status:'Active',expires_at:body.ends_at});
}));
const companyMemberRoles=['Additional Owner','Company Manager','Branch Manager','Accountant','Cashier','Salesperson','Storekeeper','Purchasing Officer','Project Manager','Employee'];
app.post('/api/v1/company/invitations',tenant('Employees','manage'),wrap(async(req,res)=>{
 if(req.membership.role!=='Primary Owner')fail(403,'Owner-only until custom role authorization is approved');
 const body=z.object({email:z.string().trim().email().transform(value=>value.toLowerCase()),role:z.enum(companyMemberRoles).default('Employee')}).parse(req.body);
 const {data:inv,error}=await admin.auth.admin.inviteUserByEmail(body.email,{redirectTo:authRedirectTo});if(error)fail(400,error.message);
 await check(admin.from('profiles').upsert({id:inv.user.id,email:body.email,full_name:''}));
 const {data,error:rpcError}=await admin.rpc('cms_reserve_employee_invite',{p_company:req.companyId,p_actor:req.authUser.id,
  p_invited_user:inv.user.id,p_email:body.email,p_role:body.role});
 if(rpcError)fail(409,rpcError.message);
 res.status(201).json({invitation_id:data,company_id:req.companyId,role:body.role,message:'Invitation reserved one employee seat'});
}));
app.get('/api/v1/company/invitations',tenant('Employees'),wrap(async(req,res)=>{
 const data=await check(admin.from('company_invitations').select('id,invited_email,role,status,expires_at,created_at').eq('company_id',req.companyId).order('created_at',{ascending:false}).limit(300));res.json({data});
}));
app.patch('/api/v1/company/members/:id/role',tenant('Employees','manage'),wrap(async(req,res)=>{
 if(req.membership.role!=='Primary Owner')fail(403,'Only the Primary Owner may change company member roles');
 const {role}=z.object({role:z.enum(companyMemberRoles)}).parse(req.body);
 const member=await check(admin.from('company_memberships').update({role}).eq('company_id',req.companyId).eq('id',req.params.id).neq('role','Primary Owner').select('id,role').maybeSingle());
 if(!member)fail(404,'Membership not found or Primary Owner role cannot be changed');
 await auditEvent(req,'member_role_changed','company_membership',member.id,{role});res.json({updated:true,membership_id:member.id,role:member.role});
}));
app.post('/api/v1/company/members/:id/state',tenant('Employees','manage'),wrap(async(req,res)=>{
 if(req.membership.role!=='Primary Owner')fail(403,'Owner-only action');
 const body=z.object({status:z.enum(['Active','Suspended','Archived'])}).parse(req.body);
 const {data,error}=await admin.rpc('cms_change_member_state',{p_company:req.companyId,p_actor:req.authUser.id,p_member:req.params.id,p_status:body.status});
 if(error)fail(409,error.message);res.json({updated:true,membership_id:data,status:body.status});
}));
app.use((error,req,res,next)=>{const zodError=error instanceof z.ZodError;const status=zodError?422:error.status||500;console.error('CMS API ERROR',status,error.message);res.status(status).json({error:zodError?error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '):status===500?'Internal server error':error.message})});
const port=Number(process.env.PORT)||4000;app.listen(port,()=>console.log(`CMS API ready: http://localhost:${port}/api/v1/health`));
