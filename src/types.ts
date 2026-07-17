/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Chapter {
  id: string;
  title: string;
  category: "intro" | "vital" | "scenario" | "exec" | "appendix";
  content: string; // Markdown or structured HTML
  summary: string;
  checklists: string[];
  mission: {
    title: string;
    description: string;
  };
}

export interface Protocol {
  id: string;
  title: string;
  trigger: string;
  objective: string;
  steps: string[];
  fatalError: string;
  checklist: string[];
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  steps: string[];
}

export interface UserProgress {
  readChapters: string[]; // list of chapter ids
  readProtocols: string[]; // list of protocol ids
  completedChecklists: string[]; // key-value or string list of checked items
  waterCalc: {
    people: number;
    days: number;
    customReserve: number;
  };
  foodCalc: Array<{
    id: string;
    item: string;
    qty: number;
    calories: number;
    expiry: string;
    familyLikes: boolean;
    needsCooking: boolean;
  }>;
  medicationList: Array<{
    id: string;
    name: string;
    person: string;
    dose: string;
    schedule: string;
    reserveDays: number;
  }>;
  commContacts: Array<{
    id: string;
    name: string;
    relation: string;
    phone: string;
    message: string;
    point1: string; // near
    point2: string; // far
  }>;
  riskMapping: Array<{
    id: string;
    threat: string;
    probability: "Alta" | "Baixa";
    impact: "Alto" | "Baixo";
    notes: string;
  }>;
  diagnosticScores: {
    [key: string]: number; // area -> score 0-5
  };
}
