export interface Annotation {
  id: string;
  label: string;
  description: string;
  xPercent: number;
  yPercent: number;
}

export interface Structure {
  name: string;
  description: string;
  normalOrAbnormal: "normal" | "abnormal";
  educationalNote: string;
}

export interface StainInfo {
  type: string;
  reasoning: string;
  colorCharacteristics: string;
}

export interface DifferentialDiagnosis {
  diagnosis: string;
  distinguishingFeatures: string;
}

export interface IHCMarker {
  marker: string;
  expectedResult: "positive" | "negative" | "variable";
  significance: string;
}

export interface PathogenesisStep {
  step: number;
  title: string;
  description: string;
}

export interface MolecularAlteration {
  gene: string;
  alteration: string;
  frequency: string;
  significance: string;
}

export interface ReasoningChain {
  stainAnalysis: string;
  tissueIdentification: string;
  architecturalPattern: string;
  cellularMorphology: string;
  nuclearFeatures: string;
  keyObservedFeatures: string[];
  differentialNarrowing: string;
  diagnosticConfidenceJustification: string;
}

export interface AnalysisResult {
  reasoningChain?: ReasoningChain;
  diagnosis: string;
  confidence: "High" | "Medium" | "Low";
  overview: string;
  structures: Structure[];
  stain: StainInfo;
  riskFactors: string[];
  complications: string[];
  differentialDiagnosis: DifferentialDiagnosis[];
  clinicalCorrelation: string;
  keyLearningPoints: string[];
  annotations: Annotation[];
  ihcMarkers: IHCMarker[];
  pathogenesis: PathogenesisStep[];
  molecularProfile?: MolecularAlteration[];
}
