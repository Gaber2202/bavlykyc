import type { MeResponse, UserBrief } from "@/types/api";
import { create } from "zustand";
import {
  loadTokensFromStorage,
  logoutRequest,
  meRequest,
  persistTokens,
} from "@/services/api";

interface AuthState {
  user: UserBrief | null;
  /** Server `EMPLOYEE_CAN_EDIT_OTHERS_RECORDS` — mirrors KYC RBAC for UI. */
  kycEmployeeCanEditOthers: boolean;
  hydrated: boolean;
  applyMe: (me: MeResponse | null) => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  kycEmployeeCanEditOthers: false,
  hydrated: false,
    applyMe: (me) =>
    set(
      me
        ? {
            user: me.user,
            kycEmployeeCanEditOthers: me.kyc_employee_can_edit_others ?? false,
          }
        : { user: null, kycEmployeeCanEditOthers: false },
    ),
  hydrate: async () => {
    loadTokensFromStorage();
    try {
      const me = await meRequest();
      set({
        user: me.user,
        kycEmployeeCanEditOthers: me.kyc_employee_can_edit_others ?? false,
        hydrated: true,
      });
    } catch {
      persistTokens(null);
      set({
        user: null,
        kycEmployeeCanEditOthers: false,
        hydrated: true,
      });
    }
  },
  logout: async () => {
    try {
      await logoutRequest();
    } catch {
      /* ignore */
    }
    persistTokens(null);
    set({ user: null, kycEmployeeCanEditOthers: false });
  },
}));
