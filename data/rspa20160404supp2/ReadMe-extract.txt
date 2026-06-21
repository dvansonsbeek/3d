================================================================================
Extract of Lunar Occultation records from VI/132B Occultation Archive of
     Herald D., Gault D., International Occultation Timing Association (IOTA),
     (2010-2012), held by the Centre de Données Astronomiques de Strasbourg.

Used in "Measurement of the Earth's Rotation 720 BC to AD 2015", by
     F.R. Stephenson, L.V. Morrison and C. Y. Hohenkerk, published
     in The Royal Society Proceedings A at the Journals website at
     http://rspa.royalsocietypublishing.org/lookup/doi/10.1098/rspa.2016.0404

Description of Lunar Occultation Archive VI/132B, (Herald+ 2012)
    Lunar occultation timings from 1623 to the present time are brought
    together in a consistent format. The observations have been processed
    and reviewed to correct a range of data errors. Provisional reductions
    of the observations are provided. The reductions are based on the
    JPL-DE422 and -DE423 ephemerides, with limb corrections derived from
    satellite altimetry from the Kaguya mission.
================================================================================
This extract:
     We have selected the observations from the CDS archive (described above)
     with the purpose of deriving the value of DT (=TT-UT) for each observation.
     We designate the preliminary value of DT used by Herald & Gault in their
     reduction of an observation in the CDS file by HDT. The reduction of an
     occultation using this value of HDT produces the residual height - OC in
     the - CDS file of the star from the lunar limb, reckoned positive above the
     limb. If dOC is the difference in OC for a change of +1s in time, the value
     of DeltaT for an observation is thus

     DT = HDT - OC/dOC.

     This expression is indeterminate as dOC -> 0. So we have not selected
     observations with |dOC|<0.2.

     This file includes other information as indicated below.
================================================================================
File Summary:
--------------------------------------------------------------------------------
 FileName             Lrecl  Records      Explanation
--------------------------------------------------------------------------------
 ReadMe-extract.txt      80        .      This file
 extract-lunarocc.dat   107   120908      The file with the extracted data.

 Byte-by-byte Description of file: extract-lunarocc.dat
--------------------------------------------------------------------------------
  Bytes Format  Units    Label    Explanation
--------------------------------------------------------------------------------
  1- 10 F10.4   yr       Year    *[xxxxx] Julian Year and fraction of the
                                  observation, formed from the date and time.
 13- 22 F10.1   d        JD      *Julian date and fraction of the observation.
 25- 34 F10.2   s        DT      *Delta T for the observation, which is given
                                  by DT = HDT - OC/dOC, where HDT, OC and dOC
                                  have been extracted from the data, see below.
 37- 44 F8.2    ---      Wt      *Weight assigned to the observation,
                                  Wt = 0.09/ERR^2
 46      A1     ---      Phen     [BDEFMORSX?] Phenomena type (4)
 48      A1     ---      Limb     [DBU?] Bright or dark limb (5)
 50      A1     ---      Meth1    [CEGKMOPSTVX?] First method of timing and
                                                 recording 1 (8)
 52      A1     ---      Meth2    [ACEGKMOPSTVX?] Second method of timing and
                                                  recording (8)
 53- 60 F8.1    s        HDT     *Value of Delta T extracted from Heralds list
                                  of Delta T's used in the reduction and given
                                  in the file doc.txt file.
 61- 69 F9.2    arcsec   OC       O-C residual - height of the star above the
                                  lunar limb.
 71- 77 F7.2    arcsec/s dOC      O-C change for a time difference of
                                  +1.0 second.
 78- 87 F10.3    s       OC/dOC  *O-C residual - height of the star above the
                                  lunar limb divided by O-C change for a time
                                  difference of +1.0 second.
 91      A1     ---      Acc      [123456789?] Accuracy (18)
 92- 99 F8.3    s        Accur    [0.000,9.999]? Accuracy of time.
100-107 F8.3             ERR     *ERR = Error in timing estimated from the
                                  parameters Acc and Accur, and the methods
                                  of timing, Meth1 and Meth2.
--------------------------------------------------------------------------------

Notes
Those quantities with an * in column 34, just before the Explanation are not
part of Herald's CDS Occultation Archive, but added.  Some of these quantities,
such as the Year and fraction, DT and the Weight Wt, were used in the weighted
least-squares spline fitting process.

The following numbered notes are extracted directly from Herald's ReaMe.txt
file.  The numbering has not been changed, and are included here to be
consistent with the quantities included in this file.
--------------------------------------------------------------------------------

Extract from Herald's Notes:
Note (4): the code for the Phenomena type is as follows:
    D = disappear
    R = reappear
    B = Blink. The mid-time of a blink event. Usually only occurs during
        a graze, but can occur in near-graze situations. Duration is
        specified at col 48.
        (video) partial disappearance (always >25% of full light).
        (visual) a short disappearance-reappearance - too close to
        separately time.
    F = Flash. The mid-time of a flash event. Usually only occurs during
        a graze, but can occur in near-graze situations. Duration is
        specified at col 48.
        (video) partial reappearance (always <25% of full light).
        (visual) a short reappearance-disappearance - too close to
        separately time.
    M = Miss. The time when the star was adjacent the highest point on the
        observed or predicted graze profile - although the time might also
        be simply the mid-time of the graze. Usually only used when other
        observers in a graze observation have recorded D and/or R events
    S = Start or resume. Only used in a graze observation, to indicate
        periods when the observer was observing.
    E = End or pause. Only used in a graze observation, to indicate
        periods when the observer was not observing.
    O = Other [used by ILOC instead of S or E]
    X = Missing data. A grazing occultation of this star was known to have
        been successfully observed on this date, but no observations are
        available.  The time and site coordinates are indicative only.

Note (5): the Bright or dark limb code is:
    D = dark limb
    B = bright limb (including lunar eclipse penumbra)
    U = umbra of lunar eclipse

Note (8): the code for the method of timing and recording is:
    G = Video with time insertion, times extracted by frame analysis
    V = Video with other time linking, times extracted by frame analysis
    M = Video with other time linking, times extracted by replay
    S = Stopwatch (visual)
    T = Tape recorder (visual)
    E = Eye and ear
    P = Photoelectric
    K = Key-tapping - including computer keyboards
    X = Chronograph
    C = Camera and clock
    O = Other [details reported to ILOC, but not captured.]
    A = Time base corrected using adjacent observers.
        This is only used in Meth2.

Note (9): the code for the Time source is:
    G = GPS (using 1PPS output, NOT GPS screen display)
    R = Radio signal (standard time signal)
    N = Network Time Protocol (using NTP software)
    C = Clock(adjusted by standard time signal)
    T = Telephone
    M = Some medium related with standard time signal
    O = GPS screen display, computer clock not using NTP software
        (poor accuracy).

Note (18): the code for Accuracy (RGO) is:
    1 = excellent, very good (+/-0.1s, +/-0.2s)
    2 = good, certain (+/-0.3s, +/-0.4s)
    3 = fair, satisfactory (+/-0.5s to +/-0.7s)
    4 = poor, uncertain (+/-0.8s, +/-0.9s)
    5 = very poor, very doubtful (+/-1s)
    6 = star faint
    7 = perhaps early
    8 = perhaps late
    9 = uncertain by tens of seconds
--------------------------------------------------------------------------------

Acknowledgements: Herald D. and Gault D.,
                  International Occultation Timing Association (IOTA),
                  Centre de Données Astronomiques de Strasbourg.

History:

================================================================================
(End)   Catherine Hohenkerk, Leslie Morrison,  Richard Stephenson    01-Nov-2016
================================================================================
