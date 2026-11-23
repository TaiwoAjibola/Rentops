import { PrismaClient } from "@prisma/client";
import { categories, amenities, locations, partners, users, partnerMembers, DEMO_NOW, id } from "@/lib/demo-data";

type Row = Record<string, any>;
type Store = Record<string, Row[]>;

const now = DEMO_NOW;
const iso = (d: Date) => d.toISOString();

function money(n: number) { return n; } // already minor units in demo

// --- Demo dataset ---
const properties: Row[] = [
  {
    id: id('prop',1), slug:'grand-residences-lekki', partnerId:id('prt',1), categoryId:id('cat',1),
    name:'Grand Residences Hotel, Lekki', headline:'Luxury rooms in the heart of Lekki',
    description:'A premium hotel experience with modern rooms, rooftop pool, and excellent service. Ideal for business and leisure stays.',
    status:'APPROVED', isActive:true, featured:true, verificationBadge:true, verificationLevel:'VERIFIED',
    addressLine1:'12 Admiralty Way', addressLine2:null, area:'Lekki Phase 1', city:'Lagos', state:'Lagos', country:'Nigeria', postalCode:null,
    latitude:6.4301, longitude:3.4588, contactName:'Front Desk', contactPhone:'+2348010000001', contactEmail:'stay@grand.test',
    bedrooms:1, bathrooms:1, maxGuests:2, sizeSqm:35, houseRules:'No smoking. No parties.',
    cancellationPolicyId:id('canpol',1), checkInFrom:'14:00', checkInTo:'22:00', checkOutUntil:'12:00',
    smokingAllowed:false, petsAllowed:false, partiesAllowed:false, childrenAllowed:true, minimumAge:null,
    bookingMode:'INSTANT', instantBooking:true, minNights:1, maxNights:30, minNoticeHours:2, advanceBookingDays:180,
    acceptedCheckInDays:null, dueDiligenceEnabled:false, dueDiligenceThresholdDays:null, mandatoryVerification:false,
    allowPayLater:true, unpaidHoldDays:2, currency:'NGN', baseNightlyRate:8500000, priceBasis:'NIGHTLY',
    ratingAverage:4.8, ratingCount:24, coverImageUrl:'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
    publishedAt:now, submittedAt:now, approvedAt:now, approvedById:id('usr',1), rejectionReason:null, adminNotes:null,
    createdAt:now, updatedAt:now,
  },
  {
    id: id('prop',2), slug:'ocean-view-shortlet-vi', partnerId:id('prt',1), categoryId:id('cat',2),
    name:'Ocean View Shortlet, Victoria Island', headline:'Bright furnished apartment with skyline views',
    description:'A stylish shortlet apartment perfect for weekend getaways, business trips, and extended stays. Includes Wi-Fi, power backup, and secure parking.',
    status:'APPROVED', isActive:true, featured:true, verificationBadge:true, verificationLevel:'VERIFIED',
    addressLine1:'24 Akin Adesola Street', addressLine2:null, area:'Victoria Island', city:'Lagos', state:'Lagos', country:'Nigeria', postalCode:null,
    latitude:6.4281, longitude:3.4219, contactName:'Host', contactPhone:'+2348010000004', contactEmail:'host@ocean.test',
    bedrooms:2, bathrooms:2, maxGuests:4, sizeSqm:95, houseRules:'Quiet hours after 10pm.',
    cancellationPolicyId:id('canpol',1), checkInFrom:'14:00', checkInTo:'21:00', checkOutUntil:'11:00',
    smokingAllowed:false, petsAllowed:false, partiesAllowed:false, childrenAllowed:true, minimumAge:null,
    bookingMode:'INSTANT', instantBooking:true, minNights:1, maxNights:60, minNoticeHours:4, advanceBookingDays:180,
    acceptedCheckInDays:null, dueDiligenceEnabled:false, dueDiligenceThresholdDays:null, mandatoryVerification:false,
    allowPayLater:true, unpaidHoldDays:2, currency:'NGN', baseNightlyRate:12000000, priceBasis:'NIGHTLY',
    ratingAverage:4.7, ratingCount:18, coverImageUrl:'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80',
    publishedAt:now, submittedAt:now, approvedAt:now, approvedById:id('usr',1), rejectionReason:null, adminNotes:null,
    createdAt:now, updatedAt:now,
  },
  {
    id: id('prop',3), slug:'ikoyi-serviced-apartments', partnerId:id('prt',1), categoryId:id('cat',3),
    name:'Ikoyi Serviced Apartments', headline:'Serviced comfort for longer stays',
    description:'Fully serviced apartments in Ikoyi with housekeeping, gym access, and dedicated support. Great for monthly and executive stays.',
    status:'APPROVED', isActive:true, featured:false, verificationBadge:true, verificationLevel:'VERIFIED',
    addressLine1:'8 Bourdillon Road', addressLine2:null, area:'Ikoyi', city:'Lagos', state:'Lagos', country:'Nigeria', postalCode:null,
    latitude:6.4550, longitude:3.4350, contactName:'Manager', contactPhone:'+2348010000005', contactEmail:'ikoyi@test',
    bedrooms:2, bathrooms:2, maxGuests:4, sizeSqm:110, houseRules:'No parties. ID required at check-in.',
    cancellationPolicyId:id('canpol',1), checkInFrom:'14:00', checkInTo:'20:00', checkOutUntil:'12:00',
    smokingAllowed:false, petsAllowed:false, partiesAllowed:false, childrenAllowed:true, minimumAge:null,
    bookingMode:'APPROVAL', instantBooking:false, minNights:7, maxNights:365, minNoticeHours:24, advanceBookingDays:365,
    acceptedCheckInDays:null, dueDiligenceEnabled:true, dueDiligenceThresholdDays:30, mandatoryVerification:false,
    allowPayLater:false, unpaidHoldDays:2, currency:'NGN', baseNightlyRate:15000000, priceBasis:'MONTHLY',
    ratingAverage:4.9, ratingCount:11, coverImageUrl:'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80',
    publishedAt:now, submittedAt:now, approvedAt:now, approvedById:id('usr',1), rejectionReason:null, adminNotes:null,
    createdAt:now, updatedAt:now,
  },
];

const units: Row[] = [
  { id:id('unit',1), propertyId:id('prop',1), categoryId:null, label:'Deluxe King Room', unitNumber:'101', floor:'1', description:null, maxGuests:2, bedrooms:1, bathrooms:1, beds:'1 king', sizeSqm:35, status:'ACTIVE', isBookable:true, sortOrder:0, createdAt:now, updatedAt:now },
  { id:id('unit',2), propertyId:id('prop',2), categoryId:null, label:'2-Bed Apartment', unitNumber:'A2', floor:'2', description:null, maxGuests:4, bedrooms:2, bathrooms:2, beds:'2 queen', sizeSqm:95, status:'ACTIVE', isBookable:true, sortOrder:0, createdAt:now, updatedAt:now },
  { id:id('unit',3), propertyId:id('prop',3), categoryId:null, label:'Executive 2-Bed', unitNumber:'3B', floor:'3', description:null, maxGuests:4, bedrooms:2, bathrooms:2, beds:'2 king', sizeSqm:110, status:'ACTIVE', isBookable:true, sortOrder:0, createdAt:now, updatedAt:now },
];

const unitRates: Row[] = [
  { id:id('rate',1), unitId:id('unit',1), currency:'NGN', nightlyRate:8500000, weeklyRate:54000000, monthlyRate:210000000, annualRate:null, weekendNightlyRate:9500000, extraGuestFee:0, extraGuestThreshold:null, cleaningFee:500000, serviceCharge:250000, securityDeposit:0, minNights:1, maxNights:30, createdAt:now, updatedAt:now },
  { id:id('rate',2), unitId:id('unit',2), currency:'NGN', nightlyRate:12000000, weeklyRate:78000000, monthlyRate:300000000, annualRate:null, weekendNightlyRate:14000000, extraGuestFee:1000000, extraGuestThreshold:2, cleaningFee:1000000, serviceCharge:500000, securityDeposit:5000000, minNights:1, maxNights:60, createdAt:now, updatedAt:now },
  { id:id('rate',3), unitId:id('unit',3), currency:'NGN', nightlyRate:15000000, weeklyRate:95000000, monthlyRate:350000000, annualRate:3600000000, weekendNightlyRate:null, extraGuestFee:0, extraGuestThreshold:null, cleaningFee:1500000, serviceCharge:0, securityDeposit:50000000, minNights:7, maxNights:365, createdAt:now, updatedAt:now },
];

const propertyMedia: Row[] = [
  { id:id('pm',1), propertyId:id('prop',1), type:'IMAGE', url:properties[0].coverImageUrl, caption:'Exterior', publicId:null, mimeType:null, size:null, width:1400, height:933, sortOrder:0, isCover:true, meta:null, createdAt:now },
  { id:id('pm',2), propertyId:id('prop',2), type:'IMAGE', url:properties[1].coverImageUrl, caption:'Living area', publicId:null, mimeType:null, size:null, width:1400, height:933, sortOrder:0, isCover:true, meta:null, createdAt:now },
  { id:id('pm',3), propertyId:id('prop',3), type:'IMAGE', url:properties[2].coverImageUrl, caption:'Apartment', publicId:null, mimeType:null, size:null, width:1400, height:933, sortOrder:0, isCover:true, meta:null, createdAt:now },
];

const propertyAmenities: Row[] = [
  { id:id('pa',1), propertyId:id('prop',1), amenityId:id('am',1) },
  { id:id('pa',2), propertyId:id('prop',1), amenityId:id('am',2) },
  { id:id('pa',3), propertyId:id('prop',1), amenityId:id('am',4) },
  { id:id('pa',4), propertyId:id('prop',2), amenityId:id('am',1) },
  { id:id('pa',5), propertyId:id('prop',2), amenityId:id('am',2) },
  { id:id('pa',6), propertyId:id('prop',2), amenityId:id('am',3) },
  { id:id('pa',7), propertyId:id('prop',3), amenityId:id('am',2) },
  { id:id('pa',8), propertyId:id('prop',3), amenityId:id('am',6) },
];

const cancellationPolicies: Row[] = [
  { id:id('canpol',1), partnerId:null, name:'Flexible', description:'Full refund up to 48 hours before check-in.', rules:[{hoursBeforeCheckIn:48,refundPercent:100}], isDefault:true, createdAt:now, updatedAt:now },
];

const reviews: Row[] = [
  { id:id('rev',1), propertyId:id('prop',1), reservationId:null, userId:id('usr',2), overallRating:5, cleanliness:5, accuracy:5, communication:5, locationRating:5, value:5, checkInRating:5, title:'Excellent stay', body:'Clean, comfortable, and great location.', status:'PUBLISHED', partnerResponse:null, respondedAt:null, respondedById:null, moderationNote:null, moderatedById:null, publishedAt:now, createdAt:now, updatedAt:now },
];

const seedStore: Store = {
  propertyCategory: categories,
  amenity: amenities,
  location: locations,
  partner: partners,
  user: users,
  partnerMember: partnerMembers,
  property: properties,
  unit: units,
  unitRate: unitRates,
  propertyMedia,
  unitMedia: [],
  propertyAmenity: propertyAmenities,
  propertyCategoryAssignment: [],
  roomCategory: [],
  seasonalRate: [],
  availabilityBlock: [],
  reservation: [],
  reservationUnit: [],
  payment: [],
  ledgerEntry: [],
  settlement: [],
  review: reviews,
  savedProperty: [],
  conversation: [],
  message: [],
  messageRead: [],
  notification: [],
  notificationPreference: [],
  supportTicket: [],
  dispute: [],
  inspectionRequest: [],
  verificationRecord: [],
  partnerDocument: [],
  partnerBankAccount: [],
  partnerInvitation: [],
  cancellationPolicy: cancellationPolicies,
  propertyVerificationCheck: [],
  dueDiligencePolicy: [],
  promotion: [],
  auditLog: [],
  session: [],
  passwordResetToken: [],
  emailVerificationToken: [],
  referral: [],
  platformSetting: [],
  customerProfile: [],
  propertyFee: [],
};
const g = globalThis as unknown as { __rentopsDemoStore?: Store };
const store: Store = g.__rentopsDemoStore ?? seedStore;
g.__rentopsDemoStore = store;

function getCollection(model: string): Row[] {
  if (!store[model]) store[model] = [];
  return store[model];
}

function getById(model: string, idVal: any): Row | null {
  return getCollection(model).find(r => r.id === idVal) ?? null;
}

function matchScalar(value: any, cond: any): boolean {
  if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
    if ('equals' in cond) return value === cond.equals;
    if ('in' in cond) return Array.isArray(cond.in) && cond.in.includes(value);
    if ('notIn' in cond) return Array.isArray(cond.notIn) && !cond.notIn.includes(value);
    if ('not' in cond) {
      if (cond.not && typeof cond.not === 'object' && 'in' in cond.not) return !(cond.not.in || []).includes(value);
      return value !== cond.not;
    }
    if ('contains' in cond) return String(value ?? '').toLowerCase().includes(String(cond.contains).toLowerCase());
    if ('gte' in cond || 'lte' in cond || 'gt' in cond || 'lt' in cond) {
      const v = value instanceof Date ? value.getTime() : value;
      const n = (x: any) => x instanceof Date ? x.getTime() : x;
      if ('gte' in cond && !(v >= n(cond.gte))) return false;
      if ('lte' in cond && !(v <= n(cond.lte))) return false;
      if ('gt' in cond && !(v > n(cond.gt))) return false;
      if ('lt' in cond && !(v < n(cond.lt))) return false;
      return true;
    }
    // nested relation filter on scalar shouldn't happen; fallthrough
  }
  if (cond instanceof Date && value instanceof Date) return cond.getTime() === value.getTime();
  return value === cond;
}

function matchWhere(row: Row, where: any, model: string): boolean {
  if (!where) return true;
  if (where.AND) {
    const arr = Array.isArray(where.AND) ? where.AND : [where.AND];
    if (!arr.every((w: any) => matchWhere(row, w, model))) return false;
  }
  if (where.OR) {
    const arr = Array.isArray(where.OR) ? where.OR : [where.OR];
    if (!arr.some((w: any) => matchWhere(row, w, model))) return false;
  }
  if (where.NOT) {
    const arr = Array.isArray(where.NOT) ? where.NOT : [where.NOT];
    if (arr.some((w: any) => matchWhere(row, w, model))) return false;
  }
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') continue;
    if (cond === undefined) continue;
    // relation filters
    if (cond && typeof cond === 'object' && ('some' in (cond as any) || 'every' in (cond as any) || 'none' in (cond as any))) {
      const rel = getRelationRows(row, model, key);
      const c: any = cond;
      if ('some' in c && !rel.some(r => matchWhere(r, c.some, relationTarget(model, key)))) return false;
      if ('every' in c && !rel.every(r => matchWhere(r, c.every, relationTarget(model, key)))) return false;
      if ('none' in c && rel.some(r => matchWhere(r, c.none, relationTarget(model, key)))) return false;
      continue;
    }
    if (cond && typeof cond === 'object' && ('is' in (cond as any) || 'isNot' in (cond as any))) {
      const rel = getSingleRelation(row, model, key);
      const c: any = cond;
      if ('is' in c) {
        if (c.is === null && rel !== null) return false;
        if (c.is !== null && (rel === null || !matchWhere(rel, c.is, relationTarget(model, key)))) return false;
      }
      if ('isNot' in c) {
        if (c.isNot === null && rel === null) return false;
        if (c.isNot !== null && rel !== null && matchWhere(rel, c.isNot, relationTarget(model, key))) return false;
      }
      continue;
    }
    // nested object filter on relation scalar field like category: { slug: ... } or category: { is: ... } handled above
    // but also { slug: 'hotel' } as direct relation where? sometimes used in nested include where
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date) && !('equals' in cond || 'in' in cond || 'notIn' in cond || 'not' in cond || 'contains' in cond || 'gte' in cond || 'lte' in cond || 'gt' in cond || 'lt' in cond)) {
      // Could be relation shorthand { slug: "x" } on to-one relation
      const rel = getSingleRelation(row, model, key);
      if (rel && matchWhere(rel, cond, relationTarget(model, key))) continue;
      // or to-many? rare in where
      if (rel === null) {
        // maybe scalar object? unlikely
      }
      if (rel !== null) return false;
      // if no relation, maybe it's just a scalar equality miss; fall through to scalar
      if (rel === null && !(key in row)) { /* try scalar below */ } else { return false; }
    }
    if (!matchScalar(row[key], cond)) return false;
  }
  return true;
}

function singularize(model: string) { return model; } // store uses model names already

const relationMap: Record<string, Record<string, { kind: 'one'|'many'; target: string; fk?: string; ref?: string }>> = {
  property: {
    category: { kind:'one', target:'propertyCategory', fk:'categoryId' },
    partner: { kind:'one', target:'partner', fk:'partnerId' },
    media: { kind:'many', target:'propertyMedia', ref:'propertyId' },
    amenities: { kind:'many', target:'propertyAmenity', ref:'propertyId' },
    categories: { kind:'many', target:'propertyCategoryAssignment', ref:'propertyId' },
    units: { kind:'many', target:'unit', ref:'propertyId' },
    cancellationPolicy: { kind:'one', target:'cancellationPolicy', fk:'cancellationPolicyId' },
    verificationChecks: { kind:'many', target:'propertyVerificationCheck', ref:'propertyId' },
    reviews: { kind:'many', target:'review', ref:'propertyId' },
    fees: { kind:'many', target:'propertyFee', ref:'propertyId' },
  },
  unit: {
    rate: { kind:'one', target:'unitRate', ref:'unitId' },
    seasonalRates: { kind:'many', target:'seasonalRate', ref:'unitId' },
    category: { kind:'one', target:'roomCategory', fk:'categoryId' },
    media: { kind:'many', target:'unitMedia', ref:'unitId' },
    property: { kind:'one', target:'property', fk:'propertyId' },
    availabilityBlocks: { kind:'many', target:'availabilityBlock', ref:'unitId' },
    reservationUnits: { kind:'many', target:'reservationUnit', ref:'unitId' },
  },
  propertyAmenity: { amenity: { kind:'one', target:'amenity', fk:'amenityId' } },
  reservation: {
    property: { kind:'one', target:'property', fk:'propertyId' },
    user: { kind:'one', target:'user', fk:'userId' },
    units: { kind:'many', target:'reservationUnit', ref:'reservationId' },
    payments: { kind:'many', target:'payment', ref:'reservationId' },
  },
  reservationUnit: { reservation: { kind:'one', target:'reservation', fk:'reservationId' }, unit: { kind:'one', target:'unit', fk:'unitId' } },
  review: { user: { kind:'one', target:'user', fk:'userId' }, property: { kind:'one', target:'property', fk:'propertyId' } },
  partnerMember: { user: { kind:'one', target:'user', fk:'userId' }, partner: { kind:'one', target:'partner', fk:'partnerId' } },
  partner: { members: { kind:'many', target:'partnerMember', ref:'partnerId' } },
  conversation: { messages: { kind:'many', target:'message', ref:'conversationId' }, customer: { kind:'one', target:'user', fk:'customerId' }, property: { kind:'one', target:'property', fk:'propertyId' } },
  message: { sender: { kind:'one', target:'user', fk:'senderId' } },
  payment: { reservation: { kind:'one', target:'reservation', fk:'reservationId' } },
  unitRate: { unit: { kind:'one', target:'unit', fk:'unitId' } },
  seasonalRate: { unit: { kind:'one', target:'unit', fk:'unitId' } },
  propertyFee: {},
};

function relationTarget(model: string, key: string) {
  return relationMap[model]?.[key]?.target ?? key;
}

function getRelationRows(row: Row, model: string, key: string): Row[] {
  const rel = relationMap[model]?.[key];
  if (!rel) return [];
  if (rel.kind === 'many') {
    if (rel.ref) return getCollection(rel.target).filter(r => r[rel.ref!] === row.id);
    return [];
  }
  const one = getSingleRelation(row, model, key);
  return one ? [one] : [];
}

function getSingleRelation(row: Row, model: string, key: string): Row | null {
  const rel = relationMap[model]?.[key];
  if (!rel) {
    // generic: if row[key+"Id"] exists, look up
    const fk = key + 'Id';
    if (row[fk]) return getById(key, row[fk]);
    return null;
  }
  if (rel.kind === 'one') {
    if (rel.fk) return row[rel.fk] ? getById(rel.target, row[rel.fk]) : null;
    if (rel.ref) return getCollection(rel.target).find(r => r[rel.ref!] === row.id) ?? null;
  }
  return null;
}

function applySelect(row: Row, select: any, model: string): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(select)) {
    if (!v) continue;
    if (k === '_count') {
      out._count = {};
      const sel = (v as any).select || {};
      for (const [ck] of Object.entries(sel)) out._count[ck] = getRelationRows(row, model, ck).length;
      continue;
    }
    const rel = relationMap[model]?.[k];
    if (rel || (typeof v === 'object' && (v as any).select || (v as any).include || (v as any).take)) {
      out[k] = materializeRelation(row, model, k, v);
    } else {
      out[k] = row[k];
    }
  }
  return out;
}

function materializeRelation(row: Row, model: string, key: string, spec: any) {
  const rel = relationMap[model]?.[key];
  const isMany = rel?.kind === 'many' || Array.isArray((row as any)[key]);
  if (isMany) {
    let rows = getRelationRows(row, model, key);
    if (spec && typeof spec === 'object') {
      if (spec.where) rows = rows.filter(r => matchWhere(r, spec.where, relationTarget(model, key)));
      if (spec.orderBy) rows = orderRows(rows, spec.orderBy);
      if (spec.skip) rows = rows.slice(spec.skip);
      if (spec.take) rows = rows.slice(0, spec.take);
      if (spec.select) return rows.map(r => applySelect(r, spec.select, relationTarget(model, key)));
      if (spec.include) return rows.map(r => applyInclude(r, spec.include, relationTarget(model, key)));
    }
    return rows.map(r => ({ ...r }));
  }
  const one = getSingleRelation(row, model, key);
  if (!one) return null;
  if (spec && typeof spec === 'object') {
    if (spec.select) return applySelect(one, spec.select, relationTarget(model, key));
    if (spec.include) return applyInclude(one, spec.include, relationTarget(model, key));
  }
  return { ...one };
}

function applyInclude(row: Row, include: any, model: string): Row {
  const out: Row = { ...row };
  for (const [k, v] of Object.entries(include)) {
    if (!v) continue;
    if (k === '_count') {
      out._count = {};
      const sel = (v as any).select || {};
      for (const [ck] of Object.entries(sel)) out._count[ck] = getRelationRows(row, model, ck).length;
      continue;
    }
    out[k] = materializeRelation(row, model, k, v);
  }
  return out;
}

function orderRows(rows: Row[], orderBy: any): Row[] {
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a,b) => {
    for (const o of orders) {
      for (const [k, dir] of Object.entries(o)) {
        if (dir && typeof dir === 'object' && !Array.isArray(dir)) continue; // nested relation order not supported
        const av = a[k], bv = b[k];
        if (av === bv) continue;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = av > bv ? 1 : av < bv ? -1 : 0;
        return dir === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  });
}

function project(row: Row, args: any, model: string): Row {
  if (args?.select) return applySelect(row, args.select, model);
  if (args?.include) return applyInclude(row, args.include, model);
  return { ...row };
}

function normalizeWhere(where: any): any {
  if (!where || typeof where !== 'object') return where;
  const out: any = {};
  for (const [k, v] of Object.entries(where)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
        && !['equals','in','notIn','not','contains','gte','lte','gt','lt','some','every','none','is','isNot'].includes(k)
        && !['AND','OR','NOT'].includes(k)
        && !k.endsWith('Id') && k !== 'id' && !relationMapHas(k) && looksCompositeKey(k, v)) {
      Object.assign(out, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
function relationMapHas(k: string) { return ['category','partner','media','amenities','units','rate','seasonalRates','property','user','reservation','messages','sender','cancellationPolicy','verificationChecks','reviews','fees','availabilityBlocks','reservationUnits'].includes(k); }
function looksCompositeKey(k: string, v: any) { return k.includes('_') && typeof v === 'object' && v !== null && Object.values(v).every(x => ['string','number','boolean'].includes(typeof x) || x === null); }

function makeDelegate(model: string) {
  return {
    async findMany(args: any = {}) {
      const where = normalizeWhere(args.where);
      let rows = getCollection(model).filter(r => matchWhere(r, where, model));
      if (args.orderBy) rows = orderRows(rows, args.orderBy);
      if (args.skip) rows = rows.slice(args.skip);
      if (args.take !== undefined) rows = rows.slice(0, args.take);
      return rows.map(r => project(r, args, model));
    },
    async findFirst(args: any = {}) {
      const rows = await this.findMany({ ...args, take: 1 });
      return rows[0] ?? null;
    },
    async findUnique(args: any = {}) {
      const where = normalizeWhere(args.where || {});
      let row: Row | null = null;
      if (where.id) row = getById(model, where.id);
      else row = getCollection(model).find(r => matchWhere(r, where, model)) ?? null;
      return row ? project(row, args, model) : null;
    },
    async findUniqueOrThrow(args: any = {}) {
      const row = await this.findUnique(args);
      if (!row) { console.warn(`Demo DB: ${model} not found`); return project({ id: 'demo-missing' }, args, model); }
      return row;
    },
    async count(args: any = {}) {
      return getCollection(model).filter(r => matchWhere(r, normalizeWhere(args.where), model)).length;
    },
    async create(args: any = {}) {
      const rec = { id: args.data?.id ?? id(model.slice(0,3), getCollection(model).length + 100), createdAt: now, updatedAt: now, ...args.data };
      getCollection(model).push(rec);
      return project(rec, args, model);
    },
    async createMany(args: any = {}) {
      const data = Array.isArray(args.data) ? args.data : [args.data];
      for (const d of data) await this.create({ data: d });
      return { count: data.length };
    },
    async update(args: any = {}) {
      const where = normalizeWhere(args.where || {});
      let row = where.id ? getById(model, where.id) : getCollection(model).find(r => matchWhere(r, where, model));
      if (!row) { const newRow: Row = { id: where.id ?? id(model.slice(0,3), 999), ...args.data, createdAt: now, updatedAt: now }; getCollection(model).push(newRow); return project(newRow, args, model); }
      Object.assign(row, args.data || {}, { updatedAt: now });
      return project(row, args, model);
    },
    async updateMany(args: any = {}) {
      const rows = getCollection(model).filter(r => matchWhere(r, normalizeWhere(args.where), model));
      for (const r of rows) Object.assign(r, args.data || {}, { updatedAt: now });
      return { count: rows.length };
    },
    async upsert(args: any = {}) {
      const existing = await this.findUnique({ where: args.where }).catch(()=>null) ?? await this.findFirst({ where: args.where });
      if (existing) return this.update({ where: args.where, data: args.update, select: args.select, include: args.include });
      return this.create({ data: args.create, select: args.select, include: args.include });
    },
    async delete(args: any = {}) {
      const col = getCollection(model);
      const where = normalizeWhere(args.where);
      const idx = col.findIndex(r => matchWhere(r, where, model));
      if (idx < 0) return project({ id: where?.id ?? 'demo-missing' }, args, model);
      const [row] = col.splice(idx, 1);
      return project(row, args, model);
    },
    async deleteMany(args: any = {}) {
      const col = getCollection(model);
      const before = col.length;
      const where = normalizeWhere(args.where);
      const keep = col.filter(r => !matchWhere(r, where, model));
      store[model] = keep;
      return { count: before - keep.length };
    },
    async aggregate(args: any = {}) {
      const rows = getCollection(model).filter(r => matchWhere(r, normalizeWhere(args.where), model));
      const out: any = {};
      if (args._count) {
        out._count = args._count._all ? { _all: rows.length } : {};
        if (typeof args._count === 'object') for (const k of Object.keys(args._count)) if (k !== '_all') out._count[k] = rows.filter(r=>r[k]!=null).length;
      }
      if (args._sum) {
        out._sum = {};
        for (const k of Object.keys(args._sum)) out._sum[k] = rows.reduce((s,r)=>s + (Number(r[k])||0), 0);
      }
      if (args._avg) { out._avg = {}; for (const k of Object.keys(args._avg)) { const vals = rows.map(r=>r[k]).filter(v=>v!=null); out._avg[k]=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null; } }
      if (args._min) { out._min = {}; for (const k of Object.keys(args._min)) out._min[k] = rows.reduce((m,r)=>r[k]!=null&&(m==null||r[k]<m)?r[k]:m, null as any); }
      if (args._max) { out._max = {}; for (const k of Object.keys(args._max)) out._max[k] = rows.reduce((m,r)=>r[k]!=null&&(m==null||r[k]>m)?r[k]:m, null as any); }
      return out;
    },
    async groupBy(args: any = {}) {
      const rows = getCollection(model).filter(r => matchWhere(r, normalizeWhere(args.where), model));
      const by: string[] = Array.isArray(args.by) ? args.by : [args.by];
      const groups = new Map<string, Row[]>();
      for (const r of rows) {
        const key = JSON.stringify(by.map(k => r[k]));
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }
      let results = Array.from(groups.entries()).map(([key, gr]) => {
        const vals = JSON.parse(key);
        const row: any = {};
        by.forEach((k,i)=>row[k]=vals[i]);
        if (args._count) row._count = args._count._all ? { _all: gr.length } : Object.fromEntries(Object.keys(args._count).map(k=>[k, k==='_all'?gr.length:gr.filter(r=>r[k]!=null).length]));
        if (args._sum) row._sum = Object.fromEntries(Object.keys(args._sum).map(k=>[k, gr.reduce((s,r)=>s+(Number(r[k])||0),0)]));
        return row;
      });
      if (args.orderBy) {
        const obs = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
        results.sort((a,b)=>{
          for (const o of obs) {
            for (const [k,v] of Object.entries(o)) {
              const av = k==='_count' ? (a._count?.[(v as any)?._all!==undefined?'_all':Object.keys(v as any)[0]] ?? a._count?._all) : a[k];
              const bv = k==='_count' ? (b._count?.[(v as any)?._all!==undefined?'_all':Object.keys(v as any)[0]] ?? b._count?._all) : b[k];
              const dir = typeof v === 'object' ? Object.values(v as any)[0] : v;
              if (av===bv) continue;
              return (dir==='desc'?-1:1)*(av>bv?1:-1);
            }
          }
          return 0;
        });
      }
      if (args.take) results = results.slice(0, args.take);
      return results;
    },
  };
}

const handler: ProxyHandler<any> = {
  get(_t, prop: string) {
    if (prop === '$transaction') {
      return async (arg: any) => {
        if (Array.isArray(arg)) return Promise.all(arg);
        if (typeof arg === 'function') return arg(prismaMock);
        return arg;
      };
    }
    if (prop === '$connect' || prop === '$disconnect') return async () => {};
    if (prop === '$queryRaw' || prop === '$executeRaw' || prop === '$queryRawUnsafe' || prop === '$executeRawUnsafe') return async () => [];
    if (prop === '$use' || prop === '$on') return () => {};
    if (prop === 'then') return undefined;
    return makeDelegate(prop);
  }
};

const prismaMock = new Proxy({}, handler) as unknown as PrismaClient;

export const prisma = prismaMock;
export default prismaMock;

// Prevent TS/Next from complaining in edge cases; actual PrismaClient is only a type shape at runtime here.
void (PrismaClient as any);
