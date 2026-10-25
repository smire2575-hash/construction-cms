export const MODULE_GROUPS = [
  {title:'Xiriirka & Shaqada', icon:'MessageSquare', modules:['Discuss','Calendar','Appointments','To-do','Knowledge','Contacts']},
  {title:'Iibka & Maaliyadda',icon:'ChartNoAxesCombined',modules:['CRM','Sales','Dashboards','Point of Sale','Accounting','Documents']},
  {title:'Hawlgalka & Kaydka',icon:'Warehouse',modules:['Project','Planning','Surveys','Purchase','Inventory','Barcode']},
  {title:'Maamulka & Adeegyada',icon:'Settings',modules:['Sign','Employees','Expenses','WhatsApp','Apps','Settings']}
];
export const MODULE_DETAILS = {
  'Discuss':['Wadahadalka shaqaalaha','Fariimo, kooxo iyo ogeysiisyo'],
  'Calendar':['Jadwalka shirkadda','Dhacdooyin, hawlo iyo kulan'],
  'Appointments':['Ballamaha','Qabso ballamo macaamiisha'],
  'To-do':['Hawlaha shaqada','Qorshee, qaybi oo dhammee tasks'],
  'Knowledge':['Maktabadda aqoonta','Tilmaamo iyo casharro shirkadeed'],
  'Contacts':['Macaamiil & Alaab-qeybiyayaal','Xogta xiriirka iyo diiwaanada'],
  'CRM':['Fursadaha iibka','Leads iyo sales pipeline'],
  'Sales':['Iibka','Dalab, gaarsiin iyo invoice'],
  'Dashboards':['Warbixinta guud','KPIs iyo falanqayn'],
  'Point of Sale':['Iibka degdegga ah (POS)','Checkout iyo lacag qabasho'],
  'Accounting':['Xisaabaadka','GL, lacagaha, deymaha iyo reports'],
  'Documents':['Dukumentiyada','Faylal, rasiidyo iyo heshiisyo'],
  'Project':['Mashaariicda','Qorshe iyo miisaaniyad mashruuc'],
  'Planning':['Qorsheynta','Shaqaale iyo agab jadwaleyn'],
  'Surveys':['Su’aalo-ururin','Fikradaha macaamiisha'],
  'Purchase':['Wax-iibsiga','Supplier orders iyo goods receiving'],
  'Inventory':['Bakhaarka','Alaabo, stock iyo dhaq-dhaqaaq'],
  'Barcode':['Baar-koodhka','Scan, labels iyo raadraac'],
  'Sign':['Saxiixyada','Codsiyo iyo dukumenti la saxiixay'],
  'Employees':['Shaqaalaha','Roles iyo branch assignments'],
  'Expenses':['Kharashaadka','Diiwaangelinta kharashaadka'],
  'WhatsApp':['WhatsApp','Fariimo iyo isku-xirnaan'],
  'Apps':['Modules-ka','Soo bandhig modules-ka la fasaxay'],
  'Settings':['Dejinta','Company, branches, lacag iyo users']
};
export const ALL_MODULES=MODULE_GROUPS.flatMap(g=>g.modules);
export const MODULE_ICONS={'Discuss':'MessageCircle','Calendar':'CalendarDays','Appointments':'CalendarCheck','To-do':'ListTodo','Knowledge':'BookOpen','Contacts':'Contact','CRM':'Target','Sales':'ShoppingCart','Dashboards':'LayoutDashboard','Point of Sale':'MonitorSmartphone','Accounting':'Calculator','Documents':'Files','Project':'FolderKanban','Planning':'CalendarClock','Surveys':'ClipboardList','Purchase':'Truck','Inventory':'Boxes','Barcode':'ScanBarcode','Sign':'Signature','Employees':'UsersRound','Expenses':'Receipt','WhatsApp':'MessageSquareText','Apps':'Grid2X2','Settings':'Settings'};
export const MONTHLY_PRICES={'Discuss':2,'Calendar':2,'Appointments':2,'To-do':2,'Knowledge':2,'Contacts':2,'CRM':5,'Sales':6,'Dashboards':3,'Point of Sale':6,'Accounting':8,'Documents':3,'Project':5,'Planning':3,'Surveys':2,'Purchase':5,'Inventory':7,'Barcode':3,'Sign':3,'Employees':3,'Expenses':3,'WhatsApp':4,'Apps':0,'Settings':0};
export const fmt = (n,currency='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:2}).format(Number(n)||0);
export const dateNow = ()=>new Date().toISOString().slice(0,10);
