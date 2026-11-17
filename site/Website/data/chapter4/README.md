# Chapter 4 descriptive analysis

chapter4_analysis.py reads the unchanged Code_and_Processed_Data.zip one level
above this folder and the preserved policy_rate_provenance_v2.csv beside it.
It requires Python, pandas, NumPy and Matplotlib. Thesis.ipynb calls the same
functions and retains executed outputs. No forecasting model is fitted.

The seven tables and figures use retained source records. Daily tables use
3 January 2007 through 18 October 2026, each instrument's available eligible
closes, and returns with both endpoints in the interval. No imputation.
Sample SD uses n−1. Quartiles use linear interpolation. Action percentages
refer to the 155 eligible announcements within each year. Before-rate levels
are arithmetic implications; the 5 November 2009 8.25% level is conditional.

PNG/SVG figures are publication assets. The notebook uses a taller sample-flow
layout, with identical counts. reviewed_data.json retains the unrounded chart
inputs. The original workbook, analytical inputs and saved forecasts are unchanged.
