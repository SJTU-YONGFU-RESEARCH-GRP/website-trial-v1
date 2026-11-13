/* ExpansionTypes.ts — Model Corner & Monte Carlo Expansion */
export interface CornerEntry { device:string; corner:"t"|"s"|"f"; ion?:number; ioff?:number; ionIoff?:number; idens?:number; vth?:number; }
export interface McStats { device:string; samples:number; idMean?:number; idSigma?:number; params:{name:string;mean:number;sigma:number}[]; }
export interface KpiSet { sourceTT:string; sigma:number; devices:string[]; coverage:string; mcSamples:number; distribution:string; seed:string; }
export interface PlotArtifact { name:string; relPath:string; format:string; size:string; hash:string; displayUrl:string|null; width?:number; height?:number; aspectRatio?:number; caption?:{title:string;what:string;why:string;device?:string;corner?:string}; section:"iv"|"cv"|"mc"|"other"; }
export interface Result { resultId:string; title:string; model:string; sigma:number; devices:string[]; kpis:KpiSet; corners:CornerEntry[]; mcStats:McStats[]; reports:{name:string;relPath:string;size:string;hash:string;fetchUrl:string|null}[]; plots:PlotArtifact[]; dataArtifacts:{name:string;relPath:string;format:string;size:string;hash:string}[]; otherArtifacts:{name:string;relPath:string;size:string;hash:string;format?:string}[]; summary:{totalReports:number;totalPlots:number;totalData:number}; }
export interface Manifest { generatedAt:string; results:Result[]; defaultResultId:string; allModels:string[]; }
