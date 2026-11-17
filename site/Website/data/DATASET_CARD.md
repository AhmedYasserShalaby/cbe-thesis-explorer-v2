# First-session Refinitiv and CBE dataset

Current scope: only the first actual trading session strictly after the meeting.
This is usually Sunday after a Thursday meeting; recorded closures and special
meetings determine the actual date. All daily price history remains available
for preceding closes and past inputs. Daily observations on other weekdays
are not additional forecast horizons.

Prices are the original Refinitiv .EGBANK, .EGREAL and .EGX30 Close exports.
Text and policy actions are original CBE sources. No alternate-provider fill,
translation, price imputation or globally trained text component was added.
The inventory has 176 records; 155 English policy announcements meet the common
first-session and complete-input requirements, producing 310 sector outcomes.
The same eligible and training IDs match the accepted corrected comparison.
The full-history evaluation has 119 origins after 36 initial events; the
overlapping modern-live sensitivity has 36 after 20 initial events.

CSV targets and lagged returns are percentages. The review workbook displays
fractions using percentage formats. Errors and paired differences are in
percentage points. The signed observed action is in basis points, not a
market-expectations-based surprise.

The review Excel includes later review-only deposit-rate level corrections;
the analytical CSVs preserve the accepted numerical predictors. The excluded
5 October 2005 deposit action is displayed correctly as a hold at 9% in Excel.
Before-levels are arithmetic implications; the 5 November 2009 8.25% level is
conditional on continuity. These review levels are not additional predictors.

This scope was narrowed at the student's request after inspection of historical
results. First-session saved predictions were selected without refitting or
new bootstrap calculations. The output is retrospective and exploratory.
Historical clocks/text vintages, index definitions, small dependent samples and
source-review limits remain. No causal, profitability or measured financing-
constraint claim follows. The original frozen sources and runs are preserved.
