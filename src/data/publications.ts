import type { Locale } from './types';

export interface Publication {
  year: number;
  /**
   * English: titles in square brackets are translations, titles without
   * brackets are the English titles published with the papers.
   * Russian: the original citation. Keep the author order as published.
   */
  citation: Readonly<Record<Locale, string>>;
  /** Language note shown after the English citation only. */
  note: string;
}

/** Newest first; the pages group entries by year. */
export const publications: readonly Publication[] = [
  {
    year: 2020,
    citation: {
      en: 'Suvorov D. M., Sushchikh V. M., Sodikzoda T. Kh. [Efficiency evaluation of a steam-injected gas turbine with a heat recovery steam generator]. Obshchestvo. Nauka. Innovatsii (NPK-2020), Vyatka State University, Kirov, 2020, pp. 356–360.',
      ru: 'Суворов Д. М., Сущих В. М., Содикзода Т. Х. Оценка КПД ГТУ с энергетическим впрыском пара с использованием котла-утилизатора // Общество. Наука. Инновации (НПК-2020). Киров: ВятГУ, 2020. С. 356–360.',
    },
    note: 'In Russian.',
  },
  {
    year: 2019,
    citation: {
      en: 'Sodikzoda T. Kh., Suvorov D. M., Sushchikh V. M. Efficiency of gas turbines with energy injection of steam using a boiler-utilizer. Energy and Resource Conservation. Power Supply. Unconventional and Renewable Energy Sources. Nuclear Energy (Danilov Readings), Ural Federal University, Yekaterinburg, 2019, pp. 361–364.',
      ru: 'Содикзода Т. Х., Суворов Д. М., Сущих В. М. Эффективность ГТУ с энергетическим впрыском пара с использованием котла-утилизатора // Энерго- и ресурсосбережение. Энергообеспечение. Нетрадиционные и возобновляемые источники энергии. Атомная энергетика (Даниловские чтения). Екатеринбург: УрФУ, 2019. С. 361–364.',
    },
    note: 'In Russian with English abstract.',
  },
  {
    year: 2019,
    citation: {
      en: 'Suvorov D. M., Sushchikh V. M., Sodikzoda T. Kh. [Design model of a gas turbine with energy injection of water vapour]. Obshchestvo. Nauka. Innovatsii (NPK-2019): 19th All-Russian Scientific and Practical Conference, vol. 2, Vyatka State University, Kirov, 2019, pp. 349–354.',
      ru: 'Суворов Д. М., Сущих В. М., Содикзода Т. Х. Расчётная модель ГТУ с энергетическим впрыском водяного пара // Общество. Наука. Инновации (НПК-2019): сб. ст. XIX Всерос. науч.-практ. конф. Т. 2. Киров: ВятГУ, 2019. С. 349–354.',
    },
    note: 'In Russian.',
  },
  {
    year: 2018,
    citation: {
      en: 'Sodikzoda T. Kh., Suvorov D. M. Study of the efficiency of cycles of gas turbine units with energy injection of water vapor. Energy and Resource Conservation. Power Supply. Unconventional and Renewable Energy Sources. Nuclear Energy (Danilov Readings), Yekaterinburg, 10–14 December 2018. Ural Federal University, 2018, pp. 419–422.',
      ru: 'Содикзода Т. Х., Суворов Д. М. Исследование эффективности циклов газотурбинных установок с энергетическим впрыском пара // Энерго- и ресурсосбережение. Энергообеспечение. Нетрадиционные и возобновляемые источники энергии. Атомная энергетика: материалы Междунар. науч.-практ. конф. (Даниловские чтения), Екатеринбург, 10–14 декабря 2018 г. Екатеринбург: УрФУ, 2018. С. 419–422.',
    },
    note: 'In Russian with English abstract.',
  },
];
