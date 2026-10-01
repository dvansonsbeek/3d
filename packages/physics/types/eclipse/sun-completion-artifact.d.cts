export const SUN_COMPLETION_ARTIFACT: Readonly<{
    planetLamDotJ2000DegPerYr: {
        mercury: number;
        venus: number;
        mars: number;
        jupiter: number;
        saturn: number;
        uranus: number;
        neptune: number;
    };
    eccVectors: {
        t0Yr: number;
        stepYr: number;
        bodies: {
            venus: {
                zQ: number[];
                zP: number[];
            };
            earth: {
                zQ: number[];
                zP: number[];
            };
            mars: {
                zQ: number[];
                zP: number[];
            };
            jupiter: {
                zQ: number[];
                zP: number[];
            };
        };
    };
    meta: {
        dumpSha256: string;
        source: string;
    };
}>;
export const SUN_COMPLETION_ARTIFACT_HASH: "5ad17b275a003f6e";
