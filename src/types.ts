export interface IdentifyRequest {
  email?: string;
  phoneNumber?: string;
}

export interface ConsolidatedContact {
  primaryContatctId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}