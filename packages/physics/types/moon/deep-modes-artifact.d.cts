export const DEEP_MODES_ARTIFACT: Readonly<{
    meta: {
        integrator: string;
        order: number;
        dtDays: number;
        spanYears: number;
        sampleDays: number;
        gr: boolean;
        seed: string;
        masses: string;
        runCommand: string;
        dumpFile: string;
        dumpSha256: string;
        conservationMaxDE: number;
        decimation: number;
        naffTerms: number;
        naffZetaTerms: number;
        naffZetaTermsEra: number;
        frame: string;
        laskarRef: string;
    };
    verdict: {
        strongestBeatPeriodKyr: number;
        strongestBeatArcsecPerYr: number;
        la2004BeatPeriodKyr: number;
        rockMetronomeKyr: number;
        companion124Kyr: number;
        companion95Kyr: number;
        earthLeadingModesArcsecPerYr: number[];
        topBeatLines: {
            periodKyr: number;
            productAmp: number;
        }[];
        note: string;
    };
    earthZ: {
        omegaRadPerYr: number;
        re: number;
        im: number;
    }[];
    earthZeta: {
        omegaRadPerYr: number;
        re: number;
        im: number;
    }[];
    earthZetaEra: {
        omegaRadPerYr: number;
        re: number;
        im: number;
    }[];
    planetLeadingZetaArcsecPerYr: {
        mercury: number;
        venus: number;
        earth: number;
        mars: number;
        jupiter: number;
        saturn: number;
        uranus: number;
        neptune: number;
    };
    planetZ: {
        mercury: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        venus: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        mars: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        jupiter: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        saturn: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        uranus: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        neptune: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
    };
    planetZeta: {
        mercury: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        venus: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        mars: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        jupiter: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        saturn: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        uranus: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
        neptune: {
            omegaRadPerYr: number;
            re: number;
            im: number;
        }[];
    };
    anchorE: 0.016702435651957018;
    anchorPeriEclipticDeg: 462.9179213996577;
    anchorInclEclipticDeg: 0.00010345820355474172;
    anchorAscNodeEclipticDeg: 140.29217988414328;
}>;
export const DEEP_MODES_ARTIFACT_HASH: "77e0baf779e85de5";
