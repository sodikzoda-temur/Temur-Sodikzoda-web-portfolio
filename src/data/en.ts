import { SHOW_AVAILABILITY } from './shared';
import type { Profile } from './types';

export default {
  meta: {
    home: {
      title: 'Temur Sodikzoda · Sanitation engineer',
      description:
        'Sanitation engineer with a background in thermal power engineering. I coordinate applied research on wastewater, faecal sludge and water quality in Central Asia.',
    },
    cv: {
      title: 'CV · Temur Sodikzoda',
      description:
        'Curriculum vitae of Temur Sodikzoda, sanitation engineer with a background in thermal power engineering, based in Khujand, Tajikistan.',
    },
  },

  ui: {
    skipLink: 'Skip to content',
    navLabel: 'Main',
    menu: 'Menu',
    themeToggle: 'Dark theme',
    languageLabel: 'Language',
    researchInterest: 'Research interest',
    portraitAlt: 'Temur Sodikzoda',
  },

  nav: {
    focus: 'Focus',
    work: 'Work',
    publications: 'Publications',
    experience: 'Experience',
    contact: 'Contact',
  },

  sections: {
    about: 'About',
    focus: 'Research focus',
    work: 'Selected work',
    publications: 'Publications',
    experience: 'Experience',
    education: 'Education and training',
    affiliations: 'Affiliations and events',
    skills: 'Languages and tools',
    contact: 'Contact',
  },

  hero: {
    name: 'Temur Sodikzoda',
    lines: [
      'Sanitation engineer with a background in thermal power engineering.',
      'I coordinate applied research on wastewater, faecal sludge and water quality in Central Asia.',
    ],
    location: 'Khujand, Tajikistan',
    links: { research: 'Research', cv: 'CV' },
  },

  about: [
    'I work at the International Secretariat for Water (ISW), where I lead the scientific component of CoWaSS, a water and sanitation project funded by the Swiss Agency for Development and Cooperation (SDC) and implemented by a consortium that includes ISW and Helvetas, with FHNW as a key academic partner. My work is about building the evidence base for sanitation where little data exists: university wastewater laboratories, monitoring of decentralised treatment systems and applied research on faecal sludge. I trained as a heat and power engineer, and I am most interested in where the two fields meet: energy and resource recovery from wastewater and sludge.',
  ],

  focus: {
    sludge: {
      title: 'Faecal sludge management',
      text: 'Characterisation, dewatering and treatment of faecal sludge where laboratory capacity is limited; co-composting as a route to safe reuse.',
    },
    decentralised: {
      title: 'Decentralised treatment and monitoring',
      text: 'Performance of DEWATS and constructed wetlands; laboratory methods and compliance assessment against Tajik, EU and WHO references.',
    },
    recovery: {
      title: 'Energy and resource recovery',
      text: 'Where thermal engineering meets sanitation, including thermal treatment of sludge and recovery of low-grade heat in water and wastewater infrastructure.',
      interest: true,
    },
  },

  work: {
    cowass: {
      title: 'CoWaSS research component',
      org: 'ISW',
      period: '2022 to present',
      funding: 'SDC-funded',
      partners: 'Partners: Helvetas, FHNW, University of Trento, BORDA Tajikistan',
      points: [
        'Coordinated the research component of Phase 1 (the phase ran from 2021 to February 2026; my role from October 2022) across four pillars: laboratory infrastructure and accreditation, international academic collaboration, DEWATS monitoring and evaluation, knowledge exchange.',
        'Wrote the Phase 1 research component final report.',
        'Lead the scientific component and university partnerships today.',
      ],
    },
    laboratories: {
      title: 'University wastewater analysis laboratories',
      org: 'Khujand State University (KSU) and the Mining and Metallurgical Institute of Tajikistan (MMIT)',
      period: '2022 to present',
      points: [
        'Set up wastewater analysis laboratories at two universities, the first of their kind in Tajikistan.',
        'Bilingual (English and Russian) laboratory protocols, including photometric methods for ammonium, nitrite and phosphate.',
        'Laboratory and wastewater analytics training with FHNW specialists (2023).',
      ],
    },
    wetland: {
      title: 'Constructed wetland monitoring, Dehmoy Hospital',
      points: [
        'Monitoring programme run with two partner university laboratories.',
        'Built a spreadsheet-based reporting tool that generates bilingual compliance conclusions against Tajik, EU and WHO standards.',
      ],
    },
    sludge: {
      title: 'Faecal sludge and co-composting',
      points: [
        'Co-composting pilot for faecal sludge.',
        'Faecal sludge field laboratory training by Swiss Humanitarian Aid specialists (2023).',
        'Support to MSc and BSc thesis research by students from FHNW and the University of Trento.',
      ],
    },
    standards: {
      title: 'National drinking water quality standards',
      points: [
        'Contributed to the revision of Tajikistan’s national drinking water quality standards, aligning them with WHO guidelines.',
      ],
    },
    turbines: {
      title: 'Steam-injected gas turbines',
      org: 'Vyatka State University',
      period: '2018 to 2021',
      points: [
        'Mathematical modelling and efficiency analysis of steam-injected gas turbine (STIG) cycles with heat recovery steam generators, including condensing designs.',
        'Four conference papers (see Publications).',
      ],
    },
  },

  publications: {
    closing: 'Manuscripts on wastewater monitoring and faecal sludge are in preparation.',
  },

  experience: {
    isw: {
      period: 'Oct 2022 to present',
      role: 'Research and Project Coordinator',
      org: 'International Secretariat for Water (ISW)',
      place: 'Khujand, Tajikistan',
      summary:
        'Scientific component of CoWaSS, university partnerships, laboratory development, monitoring and donor reporting.',
    },
    kirovvodproekt: {
      period: 'Mar 2021 to Oct 2022',
      role: 'Design Engineer',
      org: 'Kirovvodproekt',
      place: 'Kirov, Russia',
      summary:
        'Water supply and sewerage, heat and steam supply networks, external gas supply; site supervision.',
    },
    chpp4: {
      period: 'Jan 2021 to Apr 2021',
      role: 'Trainee',
      org: 'Kirov CHPP-4 (T Plus)',
      place: 'Kirov, Russia',
    },
    vyatproektservice: {
      period: 'Sep 2019 to Mar 2021',
      role: 'Design Engineer',
      org: 'Vyatproektservice',
      place: 'Kirov, Russia',
      summary:
        'Thermal-mechanical design of boiler houses, heating networks, heating and ventilation, water supply and sewerage, gas supply; site supervision.',
    },
  },

  education: {
    degreesLabel: 'Degrees',
    degrees: {
      msc: {
        degree: 'MSc with honours',
        field: 'Thermal Power and Heat Engineering',
        institution: 'Vyatka State University',
        place: 'Kirov, Russia',
        period: '2019 to 2021',
        details: [
          'Major: Technology of Heat and Electric Power Generation at Power Plants',
          'Thesis: Study of a steam-injected gas turbine unit with a heat recovery steam generator based on mathematical modelling (grade: excellent)',
        ],
      },
      bsc: {
        degree: 'BSc',
        field: 'Thermal Power and Heat Engineering',
        institution: 'Vyatka State University',
        place: 'Kirov, Russia',
        period: '2015 to 2019',
        details: [
          'Major: Industrial Thermal Power Engineering',
          'Thesis: Research and optimisation of the cycle of a steam-injected gas turbine plant (grade: excellent)',
          'Russian Government Scholarship',
        ],
      },
    },
    trainingLabel: 'Training',
    training: {
      tsinghua: {
        year: '2024',
        title: 'Water and Wastewater Treatment Engineering: Biochemical Technology',
        provider: 'Tsinghua University, Coursera',
      },
      mitx: {
        year: '2024',
        title: '7.00x Introduction to Biology: The Secret of Life',
        provider: 'MITx, verified certificate',
      },
      borda: {
        year: '2024',
        title: 'Workshop on decentralised sanitation planning and management',
        provider: 'BORDA',
        place: 'Dushanbe',
      },
      fhnw: {
        year: '2023',
        title: 'Laboratory and wastewater analytics training',
        provider: 'FHNW',
        place: 'Tajikistan',
      },
      sha: {
        year: '2023',
        title: 'Faecal sludge field laboratory training',
        provider: 'Swiss Humanitarian Aid',
        place: 'Tajikistan',
      },
    },
  },

  affiliations: {
    membershipsLabel: 'Member since 2022',
    memberships: {
      wypw: 'World Youth Parliament for Water (WYPW)',
      cay4w: 'Central Asia Youth for Water Network (CAY4W)',
      cop4wash: 'Cooperation of Practices for WASH (CoP4WASH)',
    },
    eventsLabel: 'Events',
    events: {
      wwf9: '9th World Water Forum, Dakar (2022)',
      wwf10: '10th World Water Forum, Bali (2024)',
      dushanbe:
        'Dushanbe Water Process: 3rd High-Level International Conference on the International Decade for Action “Water for Sustainable Development” (2024)',
    },
  },

  skills: {
    languagesLabel: 'Languages',
    languages: {
      tajik: { name: 'Tajik', level: 'native' },
      russian: { name: 'Russian', level: 'native' },
      english: { name: 'English', level: 'professional working proficiency' },
      german: { name: 'German', level: 'basic' },
    },
    toolsLabel: 'Tools',
    tools: {
      python: 'Python',
      gis: 'GIS',
      epanet: 'EPANET',
      autocad: 'AutoCAD',
      civil3d: 'Civil 3D',
      kobo: 'KoboToolbox',
    },
  },

  contact: {
    showAvailability: SHOW_AVAILABILITY,
    availability:
      'Open to doctoral research in Switzerland from 2027 in sanitation engineering and energy and resource recovery from wastewater.',
    emailLabel: 'Email',
    emailAt: 'at',
    profilesLabel: 'Profiles',
  },

  cv: {
    heading: 'Curriculum vitae',
    profile: 'Profile',
    download: 'Download PDF',
    references: 'References available on request.',
  },

  notFound: {
    title: 'Page not found',
    text: 'This page does not exist or has moved.',
    homeLink: 'Go to the home page',
  },

  footer: {
    copyright: 'Temur Sodikzoda',
  },
} as const satisfies Profile;
