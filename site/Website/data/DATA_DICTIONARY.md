# First-session data dictionary

Analytical CSV returns are percentages; errors and loss differences are percentage points. Excel return cells are numeric fractions displayed as percentages.

## daily_prices

| Field | Unit | Definition |
| --- | --- | --- |
| date | ISO_date_no_clock | Date label in the price export or civil calendar register, ISO YYYY-MM-DD; no intraday timezone metadata. |
| instrument | see_definition | banks, real_estate or egx30; selects the matching Refinitiv RIC export. |
| ric | see_definition | Retained instrument identity: .EGBANK, .EGREAL or .EGX30. |
| close | index_points_EGP_basis | Unfilled numeric TRDPRC_1/Close level from the matching RIC raw XLSX B-cell. Missing is never zero. |
| price_unit | see_definition | Index points; an index level is not a cash price. |
| currency_basis | see_definition | EGP basis supported by retained quote/index evidence; the raw XLSX does not contain a currency header. |
| field | see_definition | Raw vendor field TRDPRC_1, as written in the original header. |
| aggregation | see_definition | Raw second-row header Close; it does not independently prove finality, adjustments or total-return variant. |
| sector_definition | see_definition | Legacy through 31 December 2019 versus modern live from 2 January 2020; EGX30 has separate construction. No modern 2019 backcast is synthesized. |
| eligible_observed_session | see_definition | True when the shared observed RIC date passes weekday, suspension, base-date and completed-close-cutoff rules. Not full calendar certification. |
| eligible_close | index_points_EGP_basis | Close is present and date passes static calendar/cutoff rules. Does not certify first release timing. |
| missingness_status | see_definition | Observed, absent inside that instrument's exported date span, or outside exported history. No filling. |
| close_exclusion_reason | see_definition | Reason this daily cell is not an eligible close, including missingness, provisional final bar, pre-base date or suspension. |
| previous_session_date | ISO_date_no_clock | Immediately preceding date on the common eligible observed RIC union; never a per-instrument skip past a missing close. |
| previous_close | index_points_EGP_basis | This instrument's unfilled raw close on previous_session_date. |
| daily_return_pct | percentage_points | 100*(close/previous_close-1). Missing for invalid dates, absent endpoints or crossing sector definition boundary. |
| return_status | see_definition | Availability or exclusion reason for the daily close-to-close ratio. |
| source_file | see_definition | Workspace-relative immutable source path; use source_sha256 and source_cell to reproduce a raw price. |
| source_sha256 | SHA-256_hex | SHA-256 digest of the exact immutable source bytes. |
| source_cell | see_definition | Original XLSX Table Data B-cell address; blank for a genuinely absent price cell. |
| previous_source_cell | see_definition | Original B-cell address for previous_close; blank if unavailable. |
| raw_adjustment_metadata | see_definition | The Date/Close export does not supply adjustment or total-return metadata; no adjustment transformation is applied here. |
| source_finality | see_definition | Historical Close label retained, or explicitly unverified latest export bar. |
| provider_comparison_status | see_definition | Known localized source differences remain documented; no old-provider value enters this version. |

## common_event_cohort

| Field | Unit | Definition |
| --- | --- | --- |
| doc_id | see_definition | Stable inherited statement identifier. Its embedded historical date is not authoritative; use event_date. |
| event_date | ISO_date_no_clock | Retained original-identity-corrected MPC meeting/decision date. Not a verified first-publication or rate-effective date. |
| sector_definition | see_definition | Legacy through 31 December 2019 versus modern live from 2 January 2020; EGX30 has separate construction. No modern 2019 backcast is synthesized. |
| first_session_date | ISO_date_no_clock | First common eligible observed session strictly after meeting date. This is a retrospective alignment rule, not verified availability. |
| cohort_rule | see_definition | Deterministic eligibility rule applied to complete independent events across both sectors and all horizons. |
| timing_status | see_definition | Retrospective qualification for the comparison cohort. |

## event_exclusions

| Field | Unit | Definition |
| --- | --- | --- |
| doc_id | see_definition | Stable inherited statement identifier. Its embedded historical date is not authoritative; use event_date. |
| event_date | ISO_date_no_clock | Retained original-identity-corrected MPC meeting/decision date. Not a verified first-publication or rate-effective date. |
| sector | see_definition | Prediction sector: banks or real_estate. Two rows share one independent announcement. |
| horizon | see_definition | first_session only; the announcement remains the grouping unit. |
| reason | see_definition | Joined explicit event/horizon exclusion reasons; missingness is retained in the full table. |
| target_value_available | see_definition | A raw target ratio exists despite other potential exclusions (e.g. language, policy parse or lagged inputs). |

## calendar_register

| Field | Unit | Definition |
| --- | --- | --- |
| date | ISO_date_no_clock | Date label in the price export or civil calendar register, ISO YYYY-MM-DD; no intraday timezone metadata. |
| weekday | see_definition | Civil weekday of calendar date. |
| calendar_status | see_definition | Weekend, documented suspension, observed session proxy, provisional cutoff, pre-base date or unverified weekday without observation. |
| in_raw_union | see_definition | At least one of the three raw RIC exports has this date label. |
| eligible_session_proxy | see_definition | Date in observed RIC union and accepted by explicit weekday/suspension/cutoff rules; not a certified complete trading calendar. |
| banks_observed | see_definition | Banks raw export contains this date, independently of other instruments. |
| real_estate_observed | see_definition | Real Estate raw export contains this date. |
| egx30_observed | see_definition | EGX30 raw export contains this date. |
| evidence_url | see_definition | Retained public source for documented exception or original-rate review explanation, as applicable. |
| calendar_certified | see_definition | False: no complete independently certified historical exchange calendar was acquired. |

## policy_rate_corrections_applied

| Field | Unit | Definition |
| --- | --- | --- |
| event_date | ISO_date_no_clock | Retained original-identity-corrected MPC meeting/decision date. Not a verified first-publication or rate-effective date. |
| field | see_definition | Raw vendor field TRDPRC_1, as written in the original header. |
| old_value | see_definition | Preserved prior value in the seven audited deposit-rate corrections; blank prior values remain in the inherited field. |
| proposed_value | see_definition | Audited corrected after-rate value applied only to new versioned after-rate column. |
| original_pdf_file | see_definition | Workspace-relative original CBE PDF path, with immutable bytes retained. |
| original_pdf_sha256 | SHA-256_hex | SHA-256 of retained original PDF bytes, verified against actual files. |
| scope | see_definition | Earlier correction-log scope, retained unchanged; current application is documented in transformation_log.csv. |
| evidence | see_definition | Retained earlier source-review evidence, not a new visual review claim. |

## original_text_inventory

| Field | Unit | Definition |
| --- | --- | --- |
| event_date | ISO_date_no_clock | Retained original-identity-corrected MPC meeting/decision date. Not a verified first-publication or rate-effective date. |
| doc_id | see_definition | Stable inherited statement identifier. Its embedded historical date is not authoritative; use event_date. |
| source_url | see_definition | Inherited CBE original-source URL; original_pdf_url contains the full retained PDF identity from the timing register. |
| statement_text | see_definition | Complete retained working transcription, unchanged from the pinned corpus. Original identity/date checks do not certify every OCR/body or historical version. |
| sentence_count | see_definition | Inherited sentence count from historical corpus assembly; not freshly retokenized in this build. |
| word_count | see_definition | Inherited whitespace-token count of the retained working text. |
| statement_text_sha256 | SHA-256_hex | SHA-256 of exact UTF-8 statement_text string, excluding any file-added newline. |
| source_corpus | see_definition | Inherited text-source category; policy candidates use official originals. Administrative records remain excluded. |
| source_revision | see_definition | Inherited acquisition/revision provenance label, not first publication time. |
| original_pdf_verified | see_definition | Inherited original identity/date check only; does not certify the entire text, clock, translation or vintage. |
| release_time_verified | see_definition | Inherited verification flag. Exact original first-release clocks remain unverified. |
| known_date_text_mismatch | see_definition | Inherited text/date anomaly indicator retained for audit; not a new source-body certification. |
| within_current_sector_date_range | see_definition | Historical pilot metadata, retained unchanged. Not used as a current Refinitiv coverage or model eligibility selector. |
| source_capture_file | see_definition | Pinned original extraction or reviewed derivative path used by the retained working corpus. |
| capture_completeness | see_definition | Inherited extraction/body preservation description; not an independent fresh semantic review. |
| administrative_notice | see_definition | Inherited indicator distinguishing retained administrative records from policy candidates. |
| record_status | see_definition | policy_statement_candidate (174) or administrative_notice_exclude (2); full inventory preserved. |
| policy_action | see_definition | Inherited observed decision classification: hold, hike, cut, unresolved or administrative. Not a monetary-policy surprise. |
| reported_rate_change_bps | basis_points_signed | Signed observed decision: hike positive, cut negative, hold zero. One percentage point equals 100 basis points. |
| deposit_rate_pct | annual_percent | Inherited after-decision overnight deposit rate, annual percent; missing inherited cells are preserved here. |
| action_parse_status | see_definition | Inherited extraction/review depth; rule_extracted_needs_review does not imply universal human validation. |
| normalized_text_sha256 | SHA-256_hex | Inherited hash of normalized text for duplicate/identity comparison; exact modeling text is statement_text. |
| forecast_release_cutoff_verified | see_definition | False: no original full-statement clock verifies availability before this conceptual cutoff. |
| data_rights_cleared | see_definition | Inherited false/unresolved rights flag. An export is not redistribution permission. |
| date_correction_from | see_definition | Preserved earlier secondary date where original-header review corrected event_date; doc_id remains stable. |
| original_pdf_file | see_definition | Workspace-relative original CBE PDF path, with immutable bytes retained. |
| original_pdf_sha256 | SHA-256_hex | SHA-256 of retained original PDF bytes, verified against actual files. |
| text_transcription_review | see_definition | Inherited per-document OCR/body review depth. Earlier receipts are reused, not relabelled fresh review. |
| source_language | see_definition | Official_English or Official_Arabic for policy originals; secondary administrative transcriptions remain excluded. |
| source_capture_sha256 | SHA-256_hex | SHA-256 of source_capture_file bytes, including any file newline; distinct from statement_text string hash. |
| original_pdf_url | see_definition | Full retained CBE original PDF URL from the pinned timing inventory. |
| original_html_url | see_definition | Retained original CBE HTML page URL where known; not evidence of its first publication clock. |
| exact_original_release_status | see_definition | unverified for all 174 policy candidates; administrative records may use a separate excluded status. |
| original_release_date_verified | see_definition | Verified original release date if independently established; blank remains unknown and is not filled with meeting date. |
| original_clock_raw | see_definition | Verbatim verified original clock where known; blank because no exact original clock was established. |
| original_clock_timezone | see_definition | Verified original-clock timezone, blank when unknown; never inferred from a filename. |
| original_clock_precision | see_definition | Resolution of verified original-clock evidence; blank when unknown. |
| first_original_release_utc | source_datetime_or_blank_unverified | Verified first-original full-statement release datetime in UTC; blank/unverified in this inventory. |
| first_original_release_cairo | source_datetime_or_blank_unverified | Verified first-original release datetime in Cairo; blank/unverified in this inventory. |
| full_statement_timing_evidence_status | see_definition | Original/copy/full-body timing evidence classification. Copy clocks are not promoted to original clocks. |
| source_reported_copy_published_raw | see_definition | Retained matching-copy publication time (verbatim source label); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_updated_raw | see_definition | Retained matching-copy update/current-version time (verbatim source label); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_published_utc | source_datetime_or_blank_unverified | Retained matching-copy publication time (UTC); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_published_cairo | source_datetime_or_blank_unverified | Retained matching-copy publication time (Cairo); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_current_version_by_utc | source_datetime_or_blank_unverified | Retained matching-copy update/current-version time (UTC); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_current_version_by_cairo | source_datetime_or_blank_unverified | Retained matching-copy update/current-version time (Cairo); not first CBE publication or independently captured historical full-text availability. |
| independent_historical_full_text_capture_by_utc | source_datetime_or_blank_unverified | Accepted independent historical full-text availability bound if found; blank remains unresolved. |
| copy_source_url | see_definition | Public reproduction URL whose clock/body evidence is retained; not the CBE first release. |
| copy_source_file | see_definition | Local raw copy-evidence file from earlier timing work, often a retained feed snapshot. |
| copy_source_sha256 | SHA-256_hex | SHA-256 of retained copy-evidence bytes; distinct from original or transcription hashes. |
| existing_target_ordering_diagnostic_unchanged | see_definition | Inherited timing diagnostic; it does not certify first-session real-time availability. |
| rate_effective_date | ISO_date_no_clock | Blank: not systematically extracted/verified; distinct from event_date, release date and eligible session dates. |
| rate_effective_date_status | see_definition | Explicit not-extracted/not-verified status; no automatic Sunday or meeting-date substitution. |
| deposit_after_proposed_pct | annual_percent | After-decision rate using seven already audited missing-value corrections in this version; original inherited field is unchanged. |
| deposit_before_source_supported_or_implied_pct | annual_percent | Earlier checked or same-statement arithmetically implied before-rate. Consult rate_check_status/evidence; not universally independently verified. |
| rate_check_status | see_definition | Inherited source-check versus parse/implied distinction for rate fields. |
| rate_evidence | see_definition | Retained explanation of original page/paragraph review or same-statement arithmetic implication. |

## timing_register_preserved

| Field | Unit | Definition |
| --- | --- | --- |
| event_date | ISO_date_no_clock | Retained original-identity-corrected MPC meeting/decision date. Not a verified first-publication or rate-effective date. |
| doc_id | see_definition | Stable inherited statement identifier. Its embedded historical date is not authoritative; use event_date. |
| record_status | see_definition | policy_statement_candidate (174) or administrative_notice_exclude (2); full inventory preserved. |
| source_language | see_definition | Official_English or Official_Arabic for policy originals; secondary administrative transcriptions remain excluded. |
| in_existing_155_matched_events | see_definition | Historical panel-membership indicator only; new eligibility is recomputed from Refinitiv data. |
| in_priority_12_examples | see_definition | Membership of earlier presentation examples; not the full new dataset. |
| original_pdf_url | see_definition | Full retained CBE original PDF URL from the pinned timing inventory. |
| original_html_url | see_definition | Retained original CBE HTML page URL where known; not evidence of its first publication clock. |
| original_pdf_file | see_definition | Workspace-relative original CBE PDF path, with immutable bytes retained. |
| original_pdf_sha256 | SHA-256_hex | SHA-256 of retained original PDF bytes, verified against actual files. |
| retained_text_sha256 | SHA-256_hex | Earlier timing register's exact working-transcription hash, reconciled to statement_text_sha256 without changing the text. |
| exact_original_release_status | see_definition | unverified for all 174 policy candidates; administrative records may use a separate excluded status. |
| original_release_date_verified | see_definition | Verified original release date if independently established; blank remains unknown and is not filled with meeting date. |
| original_clock_raw | see_definition | Verbatim verified original clock where known; blank because no exact original clock was established. |
| original_clock_timezone | see_definition | Verified original-clock timezone, blank when unknown; never inferred from a filename. |
| original_clock_precision | see_definition | Resolution of verified original-clock evidence; blank when unknown. |
| first_original_release_utc | source_datetime_or_blank_unverified | Verified first-original full-statement release datetime in UTC; blank/unverified in this inventory. |
| first_original_release_cairo | source_datetime_or_blank_unverified | Verified first-original release datetime in Cairo; blank/unverified in this inventory. |
| English_original_status | see_definition | Retained English-original identity/availability status from timing work; Arabic-only candidate remains separate. |
| full_statement_timing_evidence_status | see_definition | Original/copy/full-body timing evidence classification. Copy clocks are not promoted to original clocks. |
| source_reported_copy_published_raw | see_definition | Retained matching-copy publication time (verbatim source label); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_updated_raw | see_definition | Retained matching-copy update/current-version time (verbatim source label); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_published_utc | source_datetime_or_blank_unverified | Retained matching-copy publication time (UTC); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_published_cairo | source_datetime_or_blank_unverified | Retained matching-copy publication time (Cairo); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_current_version_by_utc | source_datetime_or_blank_unverified | Retained matching-copy update/current-version time (UTC); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_current_version_by_cairo | source_datetime_or_blank_unverified | Retained matching-copy update/current-version time (Cairo); not first CBE publication or independently captured historical full-text availability. |
| independent_historical_full_text_capture_by_utc | source_datetime_or_blank_unverified | Accepted independent historical full-text availability bound if found; blank remains unresolved. |
| copy_source_url | see_definition | Public reproduction URL whose clock/body evidence is retained; not the CBE first release. |
| copy_source_file | see_definition | Local raw copy-evidence file from earlier timing work, often a retained feed snapshot. |
| copy_source_sha256 | SHA-256_hex | SHA-256 of retained copy-evidence bytes; distinct from original or transcription hashes. |
| copy_feed_entry_id | see_definition | Inherited feed item identifier used to trace copy evidence within a shared feed file. |
| copy_text_numeric_match_reconciled_this_pass | see_definition | Inherited 25 October reproduction matching flag. Not a fresh finding from the new price build. |
| existing_target_ordering_diagnostic_unchanged | see_definition | Inherited timing diagnostic; it does not certify first-session real-time availability. |
| new_public_checks_scope | see_definition | Recorded scope of earlier bounded timing recovery; not a new search in this data build. |
| new_evidence_notes | see_definition | Prior timing-recovery notes, retained as evidence rather than executable instructions. |
| official_index_date_label_unverified | see_definition | Observed official web date label with unresolved semantic meaning; not the accepted publication date. |
| historical_url_candidates_unmatched | see_definition | Retained historical URL leads without accepted body/identity match. |
| unsent_request_id | see_definition | Earlier unsent metadata-request key; does not mean a request was transmitted. |
| limitations | see_definition | Retained record-level source/timing limitations. |

## target_coverage

| Field | Unit | Definition |
| --- | --- | --- |
| sector | see_definition | Prediction sector: banks or real_estate. Two rows share one independent announcement. |
| horizon | see_definition | first_session only; the announcement remains the grouping unit. |
| inventory_records | see_definition | Full per-sector inventory denominator, including administrative records. |
| policy_candidates | see_definition | Independent policy-candidate count before language/coverage exclusions. |
| English_policy_candidates | see_definition | Original-English policy-candidate denominator before model eligibility exclusions. |
| raw_target_available_records | see_definition | Count of full-inventory records with an arithmetically available target ratio. |
| raw_target_missing_records | see_definition | Full-inventory records without that target ratio; not zero returns. |
| raw_target_available_English_policy_events | see_definition | Original-English policy events with an available target, before predictor/cohort exclusions. |
| eligible_independent_events | see_definition | Eligible independent event count for this sector/horizon, with common pre-meeting inputs. |
| eligible_missing_or_excluded_English_policy_events | see_definition | Original-English policy denominator less eligible events for this sector/horizon. |
| common_comparison_events | see_definition | Independent events eligible in both sectors and all horizons, used for like-for-like comparison. |

## event_sector_modeling

| Field | Unit | Definition |
| --- | --- | --- |
| event_date | ISO_date_no_clock | Retained original-identity-corrected MPC meeting/decision date. Not a verified first-publication or rate-effective date. |
| doc_id | see_definition | Stable inherited statement identifier. Its embedded historical date is not authoritative; use event_date. |
| source_url | see_definition | Inherited CBE original-source URL; original_pdf_url contains the full retained PDF identity from the timing register. |
| statement_text | see_definition | Complete retained working transcription, unchanged from the pinned corpus. Original identity/date checks do not certify every OCR/body or historical version. |
| sentence_count | see_definition | Inherited sentence count from historical corpus assembly; not freshly retokenized in this build. |
| word_count | see_definition | Inherited whitespace-token count of the retained working text. |
| statement_text_sha256 | SHA-256_hex | SHA-256 of exact UTF-8 statement_text string, excluding any file-added newline. |
| source_corpus | see_definition | Inherited text-source category; policy candidates use official originals. Administrative records remain excluded. |
| source_revision | see_definition | Inherited acquisition/revision provenance label, not first publication time. |
| original_pdf_verified | see_definition | Inherited original identity/date check only; does not certify the entire text, clock, translation or vintage. |
| release_time_verified | see_definition | Inherited verification flag. Exact original first-release clocks remain unverified. |
| known_date_text_mismatch | see_definition | Inherited text/date anomaly indicator retained for audit; not a new source-body certification. |
| within_current_sector_date_range | see_definition | Historical pilot metadata, retained unchanged. Not used as a current Refinitiv coverage or model eligibility selector. |
| source_capture_file | see_definition | Pinned original extraction or reviewed derivative path used by the retained working corpus. |
| capture_completeness | see_definition | Inherited extraction/body preservation description; not an independent fresh semantic review. |
| administrative_notice | see_definition | Inherited indicator distinguishing retained administrative records from policy candidates. |
| record_status | see_definition | policy_statement_candidate (174) or administrative_notice_exclude (2); full inventory preserved. |
| policy_action | see_definition | Inherited observed decision classification: hold, hike, cut, unresolved or administrative. Not a monetary-policy surprise. |
| reported_rate_change_bps | basis_points_signed | Signed observed decision: hike positive, cut negative, hold zero. One percentage point equals 100 basis points. |
| deposit_rate_pct | annual_percent | Inherited after-decision overnight deposit rate, annual percent; missing inherited cells are preserved here. |
| action_parse_status | see_definition | Inherited extraction/review depth; rule_extracted_needs_review does not imply universal human validation. |
| normalized_text_sha256 | SHA-256_hex | Inherited hash of normalized text for duplicate/identity comparison; exact modeling text is statement_text. |
| forecast_release_cutoff_verified | see_definition | False: no original full-statement clock verifies availability before this conceptual cutoff. |
| data_rights_cleared | see_definition | Inherited false/unresolved rights flag. An export is not redistribution permission. |
| date_correction_from | see_definition | Preserved earlier secondary date where original-header review corrected event_date; doc_id remains stable. |
| original_pdf_file | see_definition | Workspace-relative original CBE PDF path, with immutable bytes retained. |
| original_pdf_sha256 | SHA-256_hex | SHA-256 of retained original PDF bytes, verified against actual files. |
| text_transcription_review | see_definition | Inherited per-document OCR/body review depth. Earlier receipts are reused, not relabelled fresh review. |
| source_language | see_definition | Official_English or Official_Arabic for policy originals; secondary administrative transcriptions remain excluded. |
| source_capture_sha256 | SHA-256_hex | SHA-256 of source_capture_file bytes, including any file newline; distinct from statement_text string hash. |
| original_pdf_url | see_definition | Full retained CBE original PDF URL from the pinned timing inventory. |
| original_html_url | see_definition | Retained original CBE HTML page URL where known; not evidence of its first publication clock. |
| exact_original_release_status | see_definition | unverified for all 174 policy candidates; administrative records may use a separate excluded status. |
| original_release_date_verified | see_definition | Verified original release date if independently established; blank remains unknown and is not filled with meeting date. |
| original_clock_raw | see_definition | Verbatim verified original clock where known; blank because no exact original clock was established. |
| original_clock_timezone | see_definition | Verified original-clock timezone, blank when unknown; never inferred from a filename. |
| original_clock_precision | see_definition | Resolution of verified original-clock evidence; blank when unknown. |
| first_original_release_utc | source_datetime_or_blank_unverified | Verified first-original full-statement release datetime in UTC; blank/unverified in this inventory. |
| first_original_release_cairo | source_datetime_or_blank_unverified | Verified first-original release datetime in Cairo; blank/unverified in this inventory. |
| full_statement_timing_evidence_status | see_definition | Original/copy/full-body timing evidence classification. Copy clocks are not promoted to original clocks. |
| source_reported_copy_published_raw | see_definition | Retained matching-copy publication time (verbatim source label); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_updated_raw | see_definition | Retained matching-copy update/current-version time (verbatim source label); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_published_utc | source_datetime_or_blank_unverified | Retained matching-copy publication time (UTC); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_published_cairo | source_datetime_or_blank_unverified | Retained matching-copy publication time (Cairo); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_current_version_by_utc | source_datetime_or_blank_unverified | Retained matching-copy update/current-version time (UTC); not first CBE publication or independently captured historical full-text availability. |
| source_reported_copy_current_version_by_cairo | source_datetime_or_blank_unverified | Retained matching-copy update/current-version time (Cairo); not first CBE publication or independently captured historical full-text availability. |
| independent_historical_full_text_capture_by_utc | source_datetime_or_blank_unverified | Accepted independent historical full-text availability bound if found; blank remains unresolved. |
| copy_source_url | see_definition | Public reproduction URL whose clock/body evidence is retained; not the CBE first release. |
| copy_source_file | see_definition | Local raw copy-evidence file from earlier timing work, often a retained feed snapshot. |
| copy_source_sha256 | SHA-256_hex | SHA-256 of retained copy-evidence bytes; distinct from original or transcription hashes. |
| existing_target_ordering_diagnostic_unchanged | see_definition | Inherited timing diagnostic; it does not certify first-session real-time availability. |
| rate_effective_date | ISO_date_no_clock | Blank: not systematically extracted/verified; distinct from event_date, release date and eligible session dates. |
| rate_effective_date_status | see_definition | Explicit not-extracted/not-verified status; no automatic Sunday or meeting-date substitution. |
| deposit_after_proposed_pct | annual_percent | After-decision rate using seven already audited missing-value corrections in this version; original inherited field is unchanged. |
| deposit_before_source_supported_or_implied_pct | annual_percent | Earlier checked or same-statement arithmetically implied before-rate. Consult rate_check_status/evidence; not universally independently verified. |
| rate_check_status | see_definition | Inherited source-check versus parse/implied distinction for rate fields. |
| rate_evidence | see_definition | Retained explanation of original page/paragraph review or same-statement arithmetic implication. |
| pre_return_start_date | ISO_date_no_clock | Earlier of the last two eligible observed sessions strictly before meeting date; common to sector and EGX30 lag. |
| pre_return_end_date | ISO_date_no_clock | Later of the last two sessions strictly before meeting date; no first-session realized information. |
| preceding_session_date | ISO_date_no_clock | Last eligible observed close on or before meeting date, preceding the first post-date target session. |
| first_session_date | ISO_date_no_clock | First common eligible observed session strictly after meeting date. This is a retrospective alignment rule, not verified availability. |
| sector | see_definition | Prediction sector: banks or real_estate. Two rows share one independent announcement. |
| ric | see_definition | Retained instrument identity: .EGBANK, .EGREAL or .EGX30. |
| meeting_weekday | see_definition | Civil weekday of event_date, computed arithmetically. |
| irregular_meeting_weekday | see_definition | True for non-Thursday meeting dates; not proof of release timing or unexpected policy. |
| meeting_date_has_observed_session | see_definition | Meeting date occurs on the common eligible observed RIC union. |
| sector_definition | see_definition | Legacy through 31 December 2019 versus modern live from 2 January 2020; EGX30 has separate construction. No modern 2019 backcast is synthesized. |
| legacy_regime | see_definition | One for legacy sector context, zero for modern live context; a construction indicator, not a measured capital constraint. |
| forecast_cutoff_date | ISO_date_no_clock | First eligible session date; the conceptual forecast origin is before its open. |
| forecast_cutoff_datetime | see_definition | Blank: no fabricated historical open or publication timestamp. |
| forecast_cutoff_rule | see_definition | Conceptual before-first-open rule with unverified historical clock; use same information set for each horizon. |
| real_time_eligible | see_definition | Always false; computational retrospective readiness is not real-time source certification. |
| analysis_timing_label | see_definition | Explicit retrospective meeting-date alignment with unverified full-statement availability. |
| source_price_provider | see_definition | All target/input price values come solely from matching Refinitiv exports. |
| return_unit | see_definition | Returns are numeric percentage points: 1.0 means a 1 percent price change. |
| policy_unit | see_definition | Signed observed basis points; not percentage points or a surprise measure. |
| pre_return_start_sector_close | index_points_EGP_basis | Unfilled raw sector Close at pre_return_start_date; index points, EGP basis, matching sector RIC only. |
| pre_return_start_sector_source_cell | see_definition | Original raw XLSX Table Data B-cell address for the corresponding close/date; blank means absent, never imputed. |
| pre_return_end_sector_close | index_points_EGP_basis | Unfilled raw sector Close at pre_return_end_date; index points, EGP basis, matching sector RIC only. |
| pre_return_end_sector_source_cell | see_definition | Original raw XLSX Table Data B-cell address for the corresponding close/date; blank means absent, never imputed. |
| preceding_session_sector_close | index_points_EGP_basis | Unfilled raw sector Close at preceding_session_date; index points, EGP basis, matching sector RIC only. |
| preceding_session_sector_source_cell | see_definition | Original raw XLSX Table Data B-cell address for the corresponding close/date; blank means absent, never imputed. |
| first_session_sector_close | index_points_EGP_basis | Unfilled raw sector Close at first_session_date; index points, EGP basis, matching sector RIC only. |
| first_session_sector_source_cell | see_definition | Original raw XLSX Table Data B-cell address for the corresponding close/date; blank means absent, never imputed. |
| pre_return_start_egx30_close | index_points_EGP_basis | Unfilled raw .EGX30 Close at pre_return_start_date; index points, EGP basis. |
| pre_return_start_egx30_source_cell | see_definition | Original raw XLSX Table Data B-cell address for the corresponding close/date; blank means absent, never imputed. |
| pre_return_end_egx30_close | index_points_EGP_basis | Unfilled raw .EGX30 Close at pre_return_end_date; index points, EGP basis. |
| pre_return_end_egx30_source_cell | see_definition | Original raw XLSX Table Data B-cell address for the corresponding close/date; blank means absent, never imputed. |
| sector_source_file | see_definition | Matching Refinitiv raw XLSX path for this instrument; original bytes are pinned and never replaced by another provider. |
| sector_source_sha256 | SHA-256_hex | SHA-256 of the exact named raw Refinitiv export containing this instrument's input/target cells. |
| egx30_source_file | see_definition | Matching Refinitiv raw XLSX path for this instrument; original bytes are pinned and never replaced by another provider. |
| egx30_source_sha256 | SHA-256_hex | SHA-256 of the exact named raw Refinitiv export containing this instrument's input/target cells. |
| pre_event_sector_return_pct | percentage_points | Sector return over pre_return_start_date to pre_return_end_date, 100*(end/start-1). Fixed before the first target session. |
| pre_event_egx30_return_pct | percentage_points | EGX30 return over the same strictly pre-meeting input dates. No realized target-window market return is used. |
| pre_sector_return_status | see_definition | Availability, missing-source or definition-boundary reason for sector lagged return. |
| pre_egx30_return_status | see_definition | Availability or missing-source reason for broad-market lagged return. |
| numerical_inputs_complete | see_definition | Both lagged returns and signed action exist; source semantic/timing certification remains separate. |
| first_session_return_pct | percentage_points | 100*(first_session_sector_close/preceding_session_sector_close-1). Usually Thursday–Sunday; actual session dates control. |
| target_status_first_session | see_definition | Arithmetic availability or missingness/definition exclusion status for first_session. |
| eligible_first_session | see_definition | True when original-English policy, observed signed action, complete common lagged inputs, available target, definition-consistent context, at most seven-day initial close gap and unshared reopening window pass for first_session. Retrospective eligibility only. |
| exclusion_reason_first_session | see_definition | Pipe-separated modeling exclusion reasons for first_session; empty only when computationally eligible. |
| target_available_first_session | see_definition | Raw target ratio for first_session has both positive observed closes in a single sector definition; this alone is not modeling/timing eligibility. |
| first_session_gap_calendar_days | calendar_days | Calendar-day gap from preceding close to first-session close; preserves weekend/holiday/missing-calendar uncertainty. |
| status | see_definition | Versioned static input status; does not imply successful fitting, verified real-time release or thesis submission. |
| event_window_shared_policy_count | see_definition | Number of original-English policy decisions sharing identical preceding and first-session dates. Counts above one exclude the events to avoid duplicating a reopening shock. |
| prolonged_first_session_gap | see_definition | Preceding-to-first-close gap exceeds the inherited seven-calendar-day maximum; ratios remain visible but event is excluded from modeling. |
| in_common_event_cohort | see_definition | Both sectors have eligible first-session returns and complete common inputs and pass original-English/policy/definition rules. Group by doc_id for splitting/counting. |

