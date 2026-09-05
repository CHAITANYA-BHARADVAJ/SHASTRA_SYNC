"use client";

import { useState, useEffect, useCallback } from "react";

export interface FamilyMember {
  name: string;
  relation: string;
  email: string;
  phone: string;
}

const FAMILY_STORAGE_KEY = "shastra-family-member";
// Fired within the same tab when the family member is updated, so other
// components using this hook re-sync immediately (the native `storage` event
// only fires in OTHER tabs).
const FAMILY_UPDATED_EVENT = "shastra-family-updated";

export const defaultFamilyMember: FamilyMember = {
  name: "Priya Sharma",
  relation: "Daughter (Primary Caregiver)",
  email: "priya.sharma@email.com",
  phone: "+91 98765 12345",
};

function readFamilyMember(): FamilyMember {
  if (typeof window === "undefined") return defaultFamilyMember;
  try {
    const raw = localStorage.getItem(FAMILY_STORAGE_KEY);
    if (raw) return { ...defaultFamilyMember, ...JSON.parse(raw) };
  } catch {
    // ignore corrupt data
  }
  return defaultFamilyMember;
}

/**
 * Shared source of truth for the family member (caregiver) details.
 * Backed by localStorage and synchronized across every component that uses
 * this hook — so editing the profile updates the dashboard, call flows, etc.
 */
export function useFamilyMember() {
  const [familyMember, setFamilyMember] = useState<FamilyMember>(defaultFamilyMember);

  // Load once on mount + subscribe to updates (this tab and other tabs).
  useEffect(() => {
    setFamilyMember(readFamilyMember());

    const resync = () => setFamilyMember(readFamilyMember());
    const onStorage = (e: StorageEvent) => {
      if (e.key === FAMILY_STORAGE_KEY) resync();
    };
    window.addEventListener(FAMILY_UPDATED_EVENT, resync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(FAMILY_UPDATED_EVENT, resync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const updateFamilyMember = useCallback((next: FamilyMember) => {
    setFamilyMember(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      // Notify other hook instances in the same tab.
      window.dispatchEvent(new Event(FAMILY_UPDATED_EVENT));
    }
  }, []);

  return { familyMember, updateFamilyMember };
}
