/**
 * Base URL of the NuvoVet FastAPI backend.
 *
 * Environment variable:
 *   VITE_API_URL  (default: https://nuvovet-systems.onrender.com)
 *
 * Request helpers live next to the screens that use them
 * (see pages/insurance/claimsApi.js).
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nuvovet-systems.onrender.com';
