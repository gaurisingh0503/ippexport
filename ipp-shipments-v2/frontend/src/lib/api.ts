// Typed API methods. Add endpoints here as each phase is built.
import { http } from "./http";

export const api = {
  health: () => http.get<{ status: string }>("/health"),
};
