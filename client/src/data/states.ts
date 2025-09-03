// Static states data - no API calls needed
export interface State {
  id: string;
  name: string;
  code: string;
}

export const STATES: State[] = [
  { id: "MP", name: "Madhya Pradesh", code: "MP" },
  { id: "OR", name: "Odisha", code: "OR" }, 
  { id: "TG", name: "Telangana", code: "TG" },
  { id: "TR", name: "Tripura", code: "TR" }
];

export const getStateById = (id: string): State | undefined => {
  return STATES.find(state => state.id === id);
};

export const getStateByName = (name: string): State | undefined => {
  return STATES.find(state => state.name === name);
};