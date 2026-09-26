export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;

  sprites: {
    front_default: string | null;
    front_female: string | null;
    front_shiny: string | null;
    front_shiny_female: string | null;
  };

  stats: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];

  moves: {
    move: {
      name: string;
    };
  }[];

  species: {
    name: string;
    url: string;
  };
}