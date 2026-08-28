import React from 'react';
import {
  Code2,
  Terminal,
  Cpu,
  Database,
  Globe,
  ShieldCheck,
  Atom,
  FlaskConical,
  Dna,
  Microscope,
  HeartPulse,
  Calculator,
  Compass,
  Ruler,
  Wrench,
  Zap,
  Briefcase,
  TrendingUp,
  Receipt,
  Scale,
  Users,
  Palette,
  Music,
  BookOpen,
  Languages,
  Scroll,
  Activity,
  Trophy,
  Leaf,
  GraduationCap,
  Sparkles,
  Camera,
  Film,
  Stethoscope,
  Building,
  BrainCircuit,
  LucideIcon
} from 'lucide-react';

export interface SubjectIconDef {
  id: string;
  name: string;
  category: 'tech' | 'science' | 'math_eng' | 'business' | 'humanities' | 'general';
  icon: LucideIcon;
  keywords: string[];
}

export const ICON_CATEGORIES = [
  { id: 'all', label: 'All Icons' },
  { id: 'tech', label: '💻 Tech & CS' },
  { id: 'science', label: '🔬 Sciences & Med' },
  { id: 'math_eng', label: '📐 Math & Eng' },
  { id: 'business', label: '💼 Business & Law' },
  { id: 'humanities', label: '🎨 Arts & Languages' },
  { id: 'general', label: '🏃 General & PE' },
] as const;

export const SUBJECT_ICONS: SubjectIconDef[] = [
  // Technology & CS
  { id: 'code', name: 'Programming', category: 'tech', icon: Code2, keywords: ['cs', 'it', 'programming', 'code', 'software', 'oop', 'dsa', 'data structures', 'algorithm', 'python', 'java', 'cpp'] },
  { id: 'terminal', name: 'Terminal / SysAdmin', category: 'tech', icon: Terminal, keywords: ['os', 'operating systems', 'linux', 'unix', 'cli', 'bash', 'admin'] },
  { id: 'cpu', name: 'Computer Architecture', category: 'tech', icon: Cpu, keywords: ['cpe', 'hardware', 'processor', 'circuits', 'logic', 'microcontroller', 'embedded'] },
  { id: 'database', name: 'Databases & SQL', category: 'tech', icon: Database, keywords: ['db', 'database', 'sql', 'rdbms', 'data management', 'oracle', 'nosql'] },
  { id: 'globe', name: 'Web & Networks', category: 'tech', icon: Globe, keywords: ['web', 'network', 'telecom', 'internet', 'routing', 'cisco', 'cloud'] },
  { id: 'cybersecurity', name: 'Cybersecurity & Ethics', category: 'tech', icon: ShieldCheck, keywords: ['security', 'cyber', 'ethics', 'infosec', 'privacy', 'cryptography'] },
  { id: 'ai', name: 'Artificial Intelligence', category: 'tech', icon: BrainCircuit, keywords: ['ai', 'machine learning', 'data science', 'neural', 'robotics'] },

  // Sciences & Medicine
  { id: 'chemistry', name: 'Chemistry & Lab', category: 'science', icon: FlaskConical, keywords: ['chem', 'chemistry', 'biochem', 'organic', 'analytical', 'lab', 'laboratory'] },
  { id: 'physics', name: 'Physics', category: 'science', icon: Atom, keywords: ['phys', 'physics', 'mechanics', 'thermodynamics', 'optics', 'electromagnetism', 'quantum'] },
  { id: 'biology', name: 'Biology & Genetics', category: 'science', icon: Dna, keywords: ['bio', 'biology', 'genetics', 'botany', 'zoology', 'evolution', 'anatomy'] },
  { id: 'microscope', name: 'Microbiology & Research', category: 'science', icon: Microscope, keywords: ['micro', 'microbio', 'pathology', 'histology', 'research', 'thesis'] },
  { id: 'nursing', name: 'Nursing & Health', category: 'science', icon: HeartPulse, keywords: ['nurse', 'nursing', 'health', 'care', 'first aid', 'clinical', 'pharmacy', 'patient'] },
  { id: 'medicine', name: 'Medicine & Diagnostics', category: 'science', icon: Stethoscope, keywords: ['med', 'medicine', 'physician', 'doctor', 'physiology', 'pharmacology'] },

  // Mathematics & Engineering
  { id: 'calculator', name: 'Mathematics & Stats', category: 'math_eng', icon: Calculator, keywords: ['math', 'mathematics', 'calc', 'calculus', 'stat', 'statistics', 'algebra', 'trigo', 'geometry', 'differential'] },
  { id: 'compass', name: 'Engineering Drawing', category: 'math_eng', icon: Compass, keywords: ['drawing', 'cad', 'autocad', 'drafting', 'architecture', 'design'] },
  { id: 'ruler', name: 'Civil & Surveying', category: 'math_eng', icon: Ruler, keywords: ['civil', 'surveying', 'structural', 'construction', 'materials', 'geotech'] },
  { id: 'wrench', name: 'Mechanical & Tools', category: 'math_eng', icon: Wrench, keywords: ['mech', 'mechanical', 'machines', 'thermo', 'fluids', 'tool'] },
  { id: 'electricity', name: 'Electrical & Power', category: 'math_eng', icon: Zap, keywords: ['ee', 'electrical', 'power', 'circuits', 'energy', 'electronics'] },
  { id: 'building', name: 'Architecture & Urban', category: 'math_eng', icon: Building, keywords: ['archi', 'architecture', 'building', 'planning', 'urban', 'structure'] },

  // Business, Law & Social Sciences
  { id: 'briefcase', name: 'Business Administration', category: 'business', icon: Briefcase, keywords: ['ba', 'business', 'mgmt', 'management', 'admin', 'marketing', 'hr', 'entrepreneurship'] },
  { id: 'finance', name: 'Economics & Finance', category: 'business', icon: TrendingUp, keywords: ['econ', 'economics', 'finance', 'investment', 'microecon', 'macroecon', 'banking'] },
  { id: 'accounting', name: 'Accounting & Auditing', category: 'business', icon: Receipt, keywords: ['acc', 'accounting', 'audit', 'tax', 'taxation', 'cost', 'ledger', 'cpa'] },
  { id: 'law', name: 'Law & Governance', category: 'business', icon: Scale, keywords: ['law', 'polsci', 'political', 'constitution', 'governance', 'justice', 'criminology', 'legal'] },
  { id: 'social', name: 'Social Sciences & Psych', category: 'business', icon: Users, keywords: ['soc', 'sociology', 'psych', 'psychology', 'counseling', 'behavior', 'anthropology'] },

  // Humanities, Arts & Languages
  { id: 'literature', name: 'Literature & Reading', category: 'humanities', icon: BookOpen, keywords: ['lit', 'literature', 'reading', 'english', 'writing', 'essay', 'composition'] },
  { id: 'languages', name: 'Foreign Languages & Filipino', category: 'humanities', icon: Languages, keywords: ['fil', 'filipino', 'foreign', 'spanish', 'japanese', 'mandarin', 'linguistics'] },
  { id: 'arts', name: 'Fine Arts & Multimedia', category: 'humanities', icon: Palette, keywords: ['art', 'arts', 'multimedia', 'fine arts', 'graphics', 'drawing', 'painting', 'animation'] },
  { id: 'music', name: 'Music & Performing Arts', category: 'humanities', icon: Music, keywords: ['music', 'choral', 'sound', 'audio', 'instrument', 'band', 'choir'] },
  { id: 'history', name: 'History & Philosophy', category: 'humanities', icon: Scroll, keywords: ['hist', 'history', 'phil', 'philosophy', 'rizal', 'culture', 'heritage'] },
  { id: 'media', name: 'Broadcasting & Film', category: 'humanities', icon: Film, keywords: ['comm', 'communication', 'journalism', 'broadcasting', 'film', 'media', 'radio', 'tv'] },
  { id: 'photography', name: 'Photography', category: 'humanities', icon: Camera, keywords: ['photo', 'photography', 'visual', 'camera', 'studio'] },

  // General, PE & Campus Life
  { id: 'pe', name: 'Physical Education / Sports', category: 'general', icon: Activity, keywords: ['pe', 'pathfit', 'sports', 'fitness', 'gym', 'wellness', 'swimming', 'basketball'] },
  { id: 'trophy', name: 'Varsity & Competitions', category: 'general', icon: Trophy, keywords: ['varsity', 'competition', 'athletics', 'tournament', 'championship'] },
  { id: 'agriculture', name: 'Agriculture & Forestry', category: 'general', icon: Leaf, keywords: ['agri', 'agriculture', 'forestry', 'crops', 'farming', 'environmental', 'ecology'] },
  { id: 'graduation', name: 'General Academics / Capstone', category: 'general', icon: GraduationCap, keywords: ['nstp', 'cwts', 'rotc', 'capstone', 'practicum', 'internship', 'seminar'] },
  { id: 'sparkles', name: 'Elective & Special Topics', category: 'general', icon: Sparkles, keywords: ['elective', 'special', 'free', 'general', 'orientation'] },
];

/**
 * Automatically detects the most relevant icon for a course based on its code and title
 */
export function detectSubjectIcon(code: string = '', name: string = ''): string {
  const query = `${code || ''} ${name || ''}`.toLowerCase().trim();
  if (!query) return 'graduation';

  // Exact keyword match search across icon library safely without regex quantifier errors
  for (const def of SUBJECT_ICONS) {
    for (const kw of def.keywords) {
      const cleanKw = kw.toLowerCase().trim();
      if (cleanKw && query.includes(cleanKw)) {
        return def.id;
      }
    }
  }

  // Fallback default
  return 'graduation';
}

/**
 * Returns the Lucide Icon React element for a given iconId, or auto-detects from course code/title
 */
export function getSubjectIconComponent(
  iconId?: string,
  courseCode: string = '',
  courseName: string = '',
  size: number = 18,
  color: string = '#FFFFFF'
): React.ReactElement {
  try {
    const resolvedId = iconId || detectSubjectIcon(courseCode, courseName);
    const found = SUBJECT_ICONS.find((item) => item.id === resolvedId);
    const IconComponent = found ? found.icon : GraduationCap;
    return <IconComponent size={size} color={color} />;
  } catch (err) {
    console.error('Error rendering subject icon:', err);
    return <GraduationCap size={size} color={color} />;
  }
}
