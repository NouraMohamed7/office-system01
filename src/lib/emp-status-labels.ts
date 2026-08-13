/**
 * src/lib/emp-status-labels.ts
 * 
 * ⚠️ DEPRECATED — Re-export shim for backward compatibility.
 * All employee status constants have been consolidated into src/lib/constants.ts
 * 
 * Please update imports to use:
 *   import { EMP_STATUS_LABEL_AR, EMP_STATUS_TONE, normalizeEmpStatus, ... } from "@/lib/constants"
 * 
 * This file will be removed in a future refactor.
 */

export {
  type EmpStatus,
  EMP_STATUS_LABEL_AR,
  EMP_STATUS_TONE,
  EMP_STATUS_OPTIONS,
  normalizeEmpStatus,
} from "@/lib/constants";