import { CLINIC_NAME, CLINIC_PHONE, CLINIC_EMAIL, CLINIC_ADDRESS } from "./clinic";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5045";
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@clinicamaissaude.com";
export const MAX_PROMPT_LENGTH = parseInt(import.meta.env.VITE_MAX_PROMPT_LENGTH || "300", 10);

export { CLINIC_NAME, CLINIC_PHONE, CLINIC_EMAIL, CLINIC_ADDRESS };

