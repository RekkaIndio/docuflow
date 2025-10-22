export interface CqcRegulationDetail {
  code: string;
  label: string;
  title: string;
  summary: string;
  url: string;
}

export interface CqcRegulationMatch extends CqcRegulationDetail {
  snippet?: string;
}

const CQC_REGULATIONS: Record<string, CqcRegulationDetail> = {
  '4': {
    code: '4',
    label: 'Regulation 4',
    title: 'Requirements where the provider is an individual or partnership',
    summary: 'Owners and providers who are individuals or partnerships have a duty to ensure they are fit to carry out regulated activities. This includes maintaining appropriate governance and oversight, keeping records that demonstrate safe delivery of care, and ensuring systems are in place for monitoring and responding to risks. The regulation aims to make sure leadership arrangements do not compromise the safety or quality of services.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-4',
  },
  '5': {
    code: '5',
    label: 'Regulation 5',
    title: 'Fit and proper persons: directors',
    summary: 'This regulation requires that directors, partners and other senior decision-makers are fit and proper persons to hold their positions. Providers must undertake appropriate checks and due diligence (such as DBS checks, right-to-work, and considering relevant convictions or misconduct) and be able to evidence honesty, integrity and competence. The aim is to protect people using services from leaders whose conduct or background could place the service at risk.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-5',
  },
  '6': {
    code: '6',
    label: 'Regulation 6',
    title: 'Requirements where the registered manager is absent',
    summary: 'Where a registered manager is absent for an extended period, providers must ensure leadership arrangements remain effective and that someone suitable is in place to manage services. This includes notifying CQC where required, documenting temporary management arrangements, and ensuring continuity of decision-making to maintain safety and compliance with statutory duties.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-6',
  },
  '7': {
    code: '7',
    label: 'Regulation 7',
    title: 'Requirements relating to registered managers',
    summary: 'Registered managers are expected to have the necessary skills, qualifications and experience to run services in line with CQC expectations. They must ensure staff are trained and supervised, that policies are implemented effectively, and that services deliver person-centred, safe care. The regulation supports accountability and clear operational leadership at the point of care.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-7',
  },
  '8': {
    code: '8',
    label: 'Regulation 8',
    title: 'General',
    summary: 'Providers must meet the conditions attached to their CQC registration and maintain documentary evidence demonstrating compliance. They should notify CQC of relevant changes (for example, service closures, change in ownership, or significant alterations to regulated activities) and ensure governance processes are in place to identify and manage risks to people using services.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-8',
  },
  '9': {
    code: '9',
    label: 'Regulation 9',
    title: 'Person-centred care',
    summary: 'Care and treatment should be planned, coordinated and delivered in a way that reflects each person’s individual needs, preferences and goals. Providers must assess needs, involve people and where appropriate their families or advocates, create personalised care plans, and review care as needs change. The emphasis is on dignity, choice and promoting positive outcomes.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-9',
  },
  '10': {
    code: '10',
    label: 'Regulation 10',
    title: 'Dignity and respect',
    summary: 'People must be treated with dignity and respect; staff should protect privacy, support independence and ensure interactions are compassionate. This regulation covers everyday practice such as communication, assisting with personal care respectfully, and making reasonable adjustments to meet diverse needs.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-10',
  },
  '11': {
    code: '11',
    label: 'Regulation 11',
    title: 'Need for consent',
    summary: 'Providers must obtain valid consent before providing care or treatment, ensuring people have the information they need to make decisions. Where a person lacks capacity, decisions must follow the Mental Capacity Act and be made in their best interests, with appropriate records kept. Consent processes should be documented, revisited when circumstances change, and involve advocates or family where appropriate.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-11',
  },
  '12': {
    code: '12',
    label: 'Regulation 12',
    title: 'Safe care and treatment',
    summary: 'Services must provide care that minimises risks and avoids avoidable harm. This includes safe medication management, infection prevention and control, appropriate clinical oversight, and ensuring equipment is maintained and used safely. Providers should have robust risk-assessment and incident reporting systems to learn and improve safety.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-12',
  },
  '13': {
    code: '13',
    label: 'Regulation 13',
    title: 'Safeguarding service users from abuse and improper treatment',
    summary: 'Providers are responsible for protecting people from abuse and improper treatment. This involves clear safeguarding policies, staff training to recognise and report concerns, prompt investigation of allegations, and liaison with safeguarding partners. Providers should also support victims and take steps to prevent recurrence.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-13',
  },
  '14': {
    code: '14',
    label: 'Regulation 14',
    title: 'Meeting nutritional and hydration needs',
    summary: 'Providers must ensure that people’s nutritional and hydration needs are assessed and met. Care plans should reflect special dietary requirements, support with eating and drinking, and monitoring of intake where necessary. The aim is to prevent malnutrition and dehydration and support overall health and dignity.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-14',
  },
  '15': {
    code: '15',
    label: 'Regulation 15',
    title: 'Premises and equipment',
    summary: 'Premises, vehicles and equipment used to deliver care must be safe, clean and maintained to a standard that protects people’s health and safety. This includes appropriate infection control measures, accessible facilities, suitable storage and maintenance arrangements, and risk assessments for the physical environment.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-15',
  },
  '16': {
    code: '16',
    label: 'Regulation 16',
    title: 'Receiving and acting on complaints',
    summary: 'Providers must have accessible, fair and transparent complaints procedures. Complaints should be acknowledged promptly, investigated thoroughly, and outcomes communicated to the complainant. Learning from complaints must inform service improvements and be used to prevent recurrence of problems.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-16',
  },
  '17': {
    code: '17',
    label: 'Regulation 17',
    title: 'Good governance',
    summary: 'Good governance requires systematic oversight of service quality, clear lines of accountability, effective audit and monitoring systems, and continuous improvement activities. Providers should collect and review performance data, act on findings, and ensure leaders use information to maintain and improve standards of care.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-17',
  },
  '18': {
    code: '18',
    label: 'Regulation 18',
    title: 'Staffing',
    summary: 'Providers must ensure staffing levels, skill mix and staff competence are sufficient to meet people’s needs safely and effectively. This includes recruitment checks, induction, ongoing training, supervision, and contingency planning for shortages. Staffing arrangements should be regularly reviewed against changing needs.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-18',
  },
  '19': {
    code: '19',
    label: 'Regulation 19',
    title: 'Fit and proper persons employed',
    summary: 'Employers must follow recruitment and selection processes that ensure employees are suitable and competent to work with people who use services. This includes appropriate pre-employment checks, references, verification of qualifications, and ensuring staff have relevant training for their roles.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-19',
  },
  '20': {
    code: '20',
    label: 'Regulation 20',
    title: 'Duty of candour',
    summary: 'The duty of candour requires providers to be transparent when incidents occur that cause harm or distress. Providers must tell affected people or their families, apologise, explain the likely effects, and provide information about remedial steps. Organisations should have systems to apply candour consistently and learn from incidents.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-20',
  },
  '20A': {
    code: '20A',
    label: 'Regulation 20A',
    title: 'Requirement as to display of performance assessments',
    summary: 'Providers must display their CQC performance ratings where required so people can make informed choices. This includes ensuring ratings are accurate, visible on premises and, where appropriate, provided in digital or printed formats. The requirement promotes transparency and helps people compare services.',
    url: 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-20a',
  },
};

const NORMALISE_MATCH = /[^0-9a-z]/gi;

const normaliseRegulationCode = (value: string) => value.replace(NORMALISE_MATCH, '').toUpperCase();

export const getCqcRegulationDetail = (code: string): CqcRegulationDetail | null => {
  if (!code) return null;
  const normalised = normaliseRegulationCode(code);
  const detail = CQC_REGULATIONS[normalised];
  return detail ?? null;
};

const clipSnippet = (value: string, limit = 240) => {
  if (!value) return value;
  const normalised = value.replace(/\s+/g, ' ').trim();
  if (normalised.length <= limit) return normalised;
  return `${normalised.slice(0, limit - 1)}…`;
};

export const extractCqcRegulationsFromText = (text: string | undefined | null): CqcRegulationMatch[] => {
  if (!text) return [];

  const matches = new Map<string, CqcRegulationMatch>();
  const regex = /Regulation\s+(\d{1,2}[A-Za-z]?)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawCode = match[1];
    const detail = getCqcRegulationDetail(rawCode);
    if (!detail || matches.has(detail.code)) {
      continue;
    }

    const start = Math.max(0, match.index - 120);
    const end = Math.min(text.length, regex.lastIndex + 160);
    const snippet = clipSnippet(text.slice(start, end));

    matches.set(detail.code, {
      ...detail,
      snippet,
    });
  }

  return Array.from(matches.values());
};

export const listCqcRegulations = (): CqcRegulationDetail[] => Object.values(CQC_REGULATIONS);