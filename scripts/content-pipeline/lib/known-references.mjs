/**
 * known-references.mjs
 *
 * Shared reference data for QA/verification agents.
 * Contains valid CFR sections, CAVC cases, VA forms, acronyms,
 * and prohibited language patterns.
 */

// ---------------------------------------------------------------------------
// 38 CFR Part 3 - Adjudication (commonly cited sections)
// ---------------------------------------------------------------------------
export const VALID_CFR_PART3 = new Set([
  '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10',
  '3.12', '3.13', '3.14', '3.15', '3.20', '3.21', '3.22', '3.23', '3.24',
  '3.25', '3.26', '3.27', '3.29', '3.30', '3.31', '3.50', '3.51', '3.52',
  '3.53', '3.54', '3.55', '3.57', '3.100', '3.101', '3.102', '3.103',
  '3.104', '3.105', '3.109', '3.110', '3.111', '3.112', '3.113', '3.114',
  '3.150', '3.151', '3.152', '3.153', '3.154', '3.155', '3.156', '3.157',
  '3.158', '3.159', '3.160', '3.161',
  '3.200', '3.201', '3.202', '3.203', '3.204', '3.205', '3.206', '3.207',
  '3.209', '3.210', '3.211', '3.212', '3.213',
  '3.250', '3.251', '3.252', '3.253', '3.254', '3.255', '3.256', '3.257',
  '3.260', '3.261', '3.262', '3.263',
  '3.300', '3.301', '3.302', '3.303', '3.304', '3.305', '3.306', '3.307',
  '3.308', '3.309', '3.310', '3.311', '3.312', '3.313', '3.314', '3.315',
  '3.316', '3.317', '3.318', '3.320', '3.321', '3.322', '3.323', '3.324',
  '3.325', '3.326', '3.327', '3.328', '3.329', '3.330',
  '3.340', '3.341', '3.342', '3.343', '3.344',
  '3.350', '3.351', '3.352', '3.353', '3.354', '3.355', '3.356',
  '3.360', '3.361', '3.362', '3.363',
  '3.370', '3.371', '3.372', '3.373', '3.374', '3.375', '3.376', '3.377',
  '3.378', '3.379', '3.380', '3.381', '3.382', '3.383', '3.384', '3.385',
  '3.400', '3.401', '3.402', '3.403', '3.404', '3.405',
  '3.450', '3.451', '3.452', '3.453', '3.454', '3.455', '3.456', '3.457',
  '3.458', '3.459', '3.460', '3.461',
  '3.500', '3.501', '3.502', '3.503',
  '3.550', '3.551', '3.552', '3.553',
  '3.600', '3.601', '3.602', '3.603',
  '3.650', '3.651', '3.652', '3.653', '3.654', '3.655', '3.656', '3.657',
  '3.660', '3.661',
  '3.700', '3.701', '3.702', '3.703', '3.704', '3.705', '3.706', '3.707',
  '3.708', '3.709', '3.710',
  '3.750', '3.751', '3.752',
  '3.800', '3.801', '3.802', '3.803', '3.804', '3.805', '3.806', '3.807',
  '3.808', '3.809', '3.810', '3.811', '3.812', '3.813', '3.814', '3.815',
  '3.816',
  '3.850', '3.851',
  '3.900', '3.901', '3.902', '3.903', '3.904', '3.905',
  '3.950', '3.951', '3.952', '3.953', '3.954', '3.955', '3.956', '3.957',
  '3.958', '3.959',
  '3.1000', '3.1001', '3.1002', '3.1003', '3.1010',
  '3.1100', '3.1101', '3.1102', '3.1103', '3.1104', '3.1105',
]);

// ---------------------------------------------------------------------------
// 38 CFR Part 4 - Schedule for Rating Disabilities
// ---------------------------------------------------------------------------
export const VALID_CFR_PART4 = new Set([
  '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10',
  '4.12', '4.13', '4.14', '4.15', '4.16', '4.17', '4.18', '4.19', '4.20',
  '4.21', '4.22', '4.23', '4.24', '4.25', '4.26', '4.27', '4.28', '4.29',
  '4.30', '4.31',
  '4.40', '4.41', '4.42', '4.43', '4.44', '4.45', '4.46',
  '4.55', '4.56', '4.57', '4.58', '4.59',
  '4.68', '4.69', '4.70', '4.71', '4.71a',
  '4.73', '4.76', '4.76a', '4.77', '4.78', '4.79',
  '4.84', '4.84a', '4.85', '4.86', '4.87', '4.87a', '4.88', '4.88a',
  '4.88b',
  '4.96', '4.97',
  '4.100', '4.101', '4.104',
  '4.110', '4.111', '4.112', '4.113', '4.114',
  '4.115', '4.115a', '4.115b', '4.116', '4.117', '4.118', '4.119', '4.120',
  '4.121', '4.122', '4.123', '4.124', '4.124a', '4.125', '4.126', '4.127',
  '4.128', '4.129', '4.130', '4.132',
  '4.150',
]);

// ---------------------------------------------------------------------------
// Other commonly cited 38 CFR Parts
// ---------------------------------------------------------------------------
export const VALID_CFR_OTHER_PARTS = new Set([
  '17.32', '17.33', '17.34', '17.36', '17.38', '17.120', '17.161',
  '19.5', '19.9', '19.26', '19.37', '19.52',
  '20.200', '20.201', '20.202', '20.203', '20.204', '20.205', '20.300',
  '20.301', '20.302', '20.303', '20.304', '20.305', '20.306',
  '20.700', '20.713', '20.717', '20.800', '20.900', '20.901', '20.902',
  '20.903', '20.904',
  '20.1000', '20.1001', '20.1002', '20.1003', '20.1004',
  '20.1100', '20.1104', '20.1105', '20.1106',
  '20.1304', '20.1305',
  '21.1', '21.21', '21.35', '21.40', '21.41', '21.42', '21.43',
  '21.50', '21.51', '21.52', '21.53',
  '14.626', '14.627', '14.628', '14.629', '14.630', '14.631', '14.632',
  '14.636',
]);

// Combine all valid CFR sections for quick lookup
export const ALL_VALID_CFR = new Set([
  ...VALID_CFR_PART3,
  ...VALID_CFR_PART4,
  ...VALID_CFR_OTHER_PARTS,
]);

// ---------------------------------------------------------------------------
// Known CAVC case citations
// ---------------------------------------------------------------------------
export const KNOWN_CAVC_CASES = [
  { name: 'Gilbert v. Derwinski', citation: '1 Vet. App. 49 (1990)', topic: 'benefit of the doubt' },
  { name: 'Caluza v. Brown', citation: '7 Vet. App. 498 (1995)', topic: 'elements of service connection' },
  { name: 'Shedden v. Principi', citation: '381 F.3d 1163 (Fed. Cir. 2004)', topic: 'elements of service connection' },
  { name: 'Hickson v. West', citation: '12 Vet. App. 247 (1999)', topic: 'elements of service connection' },
  { name: 'McLendon v. Nicholson', citation: '20 Vet. App. 79 (2006)', topic: 'duty to assist - VA examination' },
  { name: 'Barr v. Nicholson', citation: '21 Vet. App. 303 (2007)', topic: 'adequacy of VA examination' },
  { name: 'Nieves-Rodriguez v. Peake', citation: '22 Vet. App. 295 (2008)', topic: 'medical opinion adequacy' },
  { name: 'Jandreau v. Nicholson', citation: '492 F.3d 1372 (Fed. Cir. 2007)', topic: 'lay evidence competency' },
  { name: 'Buchanan v. Nicholson', citation: '451 F.3d 1331 (Fed. Cir. 2006)', topic: 'lay evidence credibility' },
  { name: 'Layno v. Brown', citation: '6 Vet. App. 465 (1994)', topic: 'lay testimony competency' },
  { name: 'Davidson v. Shinseki', citation: '581 F.3d 1313 (Fed. Cir. 2009)', topic: 'nexus evidence' },
  { name: 'Combee v. Brown', citation: '34 F.3d 1039 (Fed. Cir. 1994)', topic: 'direct service connection alternative' },
  { name: 'Allen v. Brown', citation: '7 Vet. App. 439 (1995)', topic: 'secondary service connection aggravation' },
  { name: 'El-Amin v. Shinseki', citation: '26 Vet. App. 136 (2013)', topic: 'secondary service connection aggravation' },
  { name: 'Mittleider v. West', citation: '11 Vet. App. 181 (1998)', topic: 'separating service-connected symptoms' },
  { name: 'Clemons v. Shinseki', citation: '23 Vet. App. 1 (2009)', topic: 'scope of claim - mental health' },
  { name: 'Rice v. Shinseki', citation: '22 Vet. App. 447 (2009)', topic: 'TDIU as part of increased rating' },
  { name: 'Esteban v. Brown', citation: '6 Vet. App. 259 (1994)', topic: 'separate ratings for distinct symptoms' },
  { name: 'Amberman v. Shinseki', citation: '570 F.3d 1377 (Fed. Cir. 2009)', topic: 'pyramiding prohibition' },
  { name: 'Fenderson v. West', citation: '12 Vet. App. 119 (1999)', topic: 'staged ratings' },
  { name: 'Hart v. Mansfield', citation: '21 Vet. App. 505 (2007)', topic: 'staged ratings for increased claims' },
  { name: 'Vazquez-Flores v. Peake', citation: '22 Vet. App. 37 (2008)', topic: 'VCAA notice for increased rating' },
  { name: 'Dingess v. Nicholson', citation: '19 Vet. App. 473 (2006)', topic: 'VCAA notice requirements' },
  { name: 'Kent v. Nicholson', citation: '20 Vet. App. 1 (2006)', topic: 'new and material evidence notice' },
  { name: 'Shade v. Shinseki', citation: '24 Vet. App. 110 (2010)', topic: 'new and material evidence standard' },
  { name: 'Stegall v. West', citation: '11 Vet. App. 268 (1998)', topic: 'remand compliance' },
  { name: 'D\'Aries v. Peake', citation: '22 Vet. App. 97 (2008)', topic: 'substantial compliance with remand' },
  { name: 'Bryant v. Shinseki', citation: '23 Vet. App. 488 (2010)', topic: 'hearing officer duties' },
  { name: 'Thun v. Peake', citation: '22 Vet. App. 111 (2008)', topic: 'extraschedular ratings' },
  { name: 'Johnson v. McDonald', citation: '762 F.3d 1362 (Fed. Cir. 2014)', topic: 'collective impact extraschedular' },
  { name: 'Yancy v. McDonald', citation: '27 Vet. App. 484 (2016)', topic: 'extraschedular TDIU' },
  { name: 'Walker v. Shinseki', citation: '708 F.3d 1331 (Fed. Cir. 2013)', topic: 'continuity of symptomatology' },
  { name: 'Savage v. Gober', citation: '10 Vet. App. 488 (1997)', topic: 'continuity of symptomatology' },
  { name: 'Maxson v. Gober', citation: '230 F.3d 1330 (Fed. Cir. 2000)', topic: 'lengthy gap in treatment' },
  { name: 'Wagner v. Principi', citation: '370 F.3d 1089 (Fed. Cir. 2004)', topic: 'presumption of soundness' },
  { name: 'Horn v. Shinseki', citation: '25 Vet. App. 231 (2012)', topic: 'presumption of soundness' },
  { name: 'Cotant v. Principi', citation: '17 Vet. App. 116 (2003)', topic: 'presumption of soundness' },
  { name: 'Kahana v. Shinseki', citation: '24 Vet. App. 428 (2011)', topic: 'absence of records' },
  { name: 'Washington v. Nicholson', citation: '19 Vet. App. 362 (2005)', topic: 'credibility assessment' },
  { name: 'Dela Cruz v. Principi', citation: '15 Vet. App. 143 (2001)', topic: 'benefit of the doubt' },
  { name: 'Alemany v. Brown', citation: '9 Vet. App. 518 (1996)', topic: 'benefit of the doubt' },
  { name: 'Roberson v. Principi', citation: '251 F.3d 1378 (Fed. Cir. 2001)', topic: 'sympathetic reading of claims' },
  { name: 'Szemraj v. Principi', citation: '357 F.3d 1370 (Fed. Cir. 2004)', topic: 'sympathetic reading of claims' },
  { name: 'Andrews v. Nicholson', citation: '421 F.3d 1278 (Fed. Cir. 2005)', topic: 'effective date' },
  { name: 'McGrath v. Gober', citation: '14 Vet. App. 28 (2000)', topic: 'effective date' },
  { name: 'Rudd v. Nicholson', citation: '20 Vet. App. 296 (2006)', topic: 'freestanding earlier effective date claim' },
  { name: 'Flash v. Brown', citation: '8 Vet. App. 332 (1995)', topic: 'effective date for dependency' },
];

// ---------------------------------------------------------------------------
// VA Form Numbers
// ---------------------------------------------------------------------------
export const VA_FORMS = new Map([
  ['VA Form 21-526EZ', 'Application for Disability Compensation and Related Compensation Benefits'],
  ['VA Form 21-526', 'Application for Disability Compensation and Related Compensation Benefits (legacy)'],
  ['VA Form 21-0966', 'Intent to File a Claim for Compensation and/or Pension'],
  ['VA Form 21-4138', 'Statement in Support of Claim'],
  ['VA Form 21-4142', 'Authorization to Disclose Information (medical records release)'],
  ['VA Form 21-4142a', 'General Release for Medical Provider Information'],
  ['VA Form 21-0781', 'Statement in Support of Claim for PTSD'],
  ['VA Form 21-0781a', 'Statement in Support of Claim for PTSD Secondary to Personal Assault'],
  ['VA Form 21-8940', 'Application for Increased Compensation Based on Unemployability (TDIU)'],
  ['VA Form 21-2680', 'Examination for Housebound Status or Permanent Need for Regular Aid and Attendance'],
  ['VA Form 21-534EZ', 'Application for DIC, Death Pension, and/or Accrued Benefits'],
  ['VA Form 21-534', 'Application for Dependency and Indemnity Compensation (legacy)'],
  ['VA Form 21-686c', 'Declaration of Status of Dependents'],
  ['VA Form 21-674', 'Request for Approval of School Attendance'],
  ['VA Form 21-22', 'Appointment of Veterans Service Organization as Claimant\'s Representative'],
  ['VA Form 21-22a', 'Appointment of Individual as Claimant\'s Representative'],
  ['VA Form 20-0995', 'Decision Review Request: Supplemental Claim'],
  ['VA Form 20-0996', 'Decision Review Request: Higher-Level Review'],
  ['VA Form 10182', 'Decision Review Request: Board Appeal (Notice of Disagreement)'],
  ['VA Form 10-10EZ', 'Application for Health Benefits'],
  ['VA Form 10-10EZR', 'Health Benefits Renewal Form'],
  ['VA Form 28-1900', 'Disabled Veterans Application for Vocational Rehabilitation'],
  ['VA Form 22-1990', 'Application for VA Education Benefits'],
  ['VA Form 26-1880', 'Request for Certificate of Eligibility (Home Loan)'],
  ['VA Form 21P-534EZ', 'Application for DIC, Death Pension, and/or Accrued Benefits'],
  ['VA Form 21P-530', 'Application for Burial Benefits'],
  ['VA Form 21P-8416', 'Medical Expense Report'],
  ['VA Form 21-0845', 'Authorization to Disclose Personal Information to a Third Party'],
  ['VA Form 21-0958', 'Notice of Disagreement (legacy)'],
  ['VA Form 9', 'Appeal to Board of Veterans\' Appeals (legacy)'],
  ['VA Form 21-4192', 'Request for Employment Information in Connection with Claim for Disability Benefits'],
  ['VA Form 21-8951-2', 'Notice of Waiver of VA Compensation or Pension to Receive Military Pay and Allowances'],
  ['VA Form 10-5345', 'Request for and Authorization to Release Health Information'],
  ['VA Form 10-0137', 'VA Advance Directive'],
  ['VA Form 21-0779', 'Request for Nursing Home Information in Connection with Claim for Aid and Attendance'],
  ['VA Form 21-526B', 'Veteran\'s Supplemental Claim for Compensation (legacy)'],
]);

// ---------------------------------------------------------------------------
// Common VA Acronyms
// ---------------------------------------------------------------------------
export const VA_ACRONYMS = new Map([
  ['VA', 'Department of Veterans Affairs'],
  ['VBA', 'Veterans Benefits Administration'],
  ['VHA', 'Veterans Health Administration'],
  ['BVA', 'Board of Veterans\' Appeals'],
  ['CAVC', 'Court of Appeals for Veterans Claims'],
  ['VARO', 'VA Regional Office'],
  ['RO', 'Regional Office'],
  ['DRO', 'Decision Review Officer'],
  ['VSO', 'Veterans Service Organization'],
  ['SMC', 'Special Monthly Compensation'],
  ['TDIU', 'Total Disability based on Individual Unemployability'],
  ['IU', 'Individual Unemployability'],
  ['PTSD', 'Post-Traumatic Stress Disorder'],
  ['TBI', 'Traumatic Brain Injury'],
  ['MST', 'Military Sexual Trauma'],
  ['IMO', 'Independent Medical Opinion'],
  ['IME', 'Independent Medical Examination'],
  ['DBQ', 'Disability Benefits Questionnaire'],
  ['C&P', 'Compensation and Pension (examination)'],
  ['CFR', 'Code of Federal Regulations'],
  ['USC', 'United States Code'],
  ['VCAA', 'Veterans Claims Assistance Act'],
  ['NOD', 'Notice of Disagreement'],
  ['SOC', 'Statement of the Case'],
  ['SSOC', 'Supplemental Statement of the Case'],
  ['HLR', 'Higher-Level Review'],
  ['AMA', 'Appeals Modernization Act'],
  ['CUE', 'Clear and Unmistakable Error'],
  ['DIC', 'Dependency and Indemnity Compensation'],
  ['EED', 'Earlier Effective Date'],
  ['ITF', 'Intent to File'],
  ['P&T', 'Permanent and Total'],
  ['GAF', 'Global Assessment of Functioning'],
  ['ACE', 'Acceptable Clinical Evidence'],
  ['RVSR', 'Rating Veterans Service Representative'],
  ['RAMP', 'Rapid Appeals Modernization Program'],
  ['FDC', 'Fully Developed Claim'],
  ['SME', 'Subject Matter Expert'],
  ['38 CFR', 'Title 38 Code of Federal Regulations'],
  ['38 USC', 'Title 38 United States Code'],
]);

// ---------------------------------------------------------------------------
// Prohibited Phrases - Legal Advice
// ---------------------------------------------------------------------------
export const PROHIBITED_LEGAL_PHRASES = [
  // Direct legal advice
  { pattern: /\byou\s+should\s+(sue|file\s+a\s+lawsuit|litigate|bring\s+legal\s+action)/gi, category: 'legal_advice', severity: 'BLOCK', suggestion: 'Consider consulting with a veterans law attorney about your options.' },
  { pattern: /\byou\s+must\s+(sue|file\s+a\s+lawsuit|appeal|hire\s+a\s+lawyer)/gi, category: 'legal_advice', severity: 'BLOCK', suggestion: 'Veterans may want to consider consulting with a qualified attorney.' },
  { pattern: /\byou\s+need\s+to\s+(sue|file\s+a\s+lawsuit|get\s+a\s+lawyer)/gi, category: 'legal_advice', severity: 'BLOCK', suggestion: 'Veterans may benefit from consulting with an accredited representative.' },
  { pattern: /\byou\s+are\s+entitled\s+to/gi, category: 'legal_advice', severity: 'WARNING', suggestion: 'Use "veterans may be eligible for" instead of making entitlement declarations.' },
  { pattern: /\byou\s+have\s+a\s+(right|legal\s+right)\s+to/gi, category: 'legal_advice', severity: 'WARNING', suggestion: 'Use "the law provides for" or "regulations state that" instead.' },
  { pattern: /\byour\s+claim\s+(will|is\s+going\s+to)\s+(be\s+approved|win|succeed)/gi, category: 'outcome_guarantee', severity: 'BLOCK', suggestion: 'Never guarantee claim outcomes. Use "may" or "could" language.' },
  { pattern: /\bi\s+(advise|recommend|counsel)\s+you\s+to/gi, category: 'legal_advice', severity: 'BLOCK', suggestion: 'Avoid first-person advisory language. Provide information, not advice.' },
  { pattern: /\bas\s+your\s+(attorney|lawyer|legal\s+counsel)/gi, category: 'UPL', severity: 'BLOCK', suggestion: 'Never imply attorney-client or legal representative relationship.' },
  { pattern: /\blegal\s+advice/gi, category: 'legal_advice', severity: 'WARNING', suggestion: 'Clarify that information provided is educational, not legal advice.' },
  { pattern: /\bin\s+my\s+(legal|professional)\s+opinion/gi, category: 'UPL', severity: 'BLOCK', suggestion: 'Do not offer professional legal or medical opinions.' },
  { pattern: /\byou\s+will\s+(definitely|certainly|absolutely)\s+(win|get\s+approved|receive)/gi, category: 'outcome_guarantee', severity: 'BLOCK', suggestion: 'Never guarantee outcomes.' },
  { pattern: /\bguarantee[ds]?\s+(approval|success|winning|a\s+favorable)/gi, category: 'outcome_guarantee', severity: 'BLOCK', suggestion: 'Never guarantee outcomes. Each case is evaluated individually.' },
  { pattern: /\b(this\s+is|consider\s+this)\s+(legal|medical)\s+advice/gi, category: 'UPL', severity: 'BLOCK', suggestion: 'Never present content as legal or medical advice.' },
  { pattern: /\byou\s+should\s+(not\s+)?file/gi, category: 'legal_advice', severity: 'WARNING', suggestion: 'Use "veterans may consider" rather than directive language.' },
  { pattern: /\bwe\s+(represent|are\s+representing)\s+you/gi, category: 'UPL', severity: 'BLOCK', suggestion: 'Never imply representation.' },
  { pattern: /\bretain\s+(us|our\s+services)/gi, category: 'UPL', severity: 'BLOCK', suggestion: 'Never solicit retention as legal representatives.' },
];

// ---------------------------------------------------------------------------
// Prohibited Phrases - Medical Advice
// ---------------------------------------------------------------------------
export const PROHIBITED_MEDICAL_PHRASES = [
  { pattern: /\byou\s+(have|suffer\s+from|are\s+diagnosed\s+with)\s+(PTSD|depression|anxiety|TBI|a\s+disability)/gi, category: 'medical_diagnosis', severity: 'BLOCK', suggestion: 'Only qualified medical professionals can diagnose conditions. Use "if you have been diagnosed with" or "veterans experiencing symptoms of".' },
  { pattern: /\btake\s+(this|these|the\s+following)\s+(medication|medicine|drug|prescription)/gi, category: 'medical_advice', severity: 'BLOCK', suggestion: 'Never recommend specific medications. Suggest consulting a healthcare provider.' },
  { pattern: /\byou\s+should\s+(see|visit|go\s+to)\s+(a\s+doctor|the\s+hospital|a\s+psychiatrist)/gi, category: 'medical_advice', severity: 'WARNING', suggestion: 'Use "veterans may benefit from consulting with a healthcare provider" instead.' },
  { pattern: /\byour\s+(condition|disability|illness)\s+(is|will\s+be)\s+(permanent|temporary|curable)/gi, category: 'medical_prognosis', severity: 'BLOCK', suggestion: 'Do not make medical prognoses. Only qualified medical professionals can make such determinations.' },
  { pattern: /\byou\s+(don't|do\s+not)\s+need\s+(medical|professional)\s+(help|treatment|attention)/gi, category: 'medical_advice', severity: 'BLOCK', suggestion: 'Never discourage seeking medical care.' },
  { pattern: /\bstop\s+taking\s+(your\s+)?(medication|medicine|prescription)/gi, category: 'medical_advice', severity: 'BLOCK', suggestion: 'Never advise stopping medication. Always defer to treating physicians.' },
  { pattern: /\bthis\s+(treatment|therapy|remedy)\s+(will\s+)?cure/gi, category: 'medical_advice', severity: 'BLOCK', suggestion: 'Never promise cures. Use factual language about treatment options.' },
];

// ---------------------------------------------------------------------------
// Prohibited Phrases - Outcome Guarantees
// ---------------------------------------------------------------------------
export const PROHIBITED_GUARANTEE_PHRASES = [
  { pattern: /\b100\s*%\s*(chance|guaranteed|certain|sure)/gi, category: 'outcome_guarantee', severity: 'BLOCK', suggestion: 'Never state certainty of outcomes.' },
  { pattern: /\b(guaranteed|certain|assured)\s+(approval|rating|grant|increase)/gi, category: 'outcome_guarantee', severity: 'BLOCK', suggestion: 'Claim outcomes are never guaranteed.' },
  { pattern: /\b(always|never)\s+(get|receive|win|lose)\s+(a\s+)?(claim|appeal|rating)/gi, category: 'outcome_guarantee', severity: 'WARNING', suggestion: 'Avoid absolute language about claim outcomes.' },
  { pattern: /\byou\s+will\s+(get|receive|be\s+granted|win)/gi, category: 'outcome_guarantee', severity: 'WARNING', suggestion: 'Use "may" or "could" instead of "will" for claim outcomes.' },
  { pattern: /\bcan('t|\s+not)\s+(lose|fail|be\s+denied)/gi, category: 'outcome_guarantee', severity: 'BLOCK', suggestion: 'Never imply immunity from denial. Any claim can be denied.' },
  { pattern: /\bsurefire\s+(way|method|strategy)/gi, category: 'outcome_guarantee', severity: 'WARNING', suggestion: 'No strategy guarantees a specific outcome.' },
  { pattern: /\bsecret\s+(trick|method|strategy|way)\s+to\s+(win|get\s+approved)/gi, category: 'outcome_guarantee', severity: 'WARNING', suggestion: 'Avoid sensationalist language about claim strategies.' },
];

// ---------------------------------------------------------------------------
// PII Patterns
// ---------------------------------------------------------------------------
export const PII_PATTERNS = [
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, category: 'SSN', severity: 'BLOCK', suggestion: 'Remove Social Security Number immediately.' },
  { pattern: /\b\d{8,10}[CV]?\b/g, category: 'VA_FILE_NUMBER', severity: 'WARNING', suggestion: 'Potential VA file number detected. Verify this is not real PII.' },
  { pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\s+v\.\s+(?:Secretary|Shinseki|McDonald|Wilkie|McDonough|Derwinski|Brown|Principi|Nicholson|Peake|West|Gober|Mansfield)\b/g, category: 'VETERAN_NAME_IN_CASE', severity: 'INFO', suggestion: 'Case name contains a veteran\'s name - this is expected in case citations.' },
];

// ---------------------------------------------------------------------------
// Utility: check if a CFR section is valid
// ---------------------------------------------------------------------------
export function isValidCFR(section) {
  // Remove "38 CFR " prefix if present
  const cleaned = section.replace(/^38\s+CFR\s+§?\s*/i, '').replace(/^§\s*/, '').trim();
  return ALL_VALID_CFR.has(cleaned);
}

// ---------------------------------------------------------------------------
// Utility: find a known CAVC case by name
// ---------------------------------------------------------------------------
export function findCAVCCase(caseName) {
  const normalized = caseName.toLowerCase().trim();
  return KNOWN_CAVC_CASES.find(c =>
    c.name.toLowerCase() === normalized ||
    normalized.includes(c.name.toLowerCase().split(' v. ')[0])
  );
}

// ---------------------------------------------------------------------------
// Utility: check if a VA form number is valid
// ---------------------------------------------------------------------------
export function isValidVAForm(formRef) {
  // Normalize the form reference
  const normalized = formRef.replace(/^VA\s+Form\s+/i, 'VA Form ').trim();
  for (const [key] of VA_FORMS) {
    if (normalized.toLowerCase() === key.toLowerCase()) return true;
    // Also check without "VA Form" prefix
    const shortKey = key.replace(/^VA Form /, '');
    const shortRef = normalized.replace(/^VA Form /i, '');
    if (shortRef === shortKey) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Utility: get all prohibited patterns combined
// ---------------------------------------------------------------------------
export function getAllProhibitedPatterns() {
  return [
    ...PROHIBITED_LEGAL_PHRASES,
    ...PROHIBITED_MEDICAL_PHRASES,
    ...PROHIBITED_GUARANTEE_PHRASES,
    ...PII_PATTERNS,
  ];
}
