import {createClient} from '@supabase/supabase-js';
export const LIVE=Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export const supabase= LIVE?createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY):null;
const BASE=import.meta.env.VITE_API_URL||'/api/v1';
export async function api(path,{method='GET',body=null,companyId=null,formData=null}={}){
  if(!LIVE) throw Error('Demo mode: Supabase credentials not configured');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session) throw Error('Login required');
  const headers={Authorization:`Bearer ${session.access_token}`};
  if(companyId) headers['X-Company-Id']=companyId;
  if(body)headers['Content-Type']='application/json';
  const response=await fetch(`${BASE}${path}`,{method,headers,body:formData|| (body?JSON.stringify(body):undefined)});
  const payload=await response.json().catch(()=>({error:'Invalid server response'}));
  if(!response.ok)throw Error(payload.error||`HTTP ${response.status}`);
  return payload;
}
