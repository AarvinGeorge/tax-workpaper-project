// Packet shapes, from the README's field definitions (docs/packet/readme-verbatim.md).
// Strict where the README is clear; every record keeps unknown fields (index signature) so a newer packet still loads.

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Open = { [k: string]: unknown };

export interface Position { x0: number; y0: number; x1: number; y1: number }

export interface ExtractedValue extends Open {
  id: string; document_id: string; page: number; field: string; label: string;
  value: number | string | null; value_type: string; text_as_read: string;
  position: Position | null; confidence: number;
}

export interface DocPage extends Open { page: number; printed_content: string }

export interface PacketDocument extends Open {
  id: string; title: string; document_type: string; issuer: string | null; belongs_to: string | null;
  tax_year: number | null; received_at: string; uploaded_by: string | null; file_name: string | null;
  page_count: number; pages: DocPage[];
  extraction: { status: string; values: number; reason: string | null } & Open;
}

export interface ReturnLine extends Open {
  key: string; jurisdiction: 'federal' | 'california' | string; form: string; line: string; label: string;
  value: number | string | null; rule: string | null; inputs: string[]; sources: string[]; note?: string | null;
}

export interface Diagnostic extends Open { code: string; severity: string; message: string; refs: string[] }
export interface LineChange extends Open { key: string; change: string; old?: Json; new?: Json }

export interface ReturnVersion extends Open {
  version: string; computed_at: string; trigger: string; documents_used: string[]; documents_superseded: string[];
  summary: Open; tax_effect_rates: Record<string, { federal_per_dollar: number; california_per_dollar: number }>;
  carryovers_out: Open; assets: Open[]; diagnostics: Diagnostic[]; changes_from_previous: LineChange[]; lines: ReturnLine[];
}

export interface Staff extends Open {
  id: string; name: string; role: string; credential: string | null; sensitive_data_clearance: boolean;
  active_from: string | null; note?: string | null;
}
export interface ClientUser extends Open { id: string; name: string; role: string }

export interface TimelineEvent extends Open { id: string; at: string; event: string; actor: string | null; detail: string; refs: string[] }
export interface QuestionnaireAnswer extends Open { id: string; question: string; answer: string; answered_by: string; answered_at: string }
export interface Message extends Open { id: string; sent_at: string; from: string; to: string; text: string }

export interface Packet extends Open {
  packet: Open; readme: Open;
  household: Open & { people: (Open & { id: string; role: string; name: string; ssn?: string })[]; residency: Open; related_returns?: Open[] };
  documents: PacketDocument[]; extracted_values: ExtractedValue[];
  client: { questionnaire: QuestionnaireAnswer[]; messages: Message[]; call_notes: Open[] } & Open;
  firm: Open & { name: string; staff: Staff[]; client_users: ClientUser[]; starter_standards: Open & { rules: unknown; required_steps: unknown; variance_review: unknown; verification_types: unknown; review_levels: unknown }; deadlines: Open[]; budget_hours: Open; assignment_at_start: Open; firm_identity: Open };
  prior_years: Open & { return_2024: Open };
  tax_agency_records: Open; timeline: TimelineEvent[];
  engine_reference: { parameters: Record<string, unknown>; rules: Record<string, string> } & Open;
  return_versions: ReturnVersion[]; what_if: Open & { alternatives: Open[]; extension?: Open };
  post_filing_rates: Open; fx_rates: Open;
}
