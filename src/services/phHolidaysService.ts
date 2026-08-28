import { DayOfWeek } from '../types';

export type HolidayType = 'regular' | 'special_non_working' | 'academic_break' | 'observance';

export interface PHHoliday {
  id: string;
  name: string;
  nameFilipino?: string;
  date: string; // 'YYYY-MM-DD'
  month: number; // 1-12
  day: number; // 1-31
  year: number;
  type: HolidayType;
  typeLabel: string;
  description: string;
  isNoClasses: boolean;
  isLongWeekend: boolean;
  dayOfWeekName: string;
}

// Raw definition for fixed and dynamic holiday dates
interface RawHolidayTemplate {
  name: string;
  nameFilipino?: string;
  month: number;
  day?: number;
  isVariable?: boolean;
  calculateDate?: (year: number) => { month: number; day: number };
  type: HolidayType;
  typeLabel: string;
  description: string;
  isNoClasses: boolean;
}

const HOLIDAY_TEMPLATES: RawHolidayTemplate[] = [
  {
    name: "New Year's Day",
    nameFilipino: 'Araw ng Bagong Taon',
    month: 1,
    day: 1,
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'First day of the Gregorian calendar year. Nationwide regular holiday.',
    isNoClasses: true
  },
  {
    name: 'Chinese Lunar New Year',
    nameFilipino: 'Bagong Taong Tsino',
    month: 1,
    isVariable: true,
    calculateDate: (year: number) => {
      // Known dates for recent/upcoming years
      if (year === 2025) return { month: 1, day: 29 };
      if (year === 2026) return { month: 2, day: 17 };
      if (year === 2027) return { month: 2, day: 6 };
      return { month: 2, day: 10 };
    },
    type: 'special_non_working',
    typeLabel: 'Special Non-Working Day',
    description: 'Spring Festival celebration of the traditional Chinese lunisolar calendar.',
    isNoClasses: true
  },
  {
    name: 'EDSA People Power Revolution Anniversary',
    nameFilipino: 'Anibersaryo ng Rebolusyong EDSA',
    month: 2,
    day: 25,
    type: 'special_non_working',
    typeLabel: 'Special Non-Working Day',
    description: 'Commemoration of the historic 1986 EDSA People Power Revolution.',
    isNoClasses: true
  },
  {
    name: 'Maundy Thursday',
    nameFilipino: 'Huwebes Santo',
    month: 4,
    isVariable: true,
    calculateDate: (year: number) => {
      if (year === 2025) return { month: 4, day: 17 };
      if (year === 2026) return { month: 4, day: 2 };
      if (year === 2027) return { month: 3, day: 25 };
      return { month: 4, day: 2 };
    },
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'Holy Week commemoration of the Last Supper and Washing of the Feet.',
    isNoClasses: true
  },
  {
    name: 'Good Friday',
    nameFilipino: 'Biyernes Santo',
    month: 4,
    isVariable: true,
    calculateDate: (year: number) => {
      if (year === 2025) return { month: 4, day: 18 };
      if (year === 2026) return { month: 4, day: 3 };
      if (year === 2027) return { month: 3, day: 26 };
      return { month: 4, day: 3 };
    },
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'Holy Week solemn observance of the Passion and Crucifixion of Christ.',
    isNoClasses: true
  },
  {
    name: 'Black Saturday',
    nameFilipino: 'Sabado de Gloria',
    month: 4,
    isVariable: true,
    calculateDate: (year: number) => {
      if (year === 2025) return { month: 4, day: 19 };
      if (year === 2026) return { month: 4, day: 4 };
      if (year === 2027) return { month: 3, day: 27 };
      return { month: 4, day: 4 };
    },
    type: 'special_non_working',
    typeLabel: 'Special Non-Working Day',
    description: 'Holy Saturday vigil day following Good Friday.',
    isNoClasses: true
  },
  {
    name: 'Araw ng Kagitingan',
    nameFilipino: 'Day of Valor',
    month: 4,
    day: 9,
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'Honors the heroism of Filipino and American soldiers during the Fall of Bataan.',
    isNoClasses: true
  },
  {
    name: "Eid'l Fitr",
    nameFilipino: 'Wakas ng Ramadan',
    month: 3,
    isVariable: true,
    calculateDate: (year: number) => {
      if (year === 2025) return { month: 3, day: 31 };
      if (year === 2026) return { month: 3, day: 20 };
      if (year === 2027) return { month: 3, day: 10 };
      return { month: 3, day: 20 };
    },
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'Islamic festival marking the conclusion of the holy fasting month of Ramadan.',
    isNoClasses: true
  },
  {
    name: 'Labor Day',
    nameFilipino: 'Araw ng Paggawa',
    month: 5,
    day: 1,
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'National salute to the economic contributions and rights of workers across the Philippines.',
    isNoClasses: true
  },
  {
    name: "Eid'l Adha",
    nameFilipino: 'Araw ng Sakripisyo',
    month: 5,
    isVariable: true,
    calculateDate: (year: number) => {
      if (year === 2025) return { month: 6, day: 6 };
      if (year === 2026) return { month: 5, day: 27 };
      if (year === 2027) return { month: 5, day: 17 };
      return { month: 5, day: 27 };
    },
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'Feast of the Sacrifice commemorating the willingness of Ibrahim to obey God.',
    isNoClasses: true
  },
  {
    name: 'Philippine Independence Day',
    nameFilipino: 'Araw ng Kalayaan',
    month: 6,
    day: 12,
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'Commemorates the Philippine Declaration of Independence from Spain on June 12, 1898 in Kawit, Cavite.',
    isNoClasses: true
  },
  {
    name: 'Ninoy Aquino Day',
    nameFilipino: 'Araw ng Paggunita kay Ninoy Aquino',
    month: 8,
    day: 21,
    type: 'special_non_working',
    typeLabel: 'Special Non-Working Day',
    description: 'Commemorates the assassination of former Senator Benigno "Ninoy" Aquino Jr.',
    isNoClasses: true
  },
  {
    name: 'National Heroes Day',
    nameFilipino: 'Araw ng mga Bayani',
    month: 8,
    isVariable: true,
    calculateDate: (year: number) => {
      // Last Monday of August
      const lastDayOfAug = new Date(year, 7, 31);
      const dayOfWeek = lastDayOfAug.getDay(); // 0 is Sunday, 1 is Monday
      const offset = (dayOfWeek + 7 - 1) % 7;
      const lastMondayDate = 31 - offset;
      return { month: 8, day: lastMondayDate };
    },
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'Celebrates all national heroes who fought for Philippine freedom and sovereignty.',
    isNoClasses: true
  },
  {
    name: "All Saints' Day",
    nameFilipino: 'Undas / Todos los Santos',
    month: 11,
    day: 1,
    type: 'special_non_working',
    typeLabel: 'Special Non-Working Day',
    description: 'Solemnity honoring all Christian saints and martyrs. Traditional family cemetery visit.',
    isNoClasses: true
  },
  {
    name: "All Souls' Day",
    nameFilipino: 'Araw ng mga Patay',
    month: 11,
    day: 2,
    type: 'special_non_working',
    typeLabel: 'Special Working / Non-Working Day',
    description: 'Commemoration of all the faithful departed.',
    isNoClasses: true
  },
  {
    name: 'Bonifacio Day',
    nameFilipino: 'Araw ni Bonifacio',
    month: 11,
    day: 30,
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'Honors the birth of Andres Bonifacio, the Supreme Leader of the Katipunan.',
    isNoClasses: true
  },
  {
    name: 'Feast of the Immaculate Conception',
    nameFilipino: 'Pista ng Kalinis-linisang Paglilihi',
    month: 12,
    day: 8,
    type: 'special_non_working',
    typeLabel: 'Special Non-Working Day',
    description: 'Feast of Mary, the Principal Patroness of the Philippines.',
    isNoClasses: true
  },
  {
    name: 'Christmas Eve',
    nameFilipino: 'Bisperas ng Pasko',
    month: 12,
    day: 24,
    type: 'special_non_working',
    typeLabel: 'Special Non-Working Day',
    description: 'Traditional Noche Buena family celebration evening before Christmas.',
    isNoClasses: true
  },
  {
    name: 'Christmas Day',
    nameFilipino: 'Araw ng Pasko',
    month: 12,
    day: 25,
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'Celebration of the Nativity of Jesus Christ. Heart of the Filipino holiday season.',
    isNoClasses: true
  },
  {
    name: 'Rizal Day',
    nameFilipino: 'Araw ng Kabayanihan ni Dr. Jose Rizal',
    month: 12,
    day: 30,
    type: 'regular',
    typeLabel: 'Regular Holiday',
    description: 'Commemorates the life and execution of national hero Dr. Jose Rizal at Bagumbayan.',
    isNoClasses: true
  },
  {
    name: "New Year's Eve / Last Day of the Year",
    nameFilipino: 'Bisperas ng Bagong Taon',
    month: 12,
    day: 31,
    type: 'special_non_working',
    typeLabel: 'Special Non-Working Day',
    description: 'Final day of the calendar year and Media Noche celebrations.',
    isNoClasses: true
  }
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Returns full list of Philippine holidays for a given year
 */
export function getPHHolidaysForYear(year: number): PHHoliday[] {
  return HOLIDAY_TEMPLATES.map((tmpl, idx) => {
    let month = tmpl.month;
    let day = tmpl.day || 1;

    if (tmpl.isVariable && tmpl.calculateDate) {
      const calculated = tmpl.calculateDate(year);
      month = calculated.month;
      day = calculated.day;
    }

    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const dayOfWeekName = DAY_NAMES[dayOfWeek];

    // Long Weekend if falls on Friday (5) or Monday (1)
    const isLongWeekend = dayOfWeek === 1 || dayOfWeek === 5 || tmpl.name === 'Maundy Thursday' || tmpl.name === 'Good Friday';

    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    return {
      id: `ph_holiday_${year}_${idx}`,
      name: tmpl.name,
      nameFilipino: tmpl.nameFilipino,
      date: dateStr,
      month,
      day,
      year,
      type: tmpl.type,
      typeLabel: tmpl.typeLabel,
      description: tmpl.description,
      isNoClasses: tmpl.isNoClasses,
      isLongWeekend,
      dayOfWeekName
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Get holiday for a specific date (Date object or 'YYYY-MM-DD' string)
 */
export function getHolidayForDate(dateInput: Date | string): PHHoliday | null {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  const holidays = getPHHolidaysForYear(year);
  return holidays.find(h => h.month === month && h.day === day) || null;
}

/**
 * Check if today is a Philippine holiday
 */
export function getTodayHoliday(refDate = new Date()): PHHoliday | null {
  return getHolidayForDate(refDate);
}

/**
 * Get holiday for a day of week in the current week
 */
export function getHolidayForDayInCurrentWeek(dayName: DayOfWeek, refDate = new Date()): PHHoliday | null {
  const currentDayIndex = refDate.getDay(); // 0 is Sun, 1 is Mon, etc.
  const targetDayMap: Record<DayOfWeek, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  const targetIndex = targetDayMap[dayName];
  if (targetIndex === undefined) return null;

  const diffDays = targetIndex - currentDayIndex;
  const targetDate = new Date(refDate);
  targetDate.setDate(refDate.getDate() + diffDays);

  return getHolidayForDate(targetDate);
}

/**
 * Returns upcoming holidays with countdown information
 */
export function getUpcomingHolidays(refDate = new Date(), limit = 20): Array<
  PHHoliday & {
    daysUntil: number;
    isToday: boolean;
    formattedDate: string;
    countdownText: string;
  }
> {
  const currentYear = refDate.getFullYear();
  const holidaysThisYear = getPHHolidaysForYear(currentYear);
  const holidaysNextYear = getPHHolidaysForYear(currentYear + 1);
  const allHolidays = [...holidaysThisYear, ...holidaysNextYear];

  const todayMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();

  return allHolidays
    .map(h => {
      const hDate = new Date(h.year, h.month - 1, h.day).getTime();
      const diffTime = hDate - todayMidnight;
      const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const isToday = daysUntil === 0;

      let countdownText = '';
      if (isToday) countdownText = 'Today 🎉';
      else if (daysUntil === 1) countdownText = 'Tomorrow';
      else if (daysUntil > 1 && daysUntil <= 7) countdownText = `In ${daysUntil} days`;
      else if (daysUntil > 7 && daysUntil <= 30) countdownText = `In ${Math.ceil(daysUntil / 7)} weeks`;
      else countdownText = `In ${Math.ceil(daysUntil / 30)} months`;

      const formattedDate = new Date(h.year, h.month - 1, h.day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      });

      return {
        ...h,
        daysUntil,
        isToday,
        formattedDate,
        countdownText
      };
    })
    .filter(h => h.daysUntil >= 0)
    .slice(0, limit);
}
