export interface NombreLocalizado {
  en: string;
  jp: string;
  romaji: string;
}

export interface Bounty {
  id: string;
  created_at: string;
  amount: number | null;
  character_id: string | null;
  is_active: boolean;
}

export interface OnePieceCharacter {
  id: string;
  created_at: string;
  name: NombreLocalizado | null;
  age: number | null;
  birthday: unknown;
  blood_type: string | null;
  height: number | null;
  status: string | null;
  image_url: string | null;
  extra_data: Record<string, unknown> | null;
  bounties: Bounty[];
}

export interface DevilFruit {
  id: string;
  created_at: string;
  name: NombreLocalizado | null;
  model: NombreLocalizado | null;
  type: string | null;
  sub_type: string | null;
  image_url: string | null;
}