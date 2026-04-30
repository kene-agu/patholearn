export interface Annotation {
  id: string;
  label: string;
  description: string;
  xPercent: number;
  yPercent: number;
  /** 1–2 additional locations of the same feature for visual comparison */
  extraPoints?: Array<{ xPercent: number; yPercent: number }>;
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

export interface NegativeObservation {
  feature: string;
  significance: string;
}

export interface MagnificationAssessment {
  power: "low" | "medium" | "high";
  canAssess: string[];
  cannotAssess: string[];
}

export interface ArtifactAssessment {
  artifactsFound: boolean;
  details: string;
}

export interface MimickerExclusion {
  mimicker: string;
  excludingFeature: string;
}

export interface AdditionalStain {
  stain: string;
  expectedResult: string;
}

export interface Grading {
  system: string;
  grade: string;
  componentsCantAssess: string[];
}

export interface TeachingClose {
  pearl: string;
  pitfall: string;
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
  negativeObservations?: NegativeObservation[];
  magnificationAssessment?: MagnificationAssessment;
  artifactAssessment?: ArtifactAssessment;
  mimickerExclusion?: MimickerExclusion[];
  additionalStains?: AdditionalStain[];
  clinicalCorrelationDetail?: string;
  grading?: Grading | null;
  teachingClose?: TeachingClose;
}
