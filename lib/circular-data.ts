import {
  CircularDocument,
  CircularTargetCriteria,
  CircularRecipientStatus,
  Member,
  PersonnelType,
} from "./types";
import { GOVERNMENT_DIVISIONS } from "./rbac";

export const CIRCULAR_STORAGE_KEY = "smartmso_circular_docs";

/**
 * Resolves a list of recipient members based on criteria
 */
export function resolveTargetRecipients(
  criteria: CircularTargetCriteria,
  availableMembers: Member[]
): CircularRecipientStatus[] {
  const activeMembers = availableMembers.filter(
    (m) => m.status === "active" || m.status === undefined
  );

  let targetMembers: Member[] = [];

  if (criteria.scope === "all") {
    targetMembers = [...activeMembers];
  } else {
    const memberIdSet = new Set<string>();

    activeMembers.forEach((member) => {
      let isMatch = false;

      // Match Division
      if (criteria.divisions && criteria.divisions.length > 0) {
        if (criteria.divisions.includes(member.division) || criteria.divisions.includes(member.department || "")) {
          isMatch = true;
        }
      }

      // Match Personnel Type
      if (criteria.personnelTypes && criteria.personnelTypes.length > 0) {
        if (member.personnelType && criteria.personnelTypes.includes(member.personnelType)) {
          isMatch = true;
        }
      }

      // Match Specific Member IDs
      if (criteria.specificMemberIds && criteria.specificMemberIds.includes(member.id)) {
        isMatch = true;
      }

      if (isMatch && !memberIdSet.has(member.id)) {
        memberIdSet.add(member.id);
        targetMembers.push(member);
      }
    });
  }

  return targetMembers.map((m) => ({
    memberId: m.id,
    memberName: m.name,
    division: m.division,
    personnelType: m.personnelType || ("ข้าราชการ" as PersonnelType),
    position: m.position,
    isAcknowledged: false,
  }));
}

/**
 * Default Initial Circular Documents (Realistic Thai Government MSO Documents)
 */
export const INITIAL_CIRCULAR_DOCS: CircularDocument[] = [];

/**
 * Load circular documents from local cache or initial
 */
export function loadStoredCircularDocs(): CircularDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const cleared = localStorage.getItem("smartmso_circular_cleared");
    if (cleared === "true") return [];

    const raw = localStorage.getItem(CIRCULAR_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Purge obsolete mock documents permanently
      const cleaned = parsed.filter(
        (d) => d && d.id !== "circ_2569_001" && d.id !== "circ_2569_002"
      );
      if (cleaned.length !== parsed.length) {
        saveStoredCircularDocs(cleaned);
      }
      return cleaned;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save circular documents to local cache
 */
export function saveStoredCircularDocs(docs: CircularDocument[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CIRCULAR_STORAGE_KEY, JSON.stringify(docs));
  } catch (err) {
    console.warn("Storage quota exceeded, preserving circular docs safely:", err);
    try {
      // Retain latest documents and slim down oversized historical base64 payloads if localStorage fills up
      const safeDocs = docs.slice(0, 20).map((d, idx) => {
        if (idx < 3) return d;
        return {
          ...d,
          fileUrl: d.fileUrl?.length > 300000 ? "/virtual-office/circular_docs/sample.pdf" : d.fileUrl,
          scannedPages: d.scannedPages?.map((p) => (p.length > 200000 ? "" : p)),
        };
      });
      localStorage.setItem(CIRCULAR_STORAGE_KEY, JSON.stringify(safeDocs));
    } catch {
      // Ignore fallback failure
    }
  }
}
