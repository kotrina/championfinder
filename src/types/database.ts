export type RunStatus = "pending" | "processing" | "done" | "error";
export type UserRole = "admin" | "user";

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
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          role?: UserRole;
        };
      };
      people: {
        Row: {
          pipedrive_id: number;
          nombre: string | null;
          apellidos: string | null;
          email: string | null;
          organizacion: string | null;
          marketing_status: string | null;
          rol: string | null;
          linkedin_url: string | null;
          won_deals: number;
          total_activities: number;
          location: string | null;
          empresa_linkedin: string | null;
          cargo_linkedin: string | null;
          email_linkedin: string | null;
          email_linkedin_status: string | null;
          needs_sync: boolean;
          is_historical: boolean;
          synced_at: string | null;
          created_at: string;
        };
        Insert: {
          pipedrive_id: number;
          nombre?: string | null;
          apellidos?: string | null;
          email?: string | null;
          organizacion?: string | null;
          marketing_status?: string | null;
          rol?: string | null;
          linkedin_url?: string | null;
          won_deals?: number;
          total_activities?: number;
          location?: string | null;
          empresa_linkedin?: string | null;
          cargo_linkedin?: string | null;
          email_linkedin?: string | null;
          email_linkedin_status?: string | null;
          needs_sync?: boolean;
          is_historical?: boolean;
          synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          nombre?: string | null;
          apellidos?: string | null;
          email?: string | null;
          organizacion?: string | null;
          marketing_status?: string | null;
          rol?: string | null;
          linkedin_url?: string | null;
          won_deals?: number;
          total_activities?: number;
          location?: string | null;
          empresa_linkedin?: string | null;
          cargo_linkedin?: string | null;
          email_linkedin?: string | null;
          email_linkedin_status?: string | null;
          needs_sync?: boolean;
          is_historical?: boolean;
          synced_at?: string | null;
        };
      };
      settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          value?: string;
          updated_at?: string;
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
