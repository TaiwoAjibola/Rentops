import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function block(length: number) {
  let out = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    out += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  }
  return out;
}

export function reservationReference() {
  return `RTB-${block(8)}`;
}

export function paymentReference() {
  return `RTP-${block(10)}`;
}

export function settlementReference() {
  return `RTS-${block(8)}`;
}

export function inspectionReference() {
  return `RTI-${block(8)}`;
}

export function disputeReference() {
  return `RTD-${block(8)}`;
}

export function ticketReference() {
  return `RTT-${block(8)}`;
}

export function verificationReference() {
  return `RTV-${block(8)}`;
}

export function inviteToken() {
  return randomBytes(32).toString("base64url");
}
