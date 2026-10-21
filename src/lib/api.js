import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (Boolean(supabaseUrl) !== Boolean(supabaseKey)) {
  throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, or remove both to use local demo mode.');
}

export const LIVE = Boolean(supabaseUrl && supabaseKey);
export const supabase = LIVE
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

const TABLES = new Set(['products', 'contacts', 'sales', 'purchases', 'expenses', 'tasks', 'employees', 'branches']);

function throwIfError(error) {
  if (error) throw new Error(error.message || 'Supabase request failed.');
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error);
  if (!data.user) throw new Error('Sign in to continue.');
  return data.user;
}

async function companyContext(user) {
  const [{ data: profile, error: profileError }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,is_platform_admin').eq('id', user.id).maybeSingle(),
    supabase.from('company_memberships').select('company_id,role,status,created_at').eq('user_id', user.id).order('created_at')
  ]);
  throwIfError(profileError);
  throwIfError(membershipError);

  const isPlatformAdmin = profile?.is_platform_admin === true;
  const membership = (memberships || []).find(item => item.status === 'active') || memberships?.[0] || null;
  if (isPlatformAdmin) {
    return { userId: user.id, profile: profile || {}, isPlatformAdmin: true, role: 'platform_admin', modules: [] };
  }
  if (!membership) {
    return { userId: user.id, profile: profile || {}, isPlatformAdmin: false, companyId: null, role: null, membershipStatus: null, modules: [] };
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id,name,status,trial_ends_at,base_currency,branches_limit,warehouses_limit,employee_seat_limit')
    .eq('id', membership.company_id)
    .maybeSingle();
  throwIfError(companyError);
  if (!company) throw new Error('Your company could not be found. Contact your administrator.');

  const { data: entitlements, error: modulesError } = await supabase
    .from('company_modules')
    .select('module_name,status,trial_ends_at')
    .eq('company_id', company.id);
  throwIfError(modulesError);
  const now = Date.now();
  const modules = (entitlements || [])
    .filter(item => item.status === 'active' || (item.status === 'trial' && item.trial_ends_at && new Date(item.trial_ends_at).getTime() > now))
    .map(item => item.module_name);

  return {
    userId: user.id,
    profile: profile || {},
    companyId: company.id,
    companyName: company.name,
    companyStatus: company.status,
    trialEndsAt: company.trial_ends_at,
    role: membership.role,
    membershipStatus: membership.status,
    isPlatformAdmin: false,
    modules,
    limits: {
      branches: company.branches_limit,
      warehouses: company.warehouses_limit,
      employees: company.employee_seat_limit
    }
  };
}

async function getCompanyId(user, requestedId) {
  const { data, error } = await supabase
    .from('company_memberships')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at')
    .limit(10);
  throwIfError(error);
  const membership = requestedId ? data?.find(row => row.company_id === requestedId) : data?.[0];
  if (!membership) throw new Error('An active company membership is required.');
  return membership.company_id;
}

function normalizeRow(row) {
  if (!row) return row;
  const normalized = { ...row };
  if ('low_stock' in normalized) normalized.low = normalized.low_stock;
  if ('cost_total' in normalized) normalized.costTotal = normalized.cost_total;
  return normalized;
}

function databaseRow(resource, input, companyId) {
  const row = { ...input, company_id: companyId };
  delete row.id;
  delete row.created_at;
  delete row.low;
  delete row.costTotal;
  delete row.cost_total;
  delete row.company_id;

  if (resource === 'products') {
    row.low_stock = Number(input.low ?? input.low_stock ?? 0);
    row.cost = Number(input.cost || 0);
    row.price = Number(input.price || 0);
    row.stock = Number(input.stock || 0);
  }
  if (resource === 'expenses') row.amount = Number(input.amount || 0);
  if (resource === 'purchases') {
    row.qty = Number(input.qty || 0);
    row.total = Number(input.total || 0);
  }
  if (resource === 'contacts') row.balance = Number(input.balance || 0);
  if (resource === 'tasks' && !row.due) row.due = new Date().toISOString().slice(0, 10);
  if (resource === 'employees' && !row.status) row.status = 'Active';
  if (resource === 'expenses' && !row.status) row.status = 'Pending';
  if (resource === 'tasks' && !row.status) row.status = 'Pending';
  if (resource === 'purchases' && !row.status) row.status = 'Pending';
  if (resource === 'contacts' && !row.kind) row.kind = 'Customer';
  return { ...row, company_id: companyId };
}

async function fetchPlatformCompanies() {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id,name,email,status,trial_ends_at,created_at')
    .order('created_at', { ascending: false });
  throwIfError(error);
  const ids = (companies || []).map(company => company.id);
  if (!ids.length) return { data: [] };

  const [{ data: memberships, error: membershipsError }, { data: modules, error: modulesError }] = await Promise.all([
    supabase.from('company_memberships').select('company_id,role,user_id').in('company_id', ids),
    supabase.from('company_modules').select('company_id,module_name,status').in('company_id', ids)
  ]);
  throwIfError(membershipsError);
  throwIfError(modulesError);
  return {
    data: companies.map(company => {
      const companyMembers = (memberships || []).filter(item => item.company_id === company.id);
      const owner = companyMembers.find(item => item.role === 'primary_owner');
      return {
        ...company,
        status: company.status === 'active' ? 'Active' : company.status === 'trial' ? 'Trial' : company.status === 'expired' ? 'Expired' : 'Suspended',
        owner: owner?.user_id || '',
        users: companyMembers.length,
        modules: (modules || []).filter(item => item.company_id === company.id && ['active', 'trial'].includes(item.status)).length,
        expiry: company.trial_ends_at ? company.trial_ends_at.slice(0, 10) : '',
        plan: 'Module-based',
        amount: 0
      };
    })
  };
}

export async function api(path, { method = 'GET', body = null, companyId = null } = {}) {
  if (!LIVE) throw new Error('Supabase is not configured. Add the project URL and publishable key to .env.local.');

  const normalizedPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
  const user = await currentUser();
  const verb = method.toUpperCase();

  if (normalizedPath === 'session' && verb === 'GET') return companyContext(user);

  if (normalizedPath === 'companies' && verb === 'POST') {
    const { data, error } = await supabase.rpc('create_company_for_current_user', { company_name: body?.name });
    throwIfError(error);
    return { data: { id: data } };
  }

  if (normalizedPath === 'platform/companies' && verb === 'GET') {
    const { isPlatformAdmin } = await companyContext(user);
    if (!isPlatformAdmin) throw new Error('Platform administrator access is required.');
    return fetchPlatformCompanies();
  }

  if (normalizedPath === 'platform/companies' && verb === 'POST') {
    const { isPlatformAdmin } = await companyContext(user);
    if (!isPlatformAdmin) throw new Error('Platform administrator access is required.');
    const { data, error } = await supabase.rpc('create_platform_company', {
      p_name: body?.name,
      p_email: body?.email || null,
      p_phone: body?.phone || null,
      p_whatsapp: body?.whatsapp || null,
      p_address: body?.address || null,
      p_trial_days: Number(body?.trial_days) || 14,
      p_employee_seat_limit: Number(body?.employee_seats) || 5
    });
    throwIfError(error);
    return { data: { id: data } };
  }

  if (normalizedPath === 'platform/settings') {
    const { isPlatformAdmin } = await companyContext(user);
    if (!isPlatformAdmin) throw new Error('Platform administrator access is required.');
    if (verb === 'GET') {
      const { data, error } = await supabase.from('platform_settings').select('*').eq('id', true).single();
      throwIfError(error);
      return { data };
    }
    if (verb === 'PUT') {
      const { data, error } = await supabase.from('platform_settings').update(body || {}).eq('id', true).select().single();
      throwIfError(error);
      return { data };
    }
  }

  if (normalizedPath === 'company/profile') {
    const activeCompanyId = await getCompanyId(user, companyId);
    if (verb === 'GET') {
      const { data, error } = await supabase.from('companies').select('*').eq('id', activeCompanyId).single();
      throwIfError(error);
      return { data };
    }
    if (verb === 'PUT') {
      const { data, error } = await supabase.from('companies').update(body || {}).eq('id', activeCompanyId).select().single();
      throwIfError(error);
      return { data };
    }
  }

  const moduleRecordMatch = normalizedPath.match(/^module-records\/(.+)$/);
  if (moduleRecordMatch) {
    const activeCompanyId = await getCompanyId(user, companyId);
    const moduleName = decodeURIComponent(moduleRecordMatch[1]);
    if (verb === 'GET') {
      const { data, error } = await supabase.from('module_records').select('*').eq('company_id', activeCompanyId).eq('module_name', moduleName).order('created_at', { ascending: false });
      throwIfError(error);
      return { data: data.map(normalizeRow) };
    }
    if (verb === 'POST') {
      const { data, error } = await supabase.from('module_records').insert({
        company_id: activeCompanyId,
        module_name: moduleName,
        name: body?.name || 'Record',
        description: body?.description || '',
        status: body?.status || 'Active'
      }).select().single();
      throwIfError(error);
      return { data: normalizeRow(data) };
    }
  }

  if (TABLES.has(normalizedPath)) {
    const activeCompanyId = await getCompanyId(user, companyId);
    if (verb === 'GET') {
      const { data, error } = await supabase.from(normalizedPath).select('*').eq('company_id', activeCompanyId).order('created_at', { ascending: false });
      throwIfError(error);
      return { data: (data || []).map(normalizeRow) };
    }
    if (verb === 'POST' && normalizedPath === 'sales') {
      const { data, error } = await supabase.rpc('record_sale', {
        p_company_id: activeCompanyId,
        p_product_id: body?.product_id,
        p_quantity: Number(body?.quantity),
        p_payment_type: body?.payment_type
      });
      throwIfError(error);
      return { data: normalizeRow(data), message: 'Iibka waa la diiwaangeliyey.' };
    }
    if (verb === 'POST' && normalizedPath !== 'sales') {
      const { data, error } = await supabase.from(normalizedPath).insert(databaseRow(normalizedPath, body || {}, activeCompanyId)).select().single();
      throwIfError(error);
      return { data: normalizeRow(data) };
    }
  }

  throw new Error(`Unsupported Supabase operation: ${verb} ${normalizedPath}`);
}
