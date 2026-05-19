export type RunStatus = "pending" | "processing" | "done" | "error";

export type Database = {
  public: {
    Tables: {
      runs: {
        Row: {
          id: string;
          created_at: string;
          filename: string;
          status: RunStatus;
          user_id: string;
          total_contacts: number;
          changed_count: number;
          error_count: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          filename: string;
          status?: RunStatus;
          user_id: string;
          total_contacts?: number;
          changed_count?: number;
          error_count?: number;
        };
        Update: {
          status?: RunStatus;
          total_contacts?: number;
          changed_count?: number;
          error_count?: number;
        };
      };
      contacts: {
        Row: {
          id: string;
          run_id: string;
          contact_id: string;
          nombre: string;
          apellidos: string;
          linkedin_url: string;
          empresa_original: string;
          empresa_actual: string | null;
          cargo_actual: string | null;
          changed: boolean;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          contact_id: string;
          nombre: string;
          apellidos: string;
          linkedin_url: string;
          empresa_original: string;
          empresa_actual?: string | null;
          cargo_actual?: string | null;
          changed?: boolean;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          empresa_actual?: string | null;
          cargo_actual?: string | null;
          changed?: boolean;
          error?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      run_status: RunStatus;
    };
  };
};
