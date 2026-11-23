/**
 * Static demo data for no-DB mode. Design/demo only — not persistent.
 */
export const DEMO_NOW = new Date('2026-11-23T12:00:00.000Z');
export const id = (p: string, n: number) => `${p}_${String(n).padStart(3,'0')}`;

export const categories = [
  { id: id('cat',1), name:'Hotel', slug:'hotel', description:'Rooms and suites in hotels across Nigeria.', icon:null, imageUrl:'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80', suggestedRateBasis:'NIGHTLY', sortOrder:0, isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id: id('cat',2), name:'Shortlet apartment', slug:'shortlet-apartment', description:'Fully furnished apartments for short stays.', icon:null, imageUrl:'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', suggestedRateBasis:'NIGHTLY', sortOrder:1, isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id: id('cat',3), name:'Serviced apartment', slug:'serviced-apartment', description:'Apartments with hotel-style services.', icon:null, imageUrl:'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', suggestedRateBasis:'MONTHLY', sortOrder:2, isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id: id('cat',4), name:'Residential apartment', slug:'residential-apartment', description:'Long-let flats and maisonettes.', icon:null, imageUrl:'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80', suggestedRateBasis:'ANNUAL', sortOrder:3, isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
];

export const amenities = [
  { id:id('am',1), name:'Air conditioning', slug:'air-conditioning', icon:'wind', group:'Comfort', isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id:id('am',2), name:'Free Wi-Fi', slug:'free-wifi', icon:'wifi', group:'Connectivity', isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id:id('am',3), name:'24-hour power', slug:'generator', icon:'zap', group:'Utilities', isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id:id('am',4), name:'Swimming pool', slug:'swimming-pool', icon:'waves', group:'Recreation', isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id:id('am',5), name:'Secure parking', slug:'parking', icon:'car', group:'Transport', isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id:id('am',6), name:'24-hour security', slug:'security', icon:'shield', group:'Safety', isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id:id('am',7), name:'Fully fitted kitchen', slug:'kitchen', icon:'utensils', group:'Comfort', isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id:id('am',8), name:'Gym', slug:'gym', icon:'dumbbell', group:'Recreation', isActive:true, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
];

export const locations = [
  { id:id('loc',1), name:'Lekki Phase 1', city:'Lagos', state:'Lagos', slug:'lekki-phase-1', popular:true, latitude:6.4301, longitude:3.4588, imageUrl:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80', sortOrder:0, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id:id('loc',2), name:'Victoria Island', city:'Lagos', state:'Lagos', slug:'victoria-island', popular:true, latitude:6.4281, longitude:3.4219, imageUrl:'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80', sortOrder:1, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
  { id:id('loc',3), name:'Ikoyi', city:'Lagos', state:'Lagos', slug:'ikoyi', popular:true, latitude:6.4550, longitude:3.4350, imageUrl:'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80', sortOrder:2, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
];

export const partners = [
  { id:id('prt',1), businessName:'Grand Hospitality', slug:'grand-hospitality', type:'HOTEL', email:'owner.grand@rentops.test', phone:'+2348010000001', whatsapp:null, website:null, description:'Premium hotel operator.', logoUrl:null, addressLine:'12 Admiralty Way', city:'Lagos', state:'Lagos', country:'Nigeria', verificationStatus:'VERIFIED', verifiedAt:DEMO_NOW, verifiedById:null, status:'ACTIVE', onboardingStep:'COMPLETE', payoutModel:'PLATFORM_COLLECTED', commissionRate:null, serviceFeeRate:null, settlementHoldDays:null, defaultCurrency:'NGN', createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
];

export const users = [
  { id:id('usr',1), firstName:'RemTops', lastName:'Admin', email:'admin@rentops.test', phone:null, passwordHash:'demo', emailVerifiedAt:DEMO_NOW, phoneVerifiedAt:null, avatarUrl:null, dateOfBirth:null, nationality:'Nigeria', systemRole:'SUPER_ADMIN', accountStatus:'ACTIVE', bio:null, preferredCurrency:'NGN', preferredLanguage:'en', createdAt:DEMO_NOW, updatedAt:DEMO_NOW, lastLoginAt:DEMO_NOW },
  { id:id('usr',2), firstName:'Chidi', lastName:'Okafor', email:'chidi@example.com', phone:'+2348010000002', passwordHash:'demo', emailVerifiedAt:DEMO_NOW, phoneVerifiedAt:null, avatarUrl:null, dateOfBirth:null, nationality:'Nigeria', systemRole:'CUSTOMER', accountStatus:'ACTIVE', bio:null, preferredCurrency:'NGN', preferredLanguage:'en', createdAt:DEMO_NOW, updatedAt:DEMO_NOW, lastLoginAt:DEMO_NOW },
  { id:id('usr',3), firstName:'Grand', lastName:'Owner', email:'owner.grand@rentops.test', phone:'+2348010000003', passwordHash:'demo', emailVerifiedAt:DEMO_NOW, phoneVerifiedAt:null, avatarUrl:null, dateOfBirth:null, nationality:'Nigeria', systemRole:'CUSTOMER', accountStatus:'ACTIVE', bio:null, preferredCurrency:'NGN', preferredLanguage:'en', createdAt:DEMO_NOW, updatedAt:DEMO_NOW, lastLoginAt:DEMO_NOW },
];

export const partnerMembers = [
  { id:id('pm',1), partnerId:id('prt',1), userId:id('usr',3), role:'OWNER', permissions:null, jobTitle:'Owner', status:'ACTIVE', invitedById:null, createdAt:DEMO_NOW, updatedAt:DEMO_NOW },
];
