const fs = require("node:fs");
const path = "prisma/schema.prisma";
let s = fs.readFileSync(path, "utf8");
const money = new Set([
  "nightlyRate","weeklyRate","monthlyRate","annualRate","weekendNightlyRate","extraGuestFee","cleaningFee","serviceCharge","securityDeposit","accommodationSubtotal","extraGuestCharges","discountAmount","grossAmount","platformCommission","processingFee","partnerNetAmount","refundAmount","rateMinor","subtotal","amount","commissionDeducted","processingFeeDeducted","netPayable","paidAmount","chargeMinor","rewardMinor","value","maxDiscount","minAmount","baseNightlyRate",
]);
const lines = s.split("\n");
let changed = 0;
const out = lines.map((l) => {
  const m = /^(\s*)([A-Za-z]\w*)(\s+)Int(\?)?(\s+@default\([^)]*\))?(.*)$/.exec(l);
  if (!m) return l;
  if (!money.has(m[2])) return l;
  changed++;
  return `${m[1]}${m[2]}${m[3]}Float${m[4] ?? ""}${m[5] ?? ""}${m[6] ?? ""}`;
});
fs.writeFileSync(path, out.join("\n"));
console.log(`Converted ${changed} money fields from Int to Float.`);
